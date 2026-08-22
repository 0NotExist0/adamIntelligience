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
 * Normalizes relative path, stripping drive letters (C:\...), OneDrive and Desktop prefixes
 */
export const normalizeRelativePath = (rawPath, baseFolderPath = '', baseFolderName = '') => {
  if (!rawPath) return '';
  let p = String(rawPath).trim().replace(/^["']|["']$/g, '');
  p = p.replace(/\\/g, '/');

  const cleanBase = (baseFolderPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanName = (baseFolderName || '').replace(/\\/g, '/').replace(/\/+$/, '') || (cleanBase ? cleanBase.split('/').pop() : '');

  // 1. If path starts with exact base folder path (case-insensitive)
  if (cleanBase && p.toLowerCase().startsWith(cleanBase.toLowerCase() + '/')) {
    p = p.slice(cleanBase.length + 1);
  }

  // 2. If path starts with or contains base folder name (e.g. OneDrive/Desktop/Prova/ciao.txt)
  if (cleanName) {
    if (p.toLowerCase().startsWith(cleanName.toLowerCase() + '/')) {
      p = p.slice(cleanName.length + 1);
    }
    const marker = '/' + cleanName.toLowerCase() + '/';
    const lastIdx = p.toLowerCase().lastIndexOf(marker);
    if (lastIdx !== -1) {
      p = p.slice(lastIdx + marker.length);
    }
  }

  // 3. If path still contains a drive letter (e.g. C:/...)
  if (/^[a-zA-Z]:\//i.test(p)) {
    const parts = p.split('/');
    p = parts[parts.length - 1];
  }

  return p.replace(/^\/+/, '');
};

/**
 * Gets hierarchical directory tree of target folder
 */
export const getWorkspaceTree = async (folderPath) => {
  if (activeDirectoryHandle) {
    try {
      const tree = await buildTreeFromDirectoryHandle(activeDirectoryHandle);
      if (tree && tree.length > 0) return tree;
    } catch (e) {}
  }
  for (const url of ['http://127.0.0.1:8000/api/workspace/tree', '/api/workspace/tree']) {
    try {
      const res = await axios.get(url, {
        params: { folder_path: folderPath },
        timeout: 4000
      });
      if (res.data && res.data.tree && !res.data.is_serverless) {
        return res.data.tree;
      }
    } catch (e) {}
  }
  return [];
};

/**
 * Reads file content from target workspace folder
 */
export const getWorkspaceFileContent = async (folderPath, relativePath) => {
  const cleanRel = normalizeRelativePath(relativePath, folderPath, activeDirectoryHandle?.name);
  if (activeDirectoryHandle) {
    const res = await readFileFromDirectoryHandle(activeDirectoryHandle, cleanRel);
    if (res.success) return res;
  }
  for (const url of ['http://127.0.0.1:8000/api/workspace/file-content', '/api/workspace/file-content']) {
    try {
      const res = await axios.get(url, {
        params: {
          folder_path: folderPath,
          relative_path: cleanRel
        },
        timeout: 4000
      });
      if (res.data && res.data.success && !res.data.is_serverless) {
        return res.data;
      }
    } catch (e) {}
  }
  return { success: false, error: 'File non trovato o accesso negato' };
};

/**
 * Saves or creates file in target workspace folder
 */
export const saveWorkspaceFile = async (folderPath, relativePath, content) => {
  const cleanRel = normalizeRelativePath(relativePath, folderPath, activeDirectoryHandle?.name);

  // 1. If active directory handle exists, write directly to PC disk
  if (activeDirectoryHandle) {
    try {
      const granted = await verifyAndRequestPermission(activeDirectoryHandle, true);
      if (granted) {
        const hRes = await writeFileToDirectoryHandle(activeDirectoryHandle, cleanRel, content);
        if (hRes.success) {
          return {
            success: true,
            path: cleanRel,
            full_path: `${activeDirectoryHandle.name}/${cleanRel}`,
            message: `File '${cleanRel}' salvato su disco in '${activeDirectoryHandle.name}'`
          };
        }
      }
    } catch (e) {}
  }

  // 2. Try local Python backend (native Windows disk access)
  for (const url of ['http://127.0.0.1:8000/api/workspace/save-file', '/api/workspace/save-file']) {
    try {
      const res = await axios.post(url, {
        folder_path: folderPath,
        relative_path: cleanRel,
        content: content
      }, { timeout: 4000 });
      if (res.data && res.data.success && !res.data.is_serverless) {
        return res.data;
      }
    } catch (err) {}
  }

  // 3. Fallback: download
  downloadFileDirectly(cleanRel, content);
  return {
    success: true,
    path: cleanRel,
    downloaded: true,
    message: `File '${cleanRel}' scaricato sul computer`
  };
};

/**
 * Deletes file in target workspace folder
 */
export const deleteWorkspaceFile = async (folderPath, relativePath) => {
  const cleanRel = normalizeRelativePath(relativePath, folderPath, activeDirectoryHandle?.name);
  if (activeDirectoryHandle) {
    const res = await deleteFileFromDirectoryHandle(activeDirectoryHandle, cleanRel);
    if (res.success) return res;
  }
  for (const url of ['http://127.0.0.1:8000/api/workspace/delete-file', '/api/workspace/delete-file']) {
    try {
      const res = await axios.post(url, {
        folder_path: folderPath,
        relative_path: cleanRel
      }, { timeout: 4000 });
      if (res.data && res.data.success && !res.data.is_serverless) {
        return res.data;
      }
    } catch (e) {}
  }
  return { success: false, error: 'Impossibile eliminare il file' };
};

/**
 * Executes a terminal command in the workspace folder via local PowerShell or API
 */
export const runWorkspaceCommand = async (folderPath, command, timeoutSeconds = 30) => {
  // 1. Try local Python agent bridge on 127.0.0.1:8000 (direct native PowerShell on Windows)
  try {
    const res = await axios.post('http://127.0.0.1:8000/api/workspace/run-command', {
      folder_path: folderPath,
      command: command,
      timeout_seconds: timeoutSeconds
    }, { timeout: (timeoutSeconds + 5) * 1000 });
    return res.data;
  } catch (err) {}

  // 2. Fallback to same-origin /api/workspace/run-command
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
    if (typeof dirHandle.values === 'function') {
      for await (const handle of dirHandle.values()) {
        const name = handle.name;
        if (!name || name.startsWith('.') || name === 'node_modules' || name === '__pycache__' || name === 'dist') {
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
          let size = 0;
          try {
            const file = await handle.getFile();
            size = file.size;
          } catch (e) {}
          entries.push({
            name,
            path: relPath,
            is_dir: false,
            size,
            extension: name.includes('.') ? name.split('.').pop() : ''
          });
        }
      }
    } else if (typeof dirHandle.entries === 'function') {
      for await (const [name, handle] of dirHandle.entries()) {
        if (!name || name.startsWith('.') || name === 'node_modules' || name === '__pycache__' || name === 'dist') {
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
          let size = 0;
          try {
            const file = await handle.getFile();
            size = file.size;
          } catch (e) {}
          entries.push({
            name,
            path: relPath,
            is_dir: false,
            size,
            extension: name.includes('.') ? name.split('.').pop() : ''
          });
        }
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

const TOOL_NAMES = 'list_files|read_file|write_file|edit_file|delete_file|run_command|ask_user';

/**
 * Scans from an opening '(' to its matching ')', correctly skipping parentheses,
 * brackets and quote characters that appear INSIDE quoted string arguments (e.g. code).
 * This is what makes it safe to embed real source code (which contains ), ], quotes)
 * inside write_file(content="...") without the tool call being truncated at the first ')'.
 */
const scanBalancedArgs = (text, openIdx) => {
  let depth = 1;
  let i = openIdx + 1;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    // Triple-quoted string (""" or ''')
    if ((c === '"' || c === "'") && text.slice(i, i + 3) === c + c + c) {
      const q = c + c + c;
      const close = text.indexOf(q, i + 3);
      if (close === -1) return { end: n - 1, args: text.slice(openIdx + 1), truncated: true };
      i = close + 3;
      continue;
    }
    // Single/double-quoted string (honouring backslash escapes)
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < n) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '(') { depth++; i++; continue; }
    if (c === ')') {
      depth--;
      i++;
      if (depth === 0) return { end: i - 1, args: text.slice(openIdx + 1, i - 1) };
      continue;
    }
    i++;
  }
  // Ran off the end -> the tool call was cut off (model hit token limit mid-call)
  return { end: n - 1, args: text.slice(openIdx + 1), truncated: true };
};

/**
 * Finds bracket-format tool calls ([write_file(...)], [tool call: read_file(...)], ...)
 * using the balanced scanner. Returns match positions so the same result can drive
 * both execution (parseModelToolCalls) and cleanup (cleanModelOutput).
 */
const findBracketToolCalls = (text) => {
  const calls = [];
  const startRe = new RegExp(
    '(?:<\\|tool_call_start\\|>)?\\s*\\[\\s*(?:tool\\s*call\\s*:\\s*|call\\s*:\\s*|tool\\s*:\\s*|action\\s*:\\s*)?\\s*(' +
    TOOL_NAMES + ')\\s*\\(',
    'gi'
  );
  let m;
  while ((m = startRe.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    const openParen = m.index + m[0].length - 1; // index of the '('
    const scan = scanBalancedArgs(text, openParen);
    const after = scan.end + 1;
    const tailMatch = /^\s*\]?\s*(?:<\|tool_call_end\|>)?/.exec(text.slice(after));
    const matchEnd = after + (tailMatch ? tailMatch[0].length : 0);
    calls.push({
      name,
      rawArgs: scan.args.trim(),
      matchStart: m.index,
      matchEnd,
      truncated: !!scan.truncated
    });
    startRe.lastIndex = matchEnd; // continue scanning after this call
  }
  return calls;
};

// Multi-format robust tool call parser supporting all model conventions:
// [list_files()], [tool call: list_files()], [tool: list_files()], ```tool\nlist_files()\n```, Action: list_files, etc.
export const parseModelToolCalls = (text) => {
  if (!text) return [];

  // 1. Bracket format (primary) — balanced, code-safe.
  const bracketCalls = findBracketToolCalls(text);
  if (bracketCalls.length) {
    return bracketCalls.map((c) => ({ name: c.name, rawArgs: c.rawArgs, truncated: c.truncated }));
  }

  const calls = [];

  // 2. Code block format: ```tool\nlist_files()\n``` or ```json\n{"tool": "list_files", ...}\n```
  const codeBlockRegex = /```(?:tool|tool_call|json|python)?\s*[\r\n]+([\s\S]*?)```/gi;
  let cbMatch;
  while ((cbMatch = codeBlockRegex.exec(text)) !== null) {
    const inner = cbMatch[1].trim();
    const fnMatch = new RegExp(
      '(?:tool\\s*call\\s*:\\s*|call\\s*:\\s*|tool\\s*:\\s*|action\\s*:\\s*)?(' + TOOL_NAMES + ')\\s*\\(',
      'i'
    ).exec(inner);
    if (fnMatch) {
      const openParen = fnMatch.index + fnMatch[0].length - 1;
      const scan = scanBalancedArgs(inner, openParen);
      calls.push({ name: fnMatch[1].toLowerCase(), rawArgs: scan.args.trim(), truncated: !!scan.truncated });
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
            argStr = Object.entries(argsObj).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
          }
          calls.push({ name, rawArgs: argStr, truncated: false });
        }
      } catch (e) {}
    }
  }
  if (calls.length) return calls;

  // 3. Unbracketed ReAct format: "tool call: list_files()" or "Action: list_files"
  const unbracketedRegex = new RegExp(
    '(?:tool\\s*call\\s*:\\s*|Action\\s*:\\s*|Tool\\s*:\\s*)(' + TOOL_NAMES + ')(?:\\s*\\(([\\s\\S]*?)\\)|\\s*:\\s*([\\s\\S]*?))?(?=\\n\\n|\\n[A-Z]|$)',
    'gi'
  );
  let ubMatch;
  while ((ubMatch = unbracketedRegex.exec(text)) !== null) {
    calls.push({
      name: ubMatch[1].toLowerCase(),
      rawArgs: (ubMatch[2] || ubMatch[3] || '').trim(),
      truncated: false
    });
  }

  return calls;
};

export const cleanModelOutput = (text) => {
  if (!text) return '';
  let cleaned = text;

  // Remove bracket-format tool calls by exact span (handles embedded code with ), ], quotes)
  const bracketCalls = findBracketToolCalls(cleaned);
  for (let i = bracketCalls.length - 1; i >= 0; i--) {
    const c = bracketCalls[i];
    cleaned = cleaned.slice(0, c.matchStart) + cleaned.slice(c.matchEnd);
  }

  // Remove any leftover explicit tool-call wrappers and other formats
  cleaned = cleaned.replace(/<\|tool_call_start\|>[\s\S]*?(?:<\|tool_call_end\|>|$)/gi, '');
  cleaned = cleaned.replace(/```(?:tool|tool_call)\s*[\r\n]+[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(
    new RegExp('(?:tool\\s*call\\s*:\\s*|Action\\s*:\\s*|Tool\\s*:\\s*)(' + TOOL_NAMES + ')[\\s\\S]*?(?=\\n\\n|$)', 'gi'),
    ''
  );
  return cleaned.trim();
};

export const extractPathArg = (rawArgs, baseFolderPath = '', baseFolderName = '') => {
  if (!rawArgs) return '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  let raw = pathMatch ? pathMatch[1].trim() : '';
  if (!raw) {
    const quoteMatch = /["']([^"']+)["']/.exec(rawArgs);
    raw = quoteMatch ? quoteMatch[1].trim() : rawArgs.replace(/[()]/g, '').trim();
  }
  return normalizeRelativePath(raw, baseFolderPath, baseFolderName);
};

// Strips one layer of surrounding quotes (triple, double or single) from an argument value.
const unquoteArgValue = (raw) => {
  let s = (raw || '').trim().replace(/,\s*$/, '').trim();
  const triple = /^("""|''')([\s\S]*?)\1$/.exec(s);
  if (triple) return triple[2];
  if (s.length >= 2 &&
      ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  // Unterminated / truncated: strip a leading quote if present, keep the rest
  return s.replace(/^["']/, '');
};

export const extractWriteArgs = (rawArgs, baseFolderPath = '', baseFolderName = '') => {
  let path = 'nuovo_file.txt';
  let content = '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  if (pathMatch) {
    path = normalizeRelativePath(pathMatch[1].trim(), baseFolderPath, baseFolderName) || 'nuovo_file.txt';
  }
  // content is (by the tool contract) the LAST argument — take everything after `content=`
  // and strip its surrounding quotes. This preserves code containing quotes, commas and parens.
  const cIdx = rawArgs.search(/content\s*=/i);
  if (cIdx !== -1) {
    const after = rawArgs.slice(cIdx).replace(/^content\s*=\s*/i, '');
    content = unquoteArgValue(after);
  }
  return { path, content };
};

export const extractEditArgs = (rawArgs, baseFolderPath = '', baseFolderName = '') => {
  let path = '';
  let target = '';
  let replacement = '';
  const pathMatch = /path\s*=\s*["']([^"']+)["']/i.exec(rawArgs);
  if (pathMatch) path = normalizeRelativePath(pathMatch[1].trim(), baseFolderPath, baseFolderName);

  const tIdx = rawArgs.search(/target\s*=/i);
  const rIdx = rawArgs.search(/replacement\s*=/i);
  if (tIdx !== -1) {
    const end = (rIdx !== -1 && rIdx > tIdx) ? rIdx : rawArgs.length;
    target = unquoteArgValue(rawArgs.slice(tIdx, end).replace(/^target\s*=\s*/i, ''));
  }
  if (rIdx !== -1) {
    replacement = unquoteArgValue(rawArgs.slice(rIdx).replace(/^replacement\s*=\s*/i, ''));
  }
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

  const isAbsolutePath = (p) => /^([a-zA-Z]:[\\/]|[\\/]{1,2})/.test((p || '').trim());
  const absoluteFolder = isAbsolutePath(folderPath) ? folderPath.trim() : '';

  // Writes a file to disk using the correct target: browser directory handle (direct PC disk),
  // then local backend bridge, then browser download as fallback.
  const writeFileToDisk = async (rawPath, content) => {
    const cleanRelPath = normalizeRelativePath(rawPath, folderPath, currentHandle?.name) || 'file.txt';
    const targetDir = folderPath || absoluteFolder || cleanFolder;

    // 1. Browser DirectoryHandle (Direct physical write into the selected folder on the user's PC)
    if (currentHandle) {
      try {
        const granted = await verifyAndRequestPermission(currentHandle, true);
        if (granted) {
          const res = await writeFileToDirectoryHandle(currentHandle, cleanRelPath, content);
          if (res.success) {
            return {
              written: true,
              output: `File '${cleanRelPath}' salvato direttamente nella cartella '${currentHandle.name}' sul tuo disco PC!`
            };
          }
        }
      } catch (e) {
        console.warn('DirectoryHandle write failed:', e);
      }
    }

    // 2. Direct Local Backend Disk Write (Native Python Agent on PC)
    if (targetDir) {
      for (const url of ['http://127.0.0.1:8000/api/workspace/save-file', '/api/workspace/save-file']) {
        try {
          const bridgeRes = await axios.post(url, {
            folder_path: targetDir,
            relative_path: cleanRelPath,
            content: content
          }, { timeout: 4000 });
          if (bridgeRes.data && bridgeRes.data.success && !bridgeRes.data.is_serverless) {
            return {
              written: true,
              output: `File '${cleanRelPath}' salvato direttamente sul disco in '${bridgeRes.data.full_path || targetDir}'!`
            };
          }
        } catch (e) {}
      }
    }

    // 3. Fallback: download into the browser's Downloads folder
    downloadFileDirectly(cleanRelPath, content);
    return {
      written: false,
      output: `File '${cleanRelPath}' scaricato nella cartella Download del computer. (💡 Per salvarlo direttamente dentro '${cleanFolder}' senza scaricarlo, seleziona la cartella con "Sfoglia Cartella dal PC").`
    };
  };

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
  let interactiveOptions = [];
  let narrative = ''; // running, cleaned explanation accumulated across all steps

  const appendNarrative = (text) => {
    const c = cleanModelOutput(text);
    if (c) narrative += (narrative ? '\n\n' : '') + c;
  };

  while (iteration < maxIterations) {
    iteration += 1;

    // --- One full model turn, auto-continuing if the output is cut off by the token limit ---
    let combined = '';
    let continuations = 0;
    let turnMessages = conversation;
    let turnFailed = null;

    while (true) {
      const baseContent = combined; // text already produced before this continuation call
      const llmRes = await streamOpenRouterChat({
        model,
        messages: turnMessages,
        temperature: 0.1,
        max_tokens: 8192,
        apiKey,
        onChunk: (chunk) => {
          if (chunk.reasoning) finalReasoning = chunk.reasoning;
          if (onStreamChunk) {
            const liveRaw = baseContent + (chunk.content || '');
            onStreamChunk({
              content: cleanModelOutput(liveRaw) || liveRaw,
              reasoning: chunk.reasoning || finalReasoning,
              rawContent: chunk.rawContent,
              iteration,
              isThinking: !!chunk.reasoning && !chunk.content
            });
          }
        }
      });

      if (!llmRes.success) {
        turnFailed = llmRes.error;
        break;
      }
      combined += llmRes.content || '';
      if (llmRes.reasoning) finalReasoning = llmRes.reasoning;

      // Continue only when the model stopped because it hit the output-token limit
      if (llmRes.finishReason === 'length' && continuations < 3 && combined.trim()) {
        continuations += 1;
        turnMessages = [
          ...conversation,
          { role: 'assistant', content: combined },
          { role: 'user', content: 'La tua risposta precedente è stata troncata per il limite di token. Continua ESATTAMENTE da dove ti eri fermato, senza ripetere nulla di già scritto. Se stavi scrivendo un file, completa il blocco tool fino alla parentesi finale.' }
        ];
        continue;
      }
      break;
    }

    if (turnFailed) {
      // If we already produced useful narrative, return it gracefully rather than only an error
      if (narrative) {
        return {
          success: true,
          content: `${narrative}\n\n⚠️ _(Elaborazione interrotta: ${turnFailed})_`,
          reasoning: finalReasoning,
          folder: cleanFolder,
          steps: stepsExecuted,
          steps_count: stepsExecuted.length,
          generatedFiles,
          options: interactiveOptions,
          model,
          iterations: iteration
        };
      }
      return {
        success: false,
        error: turnFailed,
        content: `⚠️ Errore AI: ${turnFailed}`,
        reasoning: finalReasoning,
        steps: stepsExecuted
      };
    }

    lastResponse = combined;

    const toolCalls = parseModelToolCalls(lastResponse);

    if (!toolCalls.length) {
      appendNarrative(lastResponse);
      finalAnswer = lastResponse;
      break;
    }

    // Keep the explanatory prose that accompanies this step's tool calls
    appendNarrative(lastResponse);

    const toolObservations = [];
    let stopRequested = false;

    for (const call of toolCalls) {
      let output = '';
      if (call.name === 'ask_user') {
        const { question, options } = extractQuestionAndOptions(call.rawArgs, lastResponse);
        output = `Domanda rivolta all'utente: ${question}`;
        stopRequested = true;
        finalAnswer = lastResponse;
        interactiveOptions = options;
      } else if (call.name === 'write_file') {
        const { path, content } = extractWriteArgs(call.rawArgs, folderPath, currentHandle?.name);
        generatedFiles.push({ path, content });
        const diskRes = await writeFileToDisk(path, content);
        output = diskRes.output;
      } else if (call.name === 'run_command') {
        const cmdMatch = /command\s*=\s*(?:"""([\s\S]*?)"""|'''([\s\S]*?)'''|"([\s\S]*?)"|'([\s\S]*?)')/i.exec(call.rawArgs);
        const cmd = cmdMatch ? (cmdMatch[1] || cmdMatch[2] || cmdMatch[3] || cmdMatch[4] || '') : call.rawArgs.replace(/^["']|["']$/g, '');
        try {
          const cmdRes = await runWorkspaceCommand(folderPath || cleanFolder, cmd, 30);
          if (cmdRes.success) {
            output = `[PowerShell STDOUT]:\n${cmdRes.stdout || 'Comando completato con successo.'}`;
          } else {
            output = `[PowerShell ERRORE]:\n${cmdRes.stderr || cmdRes.error || 'Errore esecuzione comando.'}`;
          }
        } catch (e) {
          output = `Errore comando: ${e.message}`;
        }
      } else if (call.name === 'read_file') {
        const path = extractPathArg(call.rawArgs, folderPath, currentHandle?.name);
        let readContent = null;
        if (folderPath) {
          for (const url of ['/api/workspace/file-content', 'http://127.0.0.1:8000/api/workspace/file-content']) {
            try {
              const res = await axios.get(url, { params: { folder_path: folderPath, relative_path: path }, timeout: 5000 });
              if (res.data && res.data.success && !res.data.is_serverless) {
                readContent = res.data.content;
                break;
              }
            } catch (e) {}
          }
        }
        if (readContent === null && currentHandle && path) {
          const res = await readFileFromDirectoryHandle(currentHandle, path);
          if (res.success) readContent = res.content;
        }
        output = readContent !== null ? `=== CONTENUTO DI ${path} ===\n${readContent}` : `File '${path}' non trovato o non accessibile.`;
      } else if (call.name === 'list_files') {
        let fileList = [];
        if (folderPath) {
          for (const url of ['/api/workspace/tree', 'http://127.0.0.1:8000/api/workspace/tree']) {
            try {
              const res = await axios.get(url, { params: { folder_path: folderPath }, timeout: 5000 });
              if (res.data && res.data.tree && !res.data.is_serverless) {
                const traverse = (items, pfx = '') => {
                  for (const item of items) {
                    const itemPath = pfx ? `${pfx}/${item.name}` : item.name;
                    if (item.is_dir) {
                      traverse(item.children || [], itemPath);
                    } else {
                      fileList.push(`${itemPath} (${item.size || 0} bytes)`);
                    }
                  }
                };
                traverse(res.data.tree);
                break;
              }
            } catch (e) {}
          }
        }
        if (!fileList.length && currentHandle) {
          const tree = await buildTreeFromDirectoryHandle(currentHandle);
          const traverse = (items, pfx = '') => {
            for (const item of items) {
              const itemPath = pfx ? `${pfx}/${item.name}` : item.name;
              if (item.is_dir) {
                traverse(item.children || [], itemPath);
              } else {
                fileList.push(`${itemPath} (${item.size || 0} bytes)`);
              }
            }
          };
          traverse(tree);
        }
        output = fileList.length > 0 ? `File presenti nella cartella:\n${fileList.map((f) => `- ${f}`).join('\n')}` : 'Nessun file trovato nella cartella.';
      } else if (call.name === 'edit_file') {
        const { path, target, replacement } = extractEditArgs(call.rawArgs, folderPath, currentHandle?.name);
        let origContent = null;
        if (folderPath) {
          for (const url of ['/api/workspace/file-content', 'http://127.0.0.1:8000/api/workspace/file-content']) {
            try {
              const res = await axios.get(url, { params: { folder_path: folderPath, relative_path: path }, timeout: 5000 });
              if (res.data && res.data.success && !res.data.is_serverless) {
                origContent = res.data.content;
                break;
              }
            } catch (e) {}
          }
        }
        if (origContent === null && currentHandle && path) {
          const res = await readFileFromDirectoryHandle(currentHandle, path);
          if (res.success) origContent = res.content;
        }

        if (origContent !== null) {
          const newContent = origContent.replace(target, replacement);
          const saveRes = await writeFileToDisk(path, newContent);
          output = saveRes.output;
        } else {
          output = `Impossibile modificare '${path}': file non trovato.`;
        }
      } else if (call.name === 'delete_file') {
        const path = extractPathArg(call.rawArgs, folderPath, currentHandle?.name);
        let deleted = false;
        if (folderPath) {
          for (const url of ['/api/workspace/delete-file', 'http://127.0.0.1:8000/api/workspace/delete-file']) {
            try {
              const res = await axios.post(url, { folder_path: folderPath, relative_path: path }, { timeout: 5000 });
              if (res.data && res.data.success && !res.data.is_serverless) {
                deleted = true;
                output = `File '${path}' eliminato con successo dal disco.`;
                break;
              }
            } catch (e) {}
          }
        }
        if (!deleted && currentHandle && path) {
          const res = await deleteFileFromDirectoryHandle(currentHandle, path);
          output = res.success ? `File '${path}' eliminato dal disco.` : `Errore: ${res.error}`;
        } else if (!deleted) {
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
      content: `Ecco i risultati delle operazioni eseguite sulla cartella:\n\n${toolObservations.join('\n\n')}\n\nProsegui con il prossimo step oppure formula la risposta finale completa in italiano.`
    });
  }

  let cleaned = cleanModelOutput(finalAnswer || lastResponse);

  // If cleaned output is empty after tool calls, assemble a complete, structured summary
  if (!cleaned && stepsExecuted.length > 0) {
    const summaryLines = ['✅ **Operazioni completate con successo nella cartella:**\n'];
    for (const st of stepsExecuted) {
      if (st.tool === 'write_file') {
        const p = extractPathArg(st.args) || 'file';
        summaryLines.push(`- 📄 **Creato/Aggiornato file:** \`${p}\``);
      } else if (st.tool === 'edit_file') {
        const p = extractPathArg(st.args) || 'file';
        summaryLines.push(`- ✏️ **Modificato file:** \`${p}\``);
      } else if (st.tool === 'delete_file') {
        const p = extractPathArg(st.args) || 'file';
        summaryLines.push(`- 🗑️ **Eliminato file:** \`${p}\``);
      } else if (st.tool === 'run_command') {
        summaryLines.push(`- 💻 **Comando eseguito:** \`${st.args}\``);
      } else if (st.tool === 'list_files') {
        summaryLines.push(`- 📁 **Scansione file completata**`);
      } else if (st.tool === 'read_file') {
        const p = extractPathArg(st.args) || 'file';
        summaryLines.push(`- 📖 **Letto file:** \`${p}\``);
      }
    }
    summaryLines.push(`\nTutti i file sono stati salvati direttamente nella cartella di lavoro sul tuo computer.`);
    cleaned = summaryLines.join('\n');
  } else if (narrative && !cleaned.includes(narrative.slice(0, 40))) {
    cleaned = `${narrative}\n\n${cleaned}`.trim();
  }

  // If interactive options weren't explicitly extracted from ask_user, check if text has questions/options
  if (!interactiveOptions.length && (cleaned.includes('?') || cleaned.toLowerCase().includes('opzion') || cleaned.toLowerCase().includes('come preferisci') || cleaned.toLowerCase().includes('cosa vorresti'))) {
    const { options } = extractQuestionAndOptions('', cleaned);
    if (options.length > 1) {
      interactiveOptions = options;
    }
  }

  return {
    success: true,
    content: cleaned || 'Operazione completata con successo.',
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
