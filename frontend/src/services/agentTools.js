import { multiMethodWebSearch, scrapeWebsiteContent } from './webSearch';
import { getMemories } from './memory';
import { 
  getActiveWorkspaceFolder, 
  getWorkspaceTree, 
  getWorkspaceFileContent, 
  saveWorkspaceFile, 
  runWorkspaceCommand 
} from './workspaceAgent';

// AI Studio Pro - Client-Side Autonomous Agent Tools Engine

export const AGENT_TOOLS_DEFINITIONS = `
Disponi dei seguenti TOOL eseguibili per risolvere autonomamente le task dell'utente:
1. web_search(query: string): Esegue una ricerca web multi-fonte in tempo reale.
2. explore_site(url: string): Esplora e legge il testo completo da una URL o sito web.
3. memory_search(category?: string): Consulta le regole e i fatti salvati nel Memory Vault dell'utente.
4. current_time(): Restituisce la data e l'ora attuali esatte.
5. read_file(path: string): Legge il contenuto di un file nella cartella di lavoro attiva.
6. write_file(path: string, content: string): Salva o crea un file nella cartella di lavoro attiva.
7. run_command(command: string): Esegue un comando da terminale nella cartella di lavoro.

Se hai bisogno di informazioni esterne o verificare fatti, invoca il tool nel formato:
<|tool_call_start|>[web_search(query="tua query di ricerca")]<|tool_call_end|>
oppure per operare sui file della cartella:
<|tool_call_start|>[read_file(path="nome_file.js")]<|tool_call_end|>
oppure
<|tool_call_start|>[run_command(command="npm run build")]<|tool_call_end|>
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
    // parse [name(param="value")] or [name(query="...")] or [explore_site(url="...")]
    const funcMatch = rawCall.match(/(\w+)\s*\(\s*(?:query|url|param)?\s*=?\s*["']?([^"')\]]+)["']?\s*\)/);
    if (funcMatch) {
      let name = funcMatch[1].toLowerCase();
      if (name === 'google') name = 'web_search';
      if (name === 'read_url' || name === 'fetch_url') name = 'explore_site';
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
        let name = (parsed.tool || parsed.name).toLowerCase();
        if (name === 'read_url' || name === 'fetch_url') name = 'explore_site';
        calls.push({
          name,
          param: parsed.url || parsed.query || parsed.param || JSON.stringify(parsed.args || {}),
          raw: match[0]
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Pattern 3: [web_search(query="...")] or [explore_site(url="...")] without tags
  if (calls.length === 0) {
    const directRegex = /\[(google|web_search|search|explore_site|read_url)\s*\(\s*(?:query|url)?\s*=?\s*["']([^"']+)["']\s*\)\]/gi;
    while ((match = directRegex.exec(text)) !== null) {
      let name = match[1].toLowerCase();
      if (name === 'google' || name === 'search') name = 'web_search';
      if (name === 'read_url') name = 'explore_site';
      calls.push({
        name,
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
    } else if (cleanName === 'explore_site' || cleanName === 'read_url' || cleanName === 'scrape') {
      const scrapeRes = await scrapeWebsiteContent(param);
      if (scrapeRes.success) {
        output = `### 📄 CONTENUTO ESTRATTO DALLA PAGINA (${scrapeRes.url}):\n\n${scrapeRes.content}`;
        metadata = {
          url: scrapeRes.url,
          wordCount: scrapeRes.wordCount,
          method: scrapeRes.method
        };
      } else {
        output = `Impossibile estrarre il testo da ${param}: ${scrapeRes.error}`;
      }
    } else if (cleanName === 'memory_search' || cleanName === 'memory') {
      const memories = getMemories();
      const filtered = param 
        ? memories.filter(m => m.text.toLowerCase().includes(param.toLowerCase()) || m.category.toLowerCase().includes(param.toLowerCase()))
        : memories;
      output = filtered.length > 0 
        ? `[MEMORIA VAULT TROVATA]:\n` + filtered.map((m, i) => `${i + 1}. [${m.category}] ${m.text}`).join('\n')
        : 'Nessun vincolo trovato nella memoria.';
      metadata = { memoriesCount: filtered.length };
    } else if (cleanName === 'read_file') {
      const activeFolder = getActiveWorkspaceFolder();
      if (!activeFolder) {
        output = 'Nessuna cartella di lavoro attiva selezionata. Seleziona una cartella nello studio Workspace.';
      } else {
        const fileRes = await getWorkspaceFileContent(activeFolder, param);
        output = fileRes.success ? `=== CONTENUTO DI ${param} ===\n${fileRes.content}` : `Errore lettura: ${fileRes.error}`;
        metadata = { path: param, sizeBytes: fileRes.size_bytes };
      }
    } else if (cleanName === 'run_command') {
      const activeFolder = getActiveWorkspaceFolder();
      if (!activeFolder) {
        output = 'Nessuna cartella di lavoro attiva selezionata.';
      } else {
        const cmdRes = await runWorkspaceCommand(activeFolder, param);
        output = `[ESECUZIONE]: ${param}\n[EXIT]: ${cmdRes.returncode}\n${cmdRes.stdout ? `[STDOUT]:\n${cmdRes.stdout}\n` : ''}${cmdRes.stderr ? `[STDERR]:\n${cmdRes.stderr}\n` : ''}`;
        metadata = { command: param, success: cmdRes.success };
      }
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
