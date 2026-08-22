import axios from 'axios';
import { 
  getSavedChatSessions, 
  saveChatSession, 
  deleteChatSession, 
  exportChatSessionAsMarkdown 
} from './storage';

const ACTIVE_FOLDER_KEY = 'aistudio_active_workspace_folder';

export const getActiveWorkspaceFolder = () => {
  return localStorage.getItem(ACTIVE_FOLDER_KEY) || '';
};

export const setActiveWorkspaceFolder = (folderPath) => {
  if (folderPath) {
    localStorage.setItem(ACTIVE_FOLDER_KEY, folderPath);
  } else {
    localStorage.removeItem(ACTIVE_FOLDER_KEY);
  }
};

/**
 * Fetches workspace metadata (default path, system platform)
 */
export const getWorkspaceInfo = async () => {
  try {
    const res = await axios.get('/api/workspace/info');
    return res.data;
  } catch (err) {
    return {
      current_project_dir: '',
      default_folder: '',
      user_home: '',
      desktop_dir: '',
      platform: 'web'
    };
  }
};

/**
 * Triggers native OS folder picker window on user's PC via backend
 */
export const browseNativeOSFolder = async (initialDir = '') => {
  try {
    const res = await axios.post('/api/workspace/browse-native', {
      initial_dir: initialDir || undefined
    });
    return res.data;
  } catch (err) {
    return { cancelled: true, error: err.message };
  }
};

/**
 * Lists drives and directories on PC for interactive explorer navigation
 */
export const browseLocalDirectories = async (targetPath = '') => {
  try {
    const res = await axios.get('/api/workspace/browse-dirs', {
      params: { target_path: targetPath || undefined }
    });
    return res.data;
  } catch (err) {
    return { drives: [], quick_locations: [], subdirectories: [] };
  }
};

/**
 * Validates and sets active target folder on backend
 */
export const validateAndSetWorkspaceFolder = async (folderPath) => {
  try {
    const res = await axios.post('/api/workspace/set-folder', {
      folder_path: folderPath
    });
    if (res.data && res.data.success) {
      setActiveWorkspaceFolder(res.data.folder_path);
      return {
        success: true,
        data: res.data
      };
    }
    return { success: false, error: 'Risposta non valida dal server' };
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return { success: false, error: msg };
  }
};

/**
 * Gets hierarchical directory tree of target folder
 */
export const getWorkspaceTree = async (folderPath) => {
  try {
    const res = await axios.get('/api/workspace/tree', {
      params: { folder_path: folderPath }
    });
    return res.data.tree || [];
  } catch (err) {
    console.error('Error fetching workspace tree:', err);
    return [];
  }
};

/**
 * Reads file content from target workspace folder
 */
export const getWorkspaceFileContent = async (folderPath, relativePath) => {
  try {
    const res = await axios.get('/api/workspace/file-content', {
      params: {
        folder_path: folderPath,
        relative_path: relativePath
      }
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return { success: false, error: msg };
  }
};

/**
 * Saves or creates file in target workspace folder
 */
export const saveWorkspaceFile = async (folderPath, relativePath, content) => {
  try {
    const res = await axios.post('/api/workspace/save-file', {
      folder_path: folderPath,
      relative_path: relativePath,
      content: content
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return { success: false, error: msg };
  }
};

/**
 * Deletes file in target workspace folder
 */
export const deleteWorkspaceFile = async (folderPath, relativePath) => {
  try {
    const res = await axios.post('/api/workspace/delete-file', {
      folder_path: folderPath,
      relative_path: relativePath
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return { success: false, error: msg };
  }
};

/**
 * Executes a terminal command in the workspace folder
 */
export const runWorkspaceCommand = async (folderPath, command, timeoutSeconds = 30) => {
  try {
    const res = await axios.post('/api/workspace/run-command', {
      folder_path: folderPath,
      command: command,
      timeout_seconds: timeoutSeconds
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return { success: false, error: msg, returncode: -1 };
  }
};

import { sendOpenRouterChat, streamOpenRouterChat, getOpenRouterKey } from './openrouter';

let activeDirectoryHandle = null;

// Lightweight IndexedDB helper for FileSystemHandle persistence across reloads
const openHandleDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open('AIStudioWorkspaceDB', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
};

export const saveDirectoryHandleToDB = async (handle) => {
  try {
    const db = await openHandleDB();
    if (!db) return false;
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'activeWorkspaceDir');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Could not save handle to IDB:', err);
    return false;
  }
};

export const getStoredDirectoryHandleFromDB = async () => {
  try {
    const db = await openHandleDB();
    if (!db) return null;
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('activeWorkspaceDir');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
};

export const clearStoredDirectoryHandleFromDB = async () => {
  try {
    const db = await openHandleDB();
    if (!db) return;
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete('activeWorkspaceDir');
  } catch (e) {}
};

export const verifyAndRequestPermission = async (fileHandle, readWrite = true) => {
  if (!fileHandle) return false;
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  try {
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (err) {
    console.warn('Permission query/request error:', err);
  }
  return false;
};

export const setActiveDirectoryHandle = (handle) => {
  activeDirectoryHandle = handle;
  if (handle) {
    saveDirectoryHandleToDB(handle);
  }
};

export const getActiveDirectoryHandle = () => {
  return activeDirectoryHandle;
};

/**
 * Builds hierarchical file tree from browser FileSystemDirectoryHandle (Vercel / Web Mode)
 */
export const buildTreeFromDirectoryHandle = async (dirHandle, pathPrefix = '', maxDepth = 5, currentDepth = 0) => {
  if (!dirHandle || currentDepth >= maxDepth) return [];
  const entries = [];
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.') || name === 'node_modules' || name === '__pycache__' || name === 'dist') {
        continue;
      }
      const relPath = pathPrefix ? `${pathPrefix}/${name}` : name;
      if (handle.kind === 'directory') {
        const children = await buildTreeFromDirectoryHandle(handle, relPath, maxDepth, currentDepth + 1);
        entries.push({
          name,
          path: relPath,
          is_dir: true,
          children
        });
      } else {
        const file = await handle.getFile();
        entries.push({
          name,
          path: relPath,
          is_dir: false,
          size: file.size,
          extension: name.includes('.') ? name.split('.').pop() : ''
        });
      }
    }
  } catch (err) {
    console.error('Error scanning dir handle:', err);
  }
  return entries.sort((a, b) => {
    if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
    return a.is_dir ? -1 : 1;
  });
};

/**
 * Helper to navigate nested directory handle by relative path
 */
export const getHandleByPath = async (rootDirHandle, relativePath, create = false) => {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.pop();
  let currentDir = rootDirHandle;
  for (const part of parts) {
    currentDir = await currentDir.getDirectoryHandle(part, { create });
  }
  return { dirHandle: currentDir, fileName };
};

/**
 * Reads file from directory handle
 */
export const readFileFromDirectoryHandle = async (rootDirHandle, relativePath) => {
  try {
    const { dirHandle, fileName } = await getHandleByPath(rootDirHandle, relativePath, false);
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    return { success: true, path: relativePath, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Writes file directly to user's PC folder via directory handle
 */
export const writeFileToDirectoryHandle = async (rootDirHandle, relativePath, content) => {
  try {
    const { dirHandle, fileName } = await getHandleByPath(rootDirHandle, relativePath, true);
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return { success: true, path: relativePath, message: `File '${relativePath}' salvato con successo sul PC!` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Deletes file via directory handle
 */
export const deleteFileFromDirectoryHandle = async (rootDirHandle, relativePath) => {
  try {
    const { dirHandle, fileName } = await getHandleByPath(rootDirHandle, relativePath, false);
    await dirHandle.removeEntry(fileName);
    return { success: true, path: relativePath, message: `File '${relativePath}' eliminato` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Helper to download file directly to user's computer if disk handle isn't active
 */
export const downloadFileDirectly = (fileName, content) => {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (fileName || 'file.txt').replace(/\\/g, '/').split('/').pop() || 'file.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Download file error:', err);
  }
};

// Multi-format robust tool call parser supporting all model conventions:
// [list_files()], [tool call: list_files()], [tool: list_files()], ```tool\nlist_files()\n```, Action: list_files, etc.
export const parseModelToolCalls = (text) => {
  if (!text) return [];
  const calls = [];
  
  // 1. Bracket format with optional prefixes: [tool call: list_files(...)], [call: list_files(...)], [tool: list_files(...)], [list_files(...)]
  const bracketRegex = /(?:<\|tool_call_start\|>)?\s*\[\s*(?:tool\s*call\s*:\s*|call\s*:\s*|tool\s*:\s*|action\s*:\s*)?\s*(list_files|read_file|write_file|edit_file|delete_file|ask_user)\s*(?:\(([\s\S]*?)\)|\[([\s\S]*?)\])?\s*\]\s*(?:<\|tool_call_end\|>)?/gi;
  let match;
  while ((match = bracketRegex.exec(text)) !== null) {
    calls.push({
      name: match[1].toLowerCase(),
      rawArgs: (match[2] || match[3] || '').trim()
    });
  }

  // 2. Code block format: ```tool\nlist_files()\n``` or ```json\n{"tool": "list_files", ...}\n```
  if (!calls.length) {
    const codeBlockRegex = /```(?:tool|tool_call|json|python)?\s*[\r\n]+([\s\S]*?)```/gi;
    let cbMatch;
    while ((cbMatch = codeBlockRegex.exec(text)) !== null) {
      const inner = cbMatch[1].trim();
      const fnMatch = /(?:tool\s*call\s*:\s*|call\s*:\s*|tool\s*:\s*|action\s*:\s*)?(list_files|read_file|write_file|edit_file|delete_file|ask_user)\s*(?:\(([\s\S]*?)\)|\[([\s\S]*?)\])/i.exec(inner);
      if (fnMatch) {
        calls.push({
          name: fnMatch[1].toLowerCase(),
          rawArgs: (fnMatch[2] || fnMatch[3] || '').trim()
        });
      } else {
        try {
          const parsedJson = JSON.parse(inner);
          if (parsedJson.name || parsedJson.tool || parsedJson.action) {
            const name = (parsedJson.name || parsedJson.tool || parsedJson.action || '').toLowerCase();
            const argsObj = parsedJson.arguments || parsedJson.args || parsedJson.parameters || {};
            let argStr = '';
            if (typeof argsObj === 'string') {
              argStr = argsObj;
            } else {
              argStr = Object.entries(argsObj).map(([k, v]) => `${k}="${v}"`).join(', ');
            }
            calls.push({ name, rawArgs: argStr });
          }
        } catch (e) {}
      }
    }
  }

  // 3. Unbracketed ReAct format: "tool call: list_files()" or "Action: list_files"
  if (!calls.length) {
    const unbracketedRegex = /(?:tool\s*call\s*:\s*|Action\s*:\s*|Tool\s*:\s*)(list_files|read_file|write_file|edit_file|delete_file|ask_user)(?:\s*\(([\s\S]*?)\)|\s*:\s*([\s\S]*?))?(?=\n\n|\n[A-Z]|$)/gi;
    let ubMatch;
    while ((ubMatch = unbracketedRegex.exec(text)) !== null) {
      calls.push({
        name: ubMatch[1].toLowerCase(),
        rawArgs: (ubMatch[2] || ubMatch[3] || '').trim()
      });
    }
  }

  return calls;
};

export const cleanModelOutput = (text) => {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '');
  cleaned = cleaned.replace(/\[\s*(?:tool\s*call\s*:\s*|call\s*:\s*|tool\s*:\s*|action\s*:\s*)?\s*(list_files|read_file|write_file|edit_file|delete_file|ask_user)\s*(?:\([\s\S]*?\)|\[[\s\S]*?\])?\s*\]/gi, '');
  cleaned = cleaned.replace(/```(?:tool|tool_call)\s*[\r\n]+[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/(?:tool\s*call\s*:\s*|Action\s*:\s*|Tool\s*:\s*)(list_files|read_file|write_file|edit_file|delete_file|ask_user)[\s\S]*?(?=\n\n|$)/gi, '');
  return cleaned.trim();
};

export const extractPathArg = (rawArgs) => {
  if (!rawArgs) return '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  if (pathMatch) return pathMatch[1].trim();
  const quoteMatch = /["']([^"']+)["']/.exec(rawArgs);
  if (quoteMatch) return quoteMatch[1].trim();
  return rawArgs.replace(/[()]/g, '').trim();
};

export const extractWriteArgs = (rawArgs) => {
  let path = 'nuovo_file.txt';
  let content = '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  if (pathMatch) {
    path = pathMatch[1].trim();
  }
  const contentMatch = /content\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(rawArgs);
  if (contentMatch) {
    content = contentMatch[1] ?? contentMatch[2] ?? contentMatch[3] ?? contentMatch[4] ?? '';
  } else {
    const splitIdx = rawArgs.indexOf('content=');
    if (splitIdx !== -1) {
      content = rawArgs.slice(splitIdx + 8).trim().replace(/^["']|["']$/g, '');
    }
  }
  return { path, content };
};

export const extractEditArgs = (rawArgs) => {
  let path = '';
  let target = '';
  let replacement = '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  if (pathMatch) path = pathMatch[1].trim();
  const targetMatch = /target\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(rawArgs);
  if (targetMatch) target = targetMatch[1] ?? targetMatch[2] ?? targetMatch[3] ?? targetMatch[4] ?? '';
  const replMatch = /replacement\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(rawArgs);
  if (replMatch) replacement = replMatch[1] ?? replMatch[2] ?? replMatch[3] ?? replMatch[4] ?? '';
  return { path, target, replacement };
};

export const extractQuestionAndOptions = (rawArgs, fullText = '') => {
  let question = 'Come desideri procedere con questo task?';
  let options = [];

  if (rawArgs) {
    const qMatch = /question\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(rawArgs);
    if (qMatch) {
      question = (qMatch[1] ?? qMatch[2] ?? qMatch[3] ?? qMatch[4] ?? '').trim();
    } else {
      const firstPart = rawArgs.split('options=')[0];
      if (firstPart && firstPart.trim()) {
        question = firstPart.replace(/^["']|["']$/g, '').trim();
      }
    }

    // Parse options array: options=["...", "..."]
    const optArrayMatch = /options\s*=\s*\[([\s\S]*?)\]/i.exec(rawArgs);
    if (optArrayMatch) {
      const items = optArrayMatch[1].match(/(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/g);
      if (items) {
        options = items.map((it) => it.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
      }
    }
  }

  // Extract from full text if not present in options param
  if (!options.length && fullText) {
    const lines = fullText.split('\n');
    for (const line of lines) {
      const bulletMatch = /^\s*(?:\d+[\.\)]|[-*•])\s*(?:Option\s*\w+:|Opzione\s*\w+:)?\s*(.+)$/i.exec(line);
      if (bulletMatch && bulletMatch[1] && bulletMatch[1].length > 3 && bulletMatch[1].length < 150) {
        options.push(bulletMatch[1].trim().replace(/^\*\*|\*\*$/g, ''));
      }
    }
  }

  if (!options.length) {
    options = [
      'Crea una Web App interattiva (HTML + CSS + JavaScript)',
      'Crea uno script Python completo con interfaccia grafica',
      'Crea un\'applicazione React con Tailwind CSS',
      'Pianifica i requisiti e l\'architettura in un file README.md'
    ];
  }

  return { question, options: options.slice(0, 4) };
};

/**
 * Client-Side Browser Workspace AI Agent Task Runner (for Vercel & Web)
 */
export const runBrowserWorkspaceAgentTask = async ({
  dirHandle,
  folderPath,
  taskPrompt,
  messages = [],
  model = 'openrouter/free',
  maxIterations = 5,
  apiKey = null,
  onStreamChunk = null
}) => {
  const currentHandle = dirHandle || activeDirectoryHandle;
  const cleanFolder = folderPath || currentHandle?.name || 'Cartella Locale';

  // Read current directory contents to provide immediate awareness to the AI agent
  let existingFilesSummary = 'Nessun file presente nella cartella (cartella vuota).';
  if (currentHandle) {
    try {
      await verifyAndRequestPermission(currentHandle, true);
      const tree = await buildTreeFromDirectoryHandle(currentHandle);
      if (tree && tree.length > 0) {
        const fileNames = [];
        const traverse = (items, pfx = '') => {
          for (const item of items) {
            const itemPath = pfx ? `${pfx}/${item.name}` : item.name;
            if (item.is_dir) {
              traverse(item.children || [], itemPath);
            } else {
              fileNames.push(`${itemPath} (${item.size || 0} bytes)`);
            }
          }
        };
        traverse(tree);
        if (fileNames.length > 0) {
          existingFilesSummary = `File attualmente presenti nella cartella:\n${fileNames.map((f) => `- ${f}`).join('\n')}`;
        }
      }
    } catch (err) {
      console.warn('Error pre-scanning files for agent:', err);
    }
  }

  const systemPrompt = `Sei un Agente AI di Ingegneria del Software Autonomo ("Workspace Coding Agent").
Il tuo obiettivo è operare DIRETTAMENTE sui file della cartella di lavoro (${cleanFolder}) selezionata dall'utente sul suo computer.

📁 STATO ATTUALE DEI FILE NELLA CARTELLA:
${existingFilesSummary}

TOOL A DISPOSIZIONE (Usa ESATTAMENTE questa sintassi tra parentesi quadre):
- [list_files()] -> Elenca i file della cartella
- [read_file(path="nome_file.ext")] -> Legge il contenuto completo del file
- [write_file(path="nome_file.ext", content="...")] -> Crea o sovrascrive un file direttamente sul disco del PC dell'utente
- [edit_file(path="nome_file.ext", target="vecchio", replacement="nuovo")] -> Modifica una parte del file
- [delete_file(path="nome_file.ext")] -> Elimina un file
- [ask_user(question="...", options=["Opzione 1", "Opzione 2", "Opzione 3", "Opzione 4"])] -> Se la richiesta è aperta, ambigua o mancano dettagli su tecnologie/framework, FERMATI ed elenca 3 o 4 opzioni chiare e concrete che l'utente potrà cliccare con un pulsante!

🛑 REGOLA FONDAMENTALE DI AUTONOMIA, DOMANDE & OPZIONI (STILE CLAUDE):
Se non sai come andare avanti, o la richiesta dell'utente (es. "scrivi un'app...") richiede di scegliere tecnologia, librerie o funzionalità:
FERMATI IMMEDIATAMENTE ed usa [ask_user(question="...", options=["Opzione A", "Opzione B", "Opzione C", "Opzione D"])].
Formula sempre domande chiare in italiano e fornisci opzioni cliccabili azionabili.

Rispondi usando i blocchi tool nel formato [tool_name(...)]. Formula spiegazioni chiare in italiano.`;

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system')
  ];
  if (!conversation.length || conversation[conversation.length - 1].content !== taskPrompt) {
    conversation.push({ role: 'user', content: taskPrompt });
  }

  const stepsExecuted = [];
  const generatedFiles = [];
  let iteration = 0;
  let finalAnswer = '';
  let lastResponse = '';
  let finalReasoning = '';

  while (iteration < maxIterations) {
    iteration += 1;
    let streamContent = '';
    let streamReasoning = '';

    const llmRes = await streamOpenRouterChat({
      model,
      messages: conversation,
      temperature: 0.1,
      max_tokens: 4096,
      apiKey,
      onChunk: (chunk) => {
        streamContent = chunk.content || '';
        streamReasoning = chunk.reasoning || '';
        if (chunk.reasoning) {
          finalReasoning = chunk.reasoning;
        }
        if (onStreamChunk) {
          onStreamChunk({
            content: streamContent,
            reasoning: streamReasoning || finalReasoning,
            rawContent: chunk.rawContent,
            iteration,
            isThinking: !!streamReasoning && !streamContent
          });
        }
      }
    });

    if (!llmRes.success) {
      return {
        success: false,
        error: llmRes.error,
        content: `⚠️ Errore AI: ${llmRes.error}`,
        reasoning: finalReasoning,
        steps: stepsExecuted
      };
    }

    lastResponse = llmRes.content || '';
    if (llmRes.reasoning) {
      finalReasoning = llmRes.reasoning;
    }

    const toolCalls = parseModelToolCalls(lastResponse);

    if (!toolCalls.length) {
      finalAnswer = lastResponse;
      break;
    }

    const toolObservations = [];
    let stopRequested = false;
    let interactiveOptions = [];

    for (const call of toolCalls) {
      let output = '';
      if (call.name === 'ask_user') {
        const { question, options } = extractQuestionAndOptions(call.rawArgs, lastResponse);
        output = `Domanda rivolta all'utente: ${question}`;
        stopRequested = true;
        finalAnswer = lastResponse;
        interactiveOptions = options;
      } else if (call.name === 'write_file') {
        const { path, content } = extractWriteArgs(call.rawArgs);
        generatedFiles.push({ path, content });

        if (currentHandle) {
          const res = await writeFileToDirectoryHandle(currentHandle, path, content);
          if (res.success) {
            output = `File '${path}' salvato direttamente sul tuo disco locale!`;
          } else {
            downloadFileDirectly(path, content);
            output = `File '${path}' scaricato sul computer (${res.error})`;
          }
        } else {
          downloadFileDirectly(path, content);
          output = `File '${path}' salvato sul tuo computer! (Per scriverlo direttamente nella cartella Prova, selezionala con "Sfoglia Cartella dal PC").`;
        }
      } else if (call.name === 'read_file') {
        const path = extractPathArg(call.rawArgs);
        if (currentHandle && path) {
          const res = await readFileFromDirectoryHandle(currentHandle, path);
          output = res.success ? `=== CONTENUTO DI ${path} ===\n${res.content}` : `Errore lettura: ${res.error}`;
        } else {
          output = `Lettura file '${path}' eseguita.`;
        }
      } else if (call.name === 'list_files') {
        if (currentHandle) {
          const tree = await buildTreeFromDirectoryHandle(currentHandle);
          const fileNames = [];
          const traverse = (items, pfx = '') => {
            for (const item of items) {
              const itemPath = pfx ? `${pfx}/${item.name}` : item.name;
              if (item.is_dir) {
                traverse(item.children || [], itemPath);
              } else {
                fileNames.push(`${itemPath} (${item.size || 0} bytes)`);
              }
            }
          };
          traverse(tree);
          output = fileNames.length > 0 ? `File presenti nella cartella:\n${fileNames.map((f) => `- ${f}`).join('\n')}` : 'Cartella vuota.';
        } else {
          output = 'Cartella vuota.';
        }
      } else if (call.name === 'edit_file') {
        const { path, target, replacement } = extractEditArgs(call.rawArgs);
        if (currentHandle && path) {
          const readRes = await readFileFromDirectoryHandle(currentHandle, path);
          if (readRes.success) {
            const newContent = readRes.content.replace(target, replacement);
            const writeRes = await writeFileToDirectoryHandle(currentHandle, path, newContent);
            output = writeRes.success ? `File '${path}' modificato con successo sul disco!` : `Errore modifica: ${writeRes.error}`;
          } else {
            output = `Errore lettura file per modifica: ${readRes.error}`;
          }
        } else {
          output = `Modifica simulata su ${path}.`;
        }
      } else if (call.name === 'delete_file') {
        const path = extractPathArg(call.rawArgs);
        if (currentHandle && path) {
          const res = await deleteFileFromDirectoryHandle(currentHandle, path);
          output = res.success ? `File '${path}' eliminato dal disco.` : `Errore: ${res.error}`;
        } else {
          output = `File '${path}' rimosso.`;
        }
      }

      stepsExecuted.push({
        iteration,
        tool: call.name,
        args: call.rawArgs,
        result: { output }
      });
      toolObservations.push(`[RISULTATO TOOL ${call.name}]:\n${output}`);
    }

    if (stopRequested) {
      break;
    }

    conversation.push({ role: 'assistant', content: lastResponse });
    conversation.push({
      role: 'user',
      content: `Ecco i risultati delle operazioni eseguite sulla cartella:\n\n${toolObservations.join('\n\n')}\n\nProsegui con il prossimo step oppure formula la risposta finale se hai completato la task.`
    });
  }

  let cleaned = cleanModelOutput(finalAnswer || lastResponse);

  // If interactive options weren't explicitly extracted from ask_user, check if text has questions/options
  if (!interactiveOptions.length && (cleaned.includes('?') || cleaned.toLowerCase().includes('opzion') || cleaned.toLowerCase().includes('come preferisci') || cleaned.toLowerCase().includes('cosa vorresti'))) {
    const { options } = extractQuestionAndOptions('', cleaned);
    if (options.length > 1) {
      interactiveOptions = options;
    }
  }

  return {
    success: true,
    content: cleaned,
    reasoning: finalReasoning,
    folder: cleanFolder,
    steps: stepsExecuted,
    steps_count: stepsExecuted.length,
    generatedFiles: generatedFiles,
    options: interactiveOptions,
    model,
    iterations: iteration
  };
};

/**
 * Runs the autonomous Workspace AI Agent task loop (Backend + Browser Fallback)
 */
export const runWorkspaceAgentTask = async ({
  folderPath,
  taskPrompt,
  messages = [],
  model = 'openrouter/free',
  maxIterations = 5,
  dirHandle = null,
  apiKey = null,
  onStreamChunk = null
}) => {
  const currentHandle = dirHandle || activeDirectoryHandle;
  const activeKey = (apiKey || getOpenRouterKey() || '').trim();

  if (!activeKey) {
    return {
      success: false,
      error: 'Chiave API OpenRouter mancante! Inserisci una chiave API (gratuita su openrouter.ai/keys) per far generare risposte all\'Agente AI.',
      content: '⚠️ **Chiave API OpenRouter mancante!**\n\nPer far operare l\'Agente AI su Vercel, inserisci la tua chiave API gratuita (ottenibile gratis in 10 secondi su [openrouter.ai/keys](https://openrouter.ai/keys)) nella sezione in alto o nelle Impostazioni.'
    };
  }
  
  // Run client-side agent with real-time token and reasoning streaming
  return runBrowserWorkspaceAgentTask({
    dirHandle: currentHandle,
    folderPath,
    taskPrompt,
    messages,
    model,
    maxIterations,
    apiKey: activeKey,
    onStreamChunk
  });
};

/**
 * Web File System Access API picker for picking local folder directly from browser
 */
export const pickDirectoryNative = async () => {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setActiveDirectoryHandle(dirHandle);
      return {
        success: true,
        handle: dirHandle,
        name: dirHandle.name
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'File System Access API non supportata da questo browser.' };
};

// Re-export session helpers
export {
  getSavedChatSessions,
  saveChatSession,
  deleteChatSession,
  exportChatSessionAsMarkdown
};
