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

/**
 * Runs the autonomous Workspace AI Agent task loop
 */
export const runWorkspaceAgentTask = async ({
  folderPath,
  taskPrompt,
  messages = [],
  model = 'openrouter/free',
  maxIterations = 5
}) => {
  try {
    const res = await axios.post('/api/workspace/agent-task', {
      folder_path: folderPath,
      task_prompt: taskPrompt,
      messages: messages,
      model: model,
      max_iterations: maxIterations
    });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.detail || err.message;
    return {
      success: false,
      error: msg,
      content: `⚠️ Errore esecuzione Agente Workspace: ${msg}`
    };
  }
};

/**
 * Web File System Access API picker for picking local folder directly from browser
 */
export const pickDirectoryNative = async () => {
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await window.showDirectoryPicker();
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
