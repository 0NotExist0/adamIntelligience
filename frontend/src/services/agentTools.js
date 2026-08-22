import { multiMethodWebSearch } from './webSearch';
import { getMemories } from './memory';

// AI Studio Pro - Client-Side Autonomous Agent Tools Engine

export const AGENT_TOOLS_DEFINITIONS = `
Disponi dei seguenti TOOL eseguibili per risolvere autonomamente le task dell'utente:
1. web_search(query: string): Esegue una ricerca web multi-fonte (DuckDuckGo, Wikipedia, OpenAlex) in tempo reale.
2. memory_search(category?: string): Consulta le regole e i fatti salvati nel Memory Vault dell'utente.
3. current_time(): Restituisce la data e l'ora attuali esatte.

Se hai bisogno di informazioni esterne o verificare fatti, invoca il tool nel formato:
<|tool_call_start|>[web_search(query="tua query di ricerca")]<|tool_call_end|>
oppure
\`\`\`tool_call
{"tool": "web_search", "query": "tua query"}
\`\`\`
Quando ricevi il risultato del tool, formula la risposta finale completa in lingua italiana.
`;

/**
 * Parses any tool call from the model's generated text
 */
export const extractToolCalls = (text) => {
  if (!text) return [];
  const calls = [];

  // Pattern 1: <|tool_call_start|>[google(query="...")]<|tool_call_end|> or <|tool_call_start|>[web_search(query="...")]<|tool_call_end|>
  const toolCallStartRegex = /<\|tool_call_start\|>([\s\S]*?)<\|tool_call_end\|>/g;
  let match;
  while ((match = toolCallStartRegex.exec(text)) !== null) {
    const rawCall = match[1].trim();
    // parse [name(param="value")] or [name(query="...")]
    const funcMatch = rawCall.match(/(\w+)\s*\(\s*(?:query\s*=\s*)?["']?([^"')\]]+)["']?\s*\)/);
    if (funcMatch) {
      const name = funcMatch[1].toLowerCase() === 'google' ? 'web_search' : funcMatch[1];
      calls.push({
        name,
        param: funcMatch[2].trim(),
        raw: match[0]
      });
    }
  }

  // Pattern 2: ```tool_call { "tool": "...", "query": "..." } ```
  const jsonBlockRegex = /```(?:tool_call|json)?\s*(\{\s*"tool"[\s\S]*?\})\s*```/g;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool || parsed.name) {
        calls.push({
          name: parsed.tool || parsed.name,
          param: parsed.query || parsed.param || JSON.stringify(parsed.args || {}),
          raw: match[0]
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Pattern 3: [web_search(query="...")] or [google(query="...")] without tags
  if (calls.length === 0) {
    const directRegex = /\[(google|web_search|search)\s*\(\s*(?:query\s*=\s*)?["']([^"']+)["']\s*\)\]/gi;
    while ((match = directRegex.exec(text)) !== null) {
      calls.push({
        name: 'web_search',
        param: match[2].trim(),
        raw: match[0]
      });
    }
  }

  return calls;
};

/**
 * Executes an extracted tool call directly in the browser/client environment
 */
export const executeAgentTool = async (toolName, param) => {
  const cleanName = (toolName || '').toLowerCase().trim();
  const startTime = Date.now();

  console.groupCollapsed(`%c🤖 [AGENT AUTONOMOUS TOOL EXECUTION] Tool: ${cleanName}("${param}")`, 'color: #10b981; font-weight: bold; background: #064e3b; padding: 4px 8px; border-radius: 4px;');
  console.log(`Parametro Tool:`, param);

  let output = '';
  let metadata = {};

  try {
    if (cleanName === 'web_search' || cleanName === 'google' || cleanName === 'search') {
      const searchRes = await multiMethodWebSearch(param);
      output = searchRes.summary_text || `Nessun risultato web per "${param}".`;
      metadata = {
        resultsCount: searchRes.results?.length || 0,
        sources: searchRes.results || [],
        method: searchRes.method
      };
    } else if (cleanName === 'memory_search' || cleanName === 'memory') {
      const memories = getMemories();
      const filtered = param 
        ? memories.filter(m => m.text.toLowerCase().includes(param.toLowerCase()) || m.category.toLowerCase().includes(param.toLowerCase()))
        : memories;
      output = filtered.length > 0 
        ? `[MEMORIA VAULT TROVATA]:\n` + filtered.map((m, i) => `${i + 1}. [${m.category}] ${m.text}`).join('\n')
        : 'Nessun vincolo trovato nella memoria.';
      metadata = { memoriesCount: filtered.length };
    } else if (cleanName === 'current_time') {
      const now = new Date();
      output = `Data e ora corrente: ${now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // Default fallback search
      const searchRes = await multiMethodWebSearch(param || cleanName);
      output = searchRes.summary_text;
      metadata = { resultsCount: searchRes.results?.length || 0 };
    }

    const durationMs = Date.now() - startTime;
    console.log(`%cRisultato Tool (${durationMs}ms):`, 'color: #34d399; font-weight: bold;');
    console.info(output);
    console.groupEnd();

    return {
      success: true,
      toolName: cleanName,
      param,
      output,
      metadata,
      durationMs
    };
  } catch (err) {
    console.error(`Errore esecuzione tool ${cleanName}:`, err);
    console.groupEnd();
    return {
      success: false,
      toolName: cleanName,
      param,
      output: `Errore durante l'esecuzione del tool: ${err.message}`,
      durationMs: Date.now() - startTime
    };
  }
};
