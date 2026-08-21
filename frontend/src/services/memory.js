// AI Studio Pro - Long-Term Persistent Memory System

const STORAGE_KEY = 'aistudio_long_term_memory';

const DEFAULT_MEMORIES = [
  {
    id: 'mem-1',
    text: 'L\'utente preferisce risposte in lingua italiana, complete, chiare, ben strutturate in Markdown con codice pronto all\'uso e senza interruzioni.',
    category: 'Preferenze',
    source: 'Sistema',
    createdAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'mem-2',
    text: 'I modelli e i dataset creati vengono esportati e sincronizzati sul Google Drive personale dell\'utente in formato standard JSON/JSONL.',
    category: 'Progetto',
    source: 'Sistema',
    createdAt: '2026-08-20T12:00:00Z'
  }
];

import { getUserScopedKey, getCurrentUser } from './auth';

export const getMemories = () => {
  try {
    const key = getUserScopedKey(STORAGE_KEY);
    const raw = localStorage.getItem(key);
    const currentUser = getCurrentUser();
    let memories = raw ? JSON.parse(raw) : null;
    let needsSave = false;

    if (!memories || !Array.isArray(memories) || memories.length === 0) {
      memories = [
        ...DEFAULT_MEMORIES,
        ...(currentUser ? [{
          id: `mem-user-init`,
          text: `L'utente connesso è ${currentUser.name} (${currentUser.email}). Il suo account Google Drive personale è collegato per il salvataggio dei dati.`,
          category: 'Profilo Utente',
          source: 'Google Auth',
          createdAt: new Date().toISOString()
        }] : [])
      ];
      needsSave = true;
    } else {
      // Auto-clean any old fake emails (utente.google@gmail.com)
      memories = memories.map((m) => {
        if (m.text && m.text.includes('utente.google@gmail.com')) {
          needsSave = true;
          const actualEmail = currentUser?.email || 'personale';
          return {
            ...m,
            text: m.text.replace(/utente\.google@gmail\.com/g, actualEmail)
          };
        }
        return m;
      });
    }

    if (needsSave) {
      localStorage.setItem(key, JSON.stringify(memories));
    }
    return memories;
  } catch (e) {
    return DEFAULT_MEMORIES;
  }
};

export const saveMemory = (text, category = 'Generale', source = 'Utente / AI') => {
  if (!text || !text.trim()) return null;
  const memories = getMemories();
  
  // Avoid exact duplicates
  const cleanText = text.trim();
  const exists = memories.some((m) => m.text.toLowerCase() === cleanText.toLowerCase());
  if (exists) return null;

  const newMem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    text: cleanText,
    category: category.trim() || 'Generale',
    source,
    createdAt: new Date().toISOString()
  };

  memories.unshift(newMem);
  const key = getUserScopedKey(STORAGE_KEY);
  localStorage.setItem(key, JSON.stringify(memories));
  return newMem;
};

export const deleteMemory = (id) => {
  const memories = getMemories().filter((m) => m.id !== id);
  const key = getUserScopedKey(STORAGE_KEY);
  localStorage.setItem(key, JSON.stringify(memories));
  return memories;
};

export const clearAllMemories = () => {
  const key = getUserScopedKey(STORAGE_KEY);
  localStorage.setItem(key, JSON.stringify([]));
  return [];
};

/**
 * Builds the memory injection block to be prepended into the system prompt.
 */
export const buildMemoryContextPrompt = () => {
  const memories = getMemories();
  if (!memories || memories.length === 0) return '';

  const memoryLines = memories
    .map((m, idx) => `${idx + 1}. [${m.category}] ${m.text}`)
    .join('\n');

  return `\n\n🧠 [MEMORIA A LUNGO TERMINE - INFORMAZIONI E REGOLE SALVATE]:
Controlla SEMPRE e rispetta le seguenti informazioni e fatti memorizzati per l'utente:
${memoryLines}
`;
};

/**
 * Parses any ```memory {...} ``` blocks in AI output and auto-saves them.
 */
export const autoExtractMemoriesFromResponse = (responseContent) => {
  if (!responseContent) return [];
  const memoryRegex = /```memory\s*([\s\S]*?)\s*```/g;
  let match;
  const extracted = [];

  while ((match = memoryRegex.exec(responseContent)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      if (data.fact) {
        const saved = saveMemory(data.fact, data.category || 'Appreso', 'AI Auto-Extract');
        if (saved) extracted.push(saved);
      }
    } catch (e) {
      // JSON parse fallback
      const textOnly = match[1].trim().replace(/[{}"]/g, '');
      if (textOnly) {
        const saved = saveMemory(textOnly, 'Appreso', 'AI Auto-Extract');
        if (saved) extracted.push(saved);
      }
    }
  }

  return extracted;
};

export const stripMemoryBlocks = (content) => {
  if (!content) return '';
  return content
    .replace(/```memory[\s\S]*?```/gi, '')
    .replace(/```memory[\s\S]*$/gi, '')
    .trim();
};
