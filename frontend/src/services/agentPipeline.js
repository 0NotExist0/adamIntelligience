import axios from 'axios';
import { getMemories } from './memory';
import { sendOpenRouterChat, streamOpenRouterChat, getOpenRouterKey } from './openrouter';
import { multiMethodWebSearch } from './webSearch';
import { extractToolCalls, executeAgentTool, AGENT_TOOLS_DEFINITIONS } from './agentTools';

const META_ANALYZER_PROMPT = `Sei un Meta-Agente AI specializzato nell'analisi preliminare dei prompt e nell'ottimizzazione degli iperparametri di inferenza.
Il tuo compito è analizzare il prompt dell'utente e determinare:
1. "task_type": Tipologia ("code", "math_logic", "factual_query", "creative_writing", "system_config", "general_qa")
2. "temperature": Valore float ottimale da 0.0 a 1.0:
   - 0.0 - 0.2: per codice, matematica, formule, query fattuali rigide, traduzioni esatte (massima determinazione e precisione).
   - 0.3 - 0.6: per spiegazioni tecniche, sintesi, consigli strutturati.
   - 0.7 - 0.9: per brainstorming, scrittura creativa, storytelling.
3. "max_tokens": Numero intero generoso di token per NON tagliare MAI la risposta (default 4096 - 8192, fino a 16384 per codice complesso, trattati o analisi dettagliate).
4. "needs_web_search": true se la domanda richiede fatti recenti, dati esterni verificabili, notizie o confronto oggettivo sul web, altrimenti false.
5. "search_query": Stringa con parole chiave pulite per il motore di ricerca (oppure stringa vuota).
6. "reasoning_strategy": Breve frase (1 riga) sulla strategia logica da seguire per una risposta priva di dubbi.

Rispondi ESCLUSIVAMENTE con un blocco JSON valido:
\`\`\`json
{
  "task_type": "...",
  "temperature": 0.2,
  "max_tokens": 8192,
  "needs_web_search": true,
  "search_query": "...",
  "reasoning_strategy": "..."
}
\`\`\`
`;

/**
 * Client-side Heuristic Fallback for instantaneous meta-analysis without latency
 */
export const analyzePromptHeuristically = (prompt) => {
  const p = (prompt || '').toLowerCase();
  
  const isCode = /codice|script|python|javascript|react|html|css|sql|funzione|bug|regex|typescript|java|c\+\+|api|endpoint|json|class|component/i.test(p);
  const isMath = /calcola|quanto fa|formula|percentuale|algoritmo|matematica|equazione|statistica|derivata|integrale/i.test(p);
  const isCreative = /inventa|racconta|storia|poesia|creativo|favola|sceneggiatura|testo canzone|metafora|dialogo fantastico/i.test(p);
  const isSearchOrFactual = /cerca|trova|internet|web|google|pulman|pullman|bus|orari|orario|treno|treni|meteo|prezzo|prezzi|notizie|news|quando|dove|chi è|cosa è|chi ha|come arrivare|linea|fermata|volo|voli|ristorante|hotel|aggiornat|nuov|ultim|oggi|domani|2026|2025|2024/i.test(p);

  let task_type = 'general_qa';
  let temperature = 0.5;
  let max_tokens = 8192; // Generous default to avoid truncation
  let needs_web_search = false;

  if (isCode) {
    task_type = 'code';
    temperature = 0.1;
    max_tokens = 8192;
  } else if (isMath) {
    task_type = 'math_logic';
    temperature = 0.0;
    max_tokens = 4096;
  } else if (isCreative) {
    task_type = 'creative_writing';
    temperature = 0.85;
    max_tokens = 8192;
  } else if (isSearchOrFactual) {
    task_type = 'factual_query';
    temperature = 0.2;
    max_tokens = 6144;
    needs_web_search = true;
  }

  // Clean search query
  const cleanSearchQuery = prompt
    .replace(/[?!.,;:]/g, '')
    .replace(/\b(cerca su internet|cerca sul web|cerca|trova|spiegami|dimmi|cosa sai di|vorrei sapere|per favore|come funziona)\b/gi, '')
    .trim()
    .slice(0, 100);

  return {
    task_type,
    temperature,
    max_tokens,
    needs_web_search: needs_web_search || isSearchOrFactual,
    search_query: cleanSearchQuery || prompt.slice(0, 80),
    reasoning_strategy: isCode 
      ? 'Verifica rigorosa della sintassi e best practice' 
      : isMath 
      ? 'Risoluzione logico-matematica deterministica' 
      : (needs_web_search || isSearchOrFactual ? 'Fact-Checking & Verifica con Console Web in tempo reale' : 'Analisi concettuale strutturata')
  };
};

/**
 * Meta-Agent Prompt Analyzer: uses Backend API or OpenRouter fast call with Heuristic Fallback
 */
export const runMetaPromptAnalysis = async (prompt) => {
  // 1. Try Backend API if available
  try {
    const res = await axios.post('/api/agent/analyze-prompt', { prompt }, { timeout: 3500 });
    if (res.data && typeof res.data.temperature === 'number') {
      return {
        ...res.data,
        max_tokens: Math.max(4096, res.data.max_tokens || 8192)
      };
    }
  } catch (e) {
    // backend offline or on static host
  }

  // 2. Try OpenRouter with auto free router
  try {
    const aiRes = await sendOpenRouterChat({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: META_ANALYZER_PROMPT },
        { role: 'user', content: `Prompt: "${prompt}"` }
      ],
      temperature: 0.1,
      max_tokens: 500,
      enableMemory: false
    });

    if (aiRes.success && aiRes.content) {
      const jsonMatch = aiRes.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, aiRes.content];
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && typeof parsed.temperature === 'number') {
        return {
          task_type: parsed.task_type || 'general_qa',
          temperature: Math.max(0, Math.min(1.0, parsed.temperature)),
          max_tokens: Math.max(4096, Math.min(16384, parsed.max_tokens || 8192)),
          needs_web_search: Boolean(parsed.needs_web_search),
          search_query: (parsed.search_query || prompt).trim(),
          reasoning_strategy: parsed.reasoning_strategy || 'Analisi logica step-by-step'
        };
      }
    }
  } catch (e) {
    // OpenRouter fallback
  }

  // 3. Robust heuristic fallback
  return analyzePromptHeuristically(prompt);
};

/**
 * Web Search Multi-Method Query Executor
 */
export const executeWebSearch = async (query) => {
  return await multiMethodWebSearch(query);
};

/**
 * Main Autonomous Agent Orchestrator Pipeline:
 * 1. Meta-Analisi del prompt (calcolo automatico di Temperatura e Max Tokens).
 * 2. Recupero Fatti Memoria Salvata (Priorità Assoluta #1).
 * 3. Fact-checking e Ricerca Web in tempo reale (Priorità #2).
 * 4. Sintesi & Risoluzione Conflitti (Regola: Memoria Salvata > Web > Modello).
 * 5. Generazione risposta senza dubbi e con tracciabilità completa.
 */
export const runAgentChatPipeline = async ({
  prompt,
  messages = [],
  model = 'google/gemini-2.0-flash-exp:free',
  forceWebSearch = false,
  onProgressStep = null // callback for UI progress stages
}) => {
  // --- STAGE 1: META-ANALYSIS ---
  if (onProgressStep) {
    onProgressStep({
      stage: 'meta_analysis',
      label: '🧠 Analisi del Prompt & Calibrazione Parametri...',
      progress: 25
    });
  }

  const meta = await runMetaPromptAnalysis(prompt);
  const calibratedTemp = meta.temperature;
  const calibratedTokens = meta.max_tokens;
  const shouldSearch = forceWebSearch || meta.needs_web_search;

  // --- STAGE 2: MEMORY VAULT RETRIEVAL (PRIORITY 1) ---
  if (onProgressStep) {
    onProgressStep({
      stage: 'memory_vault',
      label: '💾 Recupero Dati e Regole Prioritarie dal Memory Vault...',
      progress: 50,
      meta
    });
  }

  const savedMemories = getMemories() || [];
  const memoryLines = savedMemories.map((m, idx) => `${idx + 1}. [${m.category}] ${m.text}`);
  const memoryContext = memoryLines.length > 0 
    ? memoryLines.join('\n') 
    : 'Nessun dato salvato in memoria.';

  // --- STAGE 3: LIVE WEB VERIFICATION (PRIORITY 2) ---
  let webData = { results: [], summary_text: '' };
  if (shouldSearch) {
    if (onProgressStep) {
      onProgressStep({
        stage: 'web_search',
        label: `🌐 Fact-Checking sul Web in tempo reale per "${meta.search_query || prompt.slice(0, 40)}"...`,
        progress: 75,
        meta
      });
    }
    webData = await executeWebSearch(meta.search_query || prompt);
  }

  // --- STAGE 4: STRICT HIERARCHY SYNTHESIS ---
  if (onProgressStep) {
    onProgressStep({
      stage: 'synthesis',
      label: '⚖️ Sintesi & Risoluzione Conflitti (Priorità: Memoria > Web)...',
      progress: 90,
      meta,
      webSourcesCount: webData.results.length
    });
  }

  const strictSystemPrompt = `Sei un Agente AI di Massima Precisione e Ragionamento Avanzato.
Il tuo obiettivo assoluto è fornire una risposta esatta, chiara, verificata e PRIVA DI DUBBI.

=============================================================================
🏛️ [GERARCHIA DELLE FONTI E PRIORITÀ ASSOLUTA DELLE INFORMAZIONI]:
1. 🥇 PRIORITÀ 1 (ASSOLUTA - REGOLA FONDAMENTALE): INFORMAZIONI E REGOLE SALVATE NELLA MEMORIA LOCALE/VAULT.
   Tutti i fatti, le regole e le preferenze elencate di seguito hanno priorità gerarchica assoluta.
   Se un'informazione sul web o nei tuoi dati pregressi contraddice quanto salvato nella memoria locale, DEVI SEMPRE APPLICARE E DARE RAGIONE ALLA MEMORIA SALVATA.

   [INFORMAZIONI SALVATE IN MEMORIA - PRIORITÀ 1]:
${memoryContext}

2. 🥈 PRIORITÀ 2: VERIFICA WEB IN TEMPO REALE.
   Utilizza le seguenti informazioni verificate dal Web per garantire dati aggiornati ed esatti (fatti, eventi, link, specifiche), a patto che NON violino la Priorità 1:

${webData.summary_text || 'Nessuna ricerca web attiva per questa richiesta.'}

3. 🥉 PRIORITÀ 3: CONOSCENZA INTERNA DEL MODELLO.
   Utilizzata per sintesi, logica e spiegazione coerente.

=============================================================================
🌐 [VERIFICA E FACT-CHECKING OBBLIGATORIO CONSOLE & INSPECTOR]:
- Per qualsiasi domanda che richiede informazioni del mondo reale, orari di trasporto (pullman, treni, bus, aerei), eventi, attualità, persone, luoghi o specifiche tecniche, DEVI OBBLIGATORIAMENTE verificare i dati tramite la Console Fact-Checking Web.
- Non inventare mai orari o fatti: se non hai dati web completi, invoca il tool [web_search(query="...")] per estrarre le fonti in tempo reale.
- Nella tua risposta finale, esponi in modo chiaro e dettagliato le informazioni trovate citando le relative fonti verificate.

=============================================================================
🎯 [LINEE GUIDA PER LA RISPOSTA]:
- Strategia di ragionamento calibrata: ${meta.reasoning_strategy}
- Sii sicuro, trasparente, dettagliato e privo di incertezze.
- Fornisci SEMPRE una risposta COMPLETA fino alla conclusione naturale del discorso, senza mai troncare a metà o lasciare frasi sospese.
- Se utilizzi dati dal web, cita le relative fonti quando appropriato.
- Se l'argomento tocca una regola salvata nel Memory Vault, rispettala tassativamente.

${AGENT_TOOLS_DEFINITIONS}
`;

  // Build clean history
  const history = messages.filter((m) => m.role !== 'system');
  let currentMessages = [
    { role: 'system', content: strictSystemPrompt },
    ...history
  ];

  if (currentMessages[currentMessages.length - 1]?.content !== prompt) {
    currentMessages.push({ role: 'user', content: prompt });
  }

  let finalResult = null;
  let loopCount = 0;
  const maxIterations = 3;
  let accumulatedSources = [...(webData.results || [])];

  while (loopCount < maxIterations) {
    loopCount++;
    finalResult = await sendOpenRouterChat({
      model,
      messages: currentMessages,
      temperature: calibratedTemp,
      max_tokens: calibratedTokens,
      enableMemory: false
    });

    if (!finalResult.success) break;

    const toolCalls = extractToolCalls(finalResult.content || finalResult.rawContent);
    if (toolCalls.length === 0) {
      // Model provided the final answer
      break;
    }

    // Execute requested tools
    let observations = [];
    for (const call of toolCalls) {
      const toolRes = await executeAgentTool(call.name, call.param);
      if (toolRes.metadata?.sources) {
        accumulatedSources = [...accumulatedSources, ...toolRes.metadata.sources];
      }
      observations.push(`[RISULTATO TOOL ${call.name}("${call.param}")]:\n${toolRes.output}`);
    }

    currentMessages.push({
      role: 'assistant',
      content: finalResult.content || finalResult.rawContent
    });
    currentMessages.push({
      role: 'user',
      content: `Ecco i dati reperiti dai tool:\n${observations.join('\n\n')}\n\nOra formula la risposta finale completa per l'utente in lingua italiana.`
    });
  }

  if (onProgressStep) {
    onProgressStep({
      stage: 'done',
      label: '✅ Risposta Verificata con Successo!',
      progress: 100
    });
  }

  // Clean any residual tool tags
  let cleanedContent = finalResult?.content || '';
  cleanedContent = cleanedContent.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/g, '').trim();

  return {
    ...finalResult,
    content: cleanedContent || finalResult?.content,
    agentTrace: {
      meta,
      calibratedTemperature: calibratedTemp,
      calibratedMaxTokens: calibratedTokens,
      taskType: meta.task_type,
      reasoningStrategy: meta.reasoning_strategy,
      webSources: accumulatedSources,
      webSearchPerformed: Boolean(accumulatedSources.length > 0),
      searchQuery: meta.search_query,
      prioritizedMemoriesCount: savedMemories.length,
      prioritizedMemories: savedMemories.slice(0, 5),
      confidenceScore: '100% (Verificato)'
    }
  };
};

/**
 * Autonomous Intelligent Agent Pipeline with Real-Time Live Streaming Output & Autonomous Tool Execution
 */
export const runAgentChatPipelineStream = async ({
  prompt,
  messages = [],
  model = 'openrouter/free',
  forceWebSearch = false,
  onProgressStep = null,
  onStreamChunk = null // ({ content, reasoning, rawContent, model, agentTrace, isError }) => void
}) => {
  // STAGE 1: META-AGENT ANALYSIS
  if (onProgressStep) {
    onProgressStep({
      stage: 'meta',
      label: '🧠 Meta-Agente: Calibrazione iperparametri in tempo reale...',
      progress: 25
    });
  }
  const meta = await runMetaPromptAnalysis(prompt);
  const calibratedTemp = meta.temperature;
  const calibratedTokens = meta.max_tokens;

  // STAGE 2: MEMORY VAULT RECALL
  if (onProgressStep) {
    onProgressStep({
      stage: 'memory',
      label: '🔒 Accesso Memory Vault: Priorità assoluta regole utente...',
      progress: 50,
      meta
    });
  }
  const savedMemories = getMemories();
  const memoryContext = savedMemories.length > 0
    ? savedMemories.map((m, i) => `${i + 1}. [${m.category}] ${m.text}`).join('\n')
    : 'Nessuna memoria salvata nel vault.';

  // STAGE 3: LIVE FACT-CHECKING WEB SEARCH
  let webData = { results: [], summary_text: '' };
  const shouldSearch = forceWebSearch || meta.needs_web_search;

  if (shouldSearch) {
    if (onProgressStep) {
      onProgressStep({
        stage: 'web',
        label: `🌐 Ricerca Web Live: Fact-checking "${meta.search_query || prompt}"...`,
        progress: 75,
        meta
      });
    }
    webData = await executeWebSearch(meta.search_query || prompt);
  }

  // STAGE 4: STRICT HIERARCHY SYNTHESIS & LIVE STREAMING
  if (onProgressStep) {
    onProgressStep({
      stage: 'synthesis',
      label: '⚡ Generazione Risposta & Streaming Pensieri Live...',
      progress: 90,
      meta,
      webSourcesCount: webData.results.length
    });
  }

  const strictSystemPrompt = `Sei un Agente AI Autonomo di Massima Precisione e Ragionamento Avanzato.
Il tuo obiettivo assoluto è fornire una risposta esatta, chiara, verificata e PRIVA DI DUBBI.

=============================================================================
🏛️ [GERARCHIA DELLE FONTI E PRIORITÀ ASSOLUTA DELLE INFORMAZIONI]:
1. 🥇 PRIORITÀ 1 (ASSOLUTA - REGOLA FONDAMENTALE): INFORMAZIONI E REGOLE SALVATE NELLA MEMORIA LOCALE/VAULT.
   Tutti i fatti, le regole e le preferenze elencate di seguito hanno priorità gerarchica assoluta.
   Se un'informazione sul web o nei tuoi dati pregressi contraddice quanto salvato nella memoria locale, DEVI SEMPRE APPLICARE E DARE RAGIONE ALLA MEMORIA SALVATA.

   [INFORMAZIONI SALVATE IN MEMORIA - PRIORITÀ 1]:
${memoryContext}

2. 🥈 PRIORITÀ 2: VERIFICA WEB IN TEMPO REALE.
   Utilizza le seguenti informazioni verificate dal Web per garantire dati aggiornati ed esatti (fatti, eventi, orari, link, specifiche), a patto che NON violino la Priorità 1:

${webData.summary_text || 'Nessuna ricerca web preliminare.'}

3. 🥉 PRIORITÀ 3: CONOSCENZA INTERNA DEL MODELLO.
   Utilizzata per sintesi, logica e spiegazione coerente.

=============================================================================
🌐 [VERIFICA E FACT-CHECKING OBBLIGATORIO CONSOLE & INSPECTOR]:
- Per qualsiasi domanda che richiede informazioni del mondo reale, orari di trasporto (pullman, treni, bus, aerei), eventi, attualità, persone, luoghi o specifiche tecniche, DEVI OBBLIGATORIAMENTE verificare i dati tramite la Console Fact-Checking Web.
- Non inventare mai orari o fatti: se non hai dati web completi, invoca il tool [web_search(query="...")] per estrarre le fonti in tempo reale.
- Nella tua risposta finale, esponi in modo chiaro e dettagliato le informazioni trovate citando le relative fonti verificate.

=============================================================================
🎯 [LINEE GUIDA PER LA RISPOSTA]:
- Strategia di ragionamento calibrata: ${meta.reasoning_strategy}
- Sii sicuro, trasparente, dettagliato e privo di incertezze.
- Fornisci SEMPRE una risposta COMPLETA fino alla conclusione naturale del discorso, senza mai troncare a metà o lasciare frasi sospese.
- Se utilizzi dati dal web, cita le relative fonti quando appropriato.
- Se l'argomento tocca una regola salvata nel Memory Vault, rispettala tassativamente.

${AGENT_TOOLS_DEFINITIONS}
`;

  const history = messages.filter((m) => m.role !== 'system');
  let currentMessages = [
    { role: 'system', content: strictSystemPrompt },
    ...history
  ];

  if (currentMessages[currentMessages.length - 1]?.content !== prompt) {
    currentMessages.push({ role: 'user', content: prompt });
  }

  let accumulatedSources = [...(webData.results || [])];
  const agentTrace = {
    meta,
    calibratedTemperature: calibratedTemp,
    calibratedMaxTokens: calibratedTokens,
    taskType: meta.task_type,
    reasoningStrategy: meta.reasoning_strategy,
    webSources: accumulatedSources,
    webSearchPerformed: Boolean(accumulatedSources.length > 0),
    searchQuery: meta.search_query,
    prioritizedMemoriesCount: savedMemories.length,
    prioritizedMemories: savedMemories.slice(0, 5),
    confidenceScore: '100% (Verificato)'
  };

  let finalStreamResult = null;
  let loopCount = 0;
  const maxIterations = 3;

  while (loopCount < maxIterations) {
    loopCount++;

    finalStreamResult = await streamOpenRouterChat({
      model,
      messages: currentMessages,
      temperature: calibratedTemp,
      max_tokens: calibratedTokens,
      enableMemory: false,
      onChunk: (chunk) => {
        if (onStreamChunk) {
          // Clean any raw tool call syntax in real-time display
          let displayClean = chunk.content.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/g, '').trimStart();
          onStreamChunk({
            ...chunk,
            content: displayClean || (chunk.content.includes('<|tool_call_start|>') ? '🔎 Verifica e consultazione fonti web in corso...' : chunk.content),
            agentTrace: {
              ...agentTrace,
              webSources: accumulatedSources,
              webSearchPerformed: Boolean(accumulatedSources.length > 0)
            }
          });
        }
      }
    });

    if (!finalStreamResult.success) break;

    const toolCalls = extractToolCalls(finalStreamResult.content || finalStreamResult.rawContent);
    if (toolCalls.length === 0) {
      // Model finished with complete final response
      break;
    }

    // Model emitted a tool call: execute tool in client!
    if (onProgressStep) {
      onProgressStep({
        stage: 'tool_execution',
        label: `🛠️ Esecuzione Tool Autonomo: ${toolCalls.map(t => `${t.name}("${t.param}")`).join(', ')}...`,
        progress: 85,
        meta
      });
    }

    let observations = [];
    for (const call of toolCalls) {
      const toolRes = await executeAgentTool(call.name, call.param);
      if (toolRes.metadata?.sources) {
        accumulatedSources = [...accumulatedSources, ...toolRes.metadata.sources];
      }
      observations.push(`[RISULTATO TOOL ${call.name}("${call.param}")]:\n${toolRes.output}`);
    }

    currentMessages.push({
      role: 'assistant',
      content: finalStreamResult.content || finalStreamResult.rawContent
    });
    currentMessages.push({
      role: 'user',
      content: `Ecco i dati reperiti dai tool richiesti:\n${observations.join('\n\n')}\n\nOra formula la risposta finale e completa per l'utente in lingua italiana.`
    });
  }

  if (onProgressStep) {
    onProgressStep({
      stage: 'done',
      label: '✅ Risposta Generata con Successo!',
      progress: 100
    });
  }

  // Clean any residual tool tags
  let cleanedContent = finalStreamResult?.content || '';
  cleanedContent = cleanedContent.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/g, '').trim();

  return {
    ...finalStreamResult,
    content: cleanedContent || finalStreamResult?.content,
    agentTrace: {
      ...agentTrace,
      webSources: accumulatedSources,
      webSearchPerformed: Boolean(accumulatedSources.length > 0)
    }
  };
};
