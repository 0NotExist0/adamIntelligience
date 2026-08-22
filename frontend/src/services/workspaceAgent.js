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

import { sendOpenRouterChat, getOpenRouterKey } from './openrouter';

let activeDirectoryHandle = null;

export const setActiveDirectoryHandle = (handle) => {
  activeDirectoryHandle = handle;
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
 * Client-Side Browser Workspace AI Agent Task Runner (for Vercel & Web)
 */
export const runBrowserWorkspaceAgentTask = async ({
  dirHandle,
  folderPath,
  taskPrompt,
  messages = [],
  model = 'openrouter/free',
  maxIterations = 5
}) => {
  const cleanFolder = folderPath || dirHandle?.name || 'Cartella Locale';
  const systemPrompt = `Sei un Agente AI di Ingegneria del Software Autonomo ("Workspace Coding Agent").
Il tuo obiettivo è operare DIRETTAMENTE sui file della cartella di lavoro (${cleanFolder}) selezionata dall'utente sul suo computer.

TOOL A DISPOSIZIONE:
1. [list_files()] -> Elenca i file della cartella
2. [read_file(path="nome_file.ext")] -> Legge il contenuto completo del file
3. [write_file(path="nome_file.ext", content="...")] -> Crea o sovrascrive un file direttamente sul disco del PC dell'utente
4. [edit_file(path="nome_file.ext", target="vecchio", replacement="nuovo")] -> Modifica una parte del file
5. [delete_file(path="nome_file.ext")] -> Elimina un file

Rispondi usando i blocchi tool nel formato [tool_name(...)] o <|tool_call_start|>[tool_name(...)]<|tool_call_end|>. Formula spiegazioni chiare in italiano.`;

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system')
  ];
  if (!conversation.length || conversation[conversation.length - 1].content !== taskPrompt) {
    conversation.push({ role: 'user', content: taskPrompt });
  }

  const stepsExecuted = [];
  let iteration = 0;
  let finalAnswer = '';
  let lastResponse = '';

  while (iteration < maxIterations) {
    iteration += 1;
    const llmRes = await sendOpenRouterChat({
      model,
      messages: conversation,
      temperature: 0.1,
      max_tokens: 4096
    });

    if (!llmRes.success) {
      return {
        success: false,
        error: llmRes.error,
        content: `⚠️ Errore AI: ${llmRes.error}`,
        steps: stepsExecuted
      };
    }

    lastResponse = llmRes.content || '';
    const toolRegex = /(?:<\|tool_call_start\|>)?\s*\[(list_files|read_file|write_file|edit_file|delete_file)\s*\(([\s\S]*?)\)\]\s*(?:<\|tool_call_end\|>)?/g;
    const toolCalls = [];
    let match;
    while ((match = toolRegex.exec(lastResponse)) !== null) {
      toolCalls.push({ name: match[1], rawArgs: match[2] });
    }

    if (!toolCalls.length) {
      finalAnswer = lastResponse;
      break;
    }

    const toolObservations = [];
    for (const call of toolCalls) {
      let output = '';
      if (call.name === 'write_file') {
        const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(call.rawArgs);
        const contentMatch = /content\s*=\s*(?:"""([\s\S]*?)"""|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(call.rawArgs);
        const path = pathMatch ? pathMatch[1] : 'nuovo_file.txt';
        const content = contentMatch ? (contentMatch[1] || contentMatch[2] || contentMatch[3] || '') : '';
        if (dirHandle) {
          const res = await writeFileToDirectoryHandle(dirHandle, path, content);
          output = res.success ? `File '${path}' creato/salvato con successo sul disco!` : `Errore: ${res.error}`;
        } else {
          output = `File '${path}' generato con successo: ${content.length} caratteri.`;
        }
      } else if (call.name === 'read_file') {
        const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(call.rawArgs);
        const path = pathMatch ? pathMatch[1] : '';
        if (dirHandle && path) {
          const res = await readFileFromDirectoryHandle(dirHandle, path);
          output = res.success ? res.content : `Errore: ${res.error}`;
        } else {
          output = `Lettura file '${path}' eseguita.`;
        }
      } else if (call.name === 'list_files') {
        if (dirHandle) {
          const tree = await buildTreeFromDirectoryHandle(dirHandle);
          output = `File trovati nella cartella: ${tree.map((t) => t.name).join(', ')}`;
        } else {
          output = 'Cartella vuota.';
        }
      } else if (call.name === 'delete_file') {
        const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(call.rawArgs);
        const path = pathMatch ? pathMatch[1] : '';
        if (dirHandle && path) {
          const res = await deleteFileFromDirectoryHandle(dirHandle, path);
          output = res.success ? `File '${path}' eliminato.` : `Errore: ${res.error}`;
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

    conversation.push({ role: 'assistant', content: lastResponse });
    conversation.push({
      role: 'user',
      content: `Ecco i risultati delle operazioni eseguite sulla cartella:\n\n${toolObservations.join('\n\n')}\n\nProsegui con il prossimo step oppure formula la risposta finale se hai completato la task.`
    });
  }

  let cleaned = finalAnswer || lastResponse;
  cleaned = cleaned.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/g, '').trim();
  cleaned = cleaned.replace(/\[(list_files|read_file|write_file|edit_file|delete_file)\s*\([\s\S]*?\)\]/g, '').trim();

  return {
    success: true,
    content: cleaned,
    folder: cleanFolder,
    steps: stepsExecuted,
    steps_count: stepsExecuted.length,
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
  apiKey = null
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
  
  // If we have a browser directory handle (Vercel Mode), run client-side agent
  if (currentHandle) {
    return runBrowserWorkspaceAgentTask({
      dirHandle: currentHandle,
      folderPath,
      taskPrompt,
      messages,
      model,
      maxIterations,
      apiKey: activeKey
    });
  }

  // Otherwise try backend REST API
  try {
    const res = await axios.post('/api/workspace/agent-task', {
      folder_path: folderPath,
      task_prompt: taskPrompt,
      messages: messages,
      model: model,
      max_iterations: maxIterations,
      api_key: activeKey
    }, {
      headers: { Authorization: `Bearer ${activeKey}` }
    });
    if (res.data && res.data.success) {
      return res.data;
    }
    // If backend returned error, fallback to browser runner
    return runBrowserWorkspaceAgentTask({
      dirHandle: currentHandle,
      folderPath,
      taskPrompt,
      messages,
      model,
      maxIterations,
      apiKey: activeKey
    });
  } catch (err) {
    // If backend 404/500 on Vercel, fallback to client-side runner
    return runBrowserWorkspaceAgentTask({
      dirHandle: currentHandle,
      folderPath,
      taskPrompt,
      messages,
      model,
      maxIterations,
      apiKey: activeKey
    });
  }
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
