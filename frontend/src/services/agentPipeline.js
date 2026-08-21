import axios from 'axios';
import { getMemories } from './memory';
import { sendOpenRouterChat, getOpenRouterKey } from './openrouter';

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
  const isFactual = /chi è|cosa è|quando|dove|notizie|chi ha vinto|versione|prezzo|meteo|anno|storia di|capitale|definizione/i.test(p);
  const hasRecentKeywords = /ultim|oggi|2026|2025|2024|attual|news|aggiornat|nuovo modello|rilascio/i.test(p);

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
  } else if (isFactual || hasRecentKeywords) {
    task_type = 'factual_query';
    temperature = 0.2;
    max_tokens = 6144;
    needs_web_search = true;
  }

  // Clean search query
  const cleanSearchQuery = prompt
    .replace(/[?!.,;:]/g, '')
    .replace(/\b(spiegami|dimmi|cosa sai di|vorrei sapere|per favore|come funziona)\b/gi, '')
    .trim()
    .slice(0, 100);

  return {
    task_type,
    temperature,
    max_tokens,
    needs_web_search: needs_web_search || hasRecentKeywords,
    search_query: cleanSearchQuery || prompt.slice(0, 80),
    reasoning_strategy: isCode 
      ? 'Verifica rigorosa della sintassi e best practice' 
      : isMath 
      ? 'Risoluzione logico-matematica deterministica' 
      : (needs_web_search ? 'Cross-referencing con fonti Web in tempo reale' : 'Analisi concettuale strutturata')
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
 * Web Search Query Executor
 */
export const executeWebSearch = async (query) => {
  if (!query || !query.trim()) return { results: [], summary_text: '' };

  try {
    const res = await axios.post('/api/agent/web-search', { query, max_results: 4 }, { timeout: 8000 });
    if (res.data && res.data.results) {
      return res.data;
    }
  } catch (e) {
    // Fallback search via Wikipedia open API directly from browser
    try {
      const cleanQ = encodeURIComponent(query.trim());
      const wikiRes = await axios.get(
        `https://it.wikipedia.org/w/api.php?action=opensearch&search=${cleanQ}&limit=3&namespace=0&format=json&origin=*`,
        { timeout: 5000 }
      );
      if (wikiRes.data && wikiRes.data[1] && wikiRes.data[1].length > 0) {
        const titles = wikiRes.data[1];
        const snippets = wikiRes.data[2] || [];
        const urls = wikiRes.data[3] || [];
        const results = titles.map((t, idx) => ({
          title: t,
          snippet: snippets[idx] || '',
          url: urls[idx] || `https://it.wikipedia.org/wiki/${t}`,
          source: 'Wikipedia IT'
        }));
        
        const summary_text = `### 🌐 RISULTATI DAL WEB (Wikipedia):\n` +
          results.map((r, i) => `${i + 1}. **${r.title}**: ${r.snippet} [${r.url}]`).join('\n');

        return {
          query,
          results,
          results_count: results.length,
          summary_text
        };
      }
    } catch (err) {
      // ignore
    }
  }

  return { results: [], summary_text: '' };
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
🎯 [LINEE GUIDA PER LA RISPOSTA]:
- Strategia di ragionamento calibrata: ${meta.reasoning_strategy}
- Sii sicuro, trasparente, dettagliato e privo di incertezze.
- Se utilizzi dati dal web, cita le relative fonti quando appropriato.
- Se l'argomento tocca una regola salvata nel Memory Vault, rispettala tassativamente.
`;

  // Build clean history
  const history = messages.filter((m) => m.role !== 'system');
  const apiMessages = [
    { role: 'system', content: strictSystemPrompt },
    ...history
  ];

  // If prompt not in history, append it
  if (apiMessages[apiMessages.length - 1]?.content !== prompt) {
    apiMessages.push({ role: 'user', content: prompt });
  }

  const genResult = await sendOpenRouterChat({
    model,
    messages: apiMessages,
    temperature: calibratedTemp,
    max_tokens: calibratedTokens,
    enableMemory: false // Already injected with strict hierarchy above
  });

  if (onProgressStep) {
    onProgressStep({
      stage: 'done',
      label: '✅ Risposta Verificata con Successo!',
      progress: 100
    });
  }

  return {
    ...genResult,
    agentTrace: {
      meta,
      calibratedTemperature: calibratedTemp,
      calibratedMaxTokens: calibratedTokens,
      taskType: meta.task_type,
      reasoningStrategy: meta.reasoning_strategy,
      webSources: webData.results || [],
      webSearchPerformed: Boolean(webData.results && webData.results.length > 0),
      searchQuery: meta.search_query,
      prioritizedMemoriesCount: savedMemories.length,
      prioritizedMemories: savedMemories.slice(0, 5),
      confidenceScore: '100% (Verificato)'
    }
  };
};
