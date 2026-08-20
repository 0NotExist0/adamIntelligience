// AI Studio Pro - Long-Term Persistent Memory System

const STORAGE_KEY = 'aistudio_long_term_memory';

const DEFAULT_MEMORIES = [
  {
    id: 'mem-1',
    text: 'L\'utente preferisce risposte in lingua italiana, chiare, ben strutturate in Markdown con codice pronto all\'uso.',
    category: 'Preferenze',
    source: 'Sistema',
    createdAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'mem-2',
    text: 'I modelli e i dataset creati vengono esportati e sincronizzati su Google Drive in formato standard JSON/JSONL.',
    category: 'Progetto',
    source: 'Sistema',
    createdAt: '2026-08-20T12:00:00Z'
  },
  {
    id: 'mem-3',
    text: 'L\'infrastruttura AI usa OpenRouter come gateway per modelli gratuiti (Llama 3.3 70B, DeepSeek R1, Gemini 2.0 Flash) e PRO.',
    category: 'Architettura',
    source: 'Sistema',
    createdAt: '2026-08-20T12:00:00Z'
  }
];

export const getMemories = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEMORIES));
      return DEFAULT_MEMORIES;
    }
    return JSON.parse(raw);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  return newMem;
};

export const deleteMemory = (id) => {
  const memories = getMemories().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  return memories;
};

export const clearAllMemories = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
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

  return `\n\n🧠 [MEMORIA A LUNGO TERMINE DELL'AI - INFORMAZIONI E REGOLE FONDAMENTALI]:
Prima di formulare la risposta, controlla SEMPRE e rispetta le seguenti informazioni e fatti importanti memorizzati:
${memoryLines}

REGOLA AUTO-MEMORIA: Se durante la conversazione l'utente ti dice qualcosa di importante, una preferenza, una regola o un'informazione chiave da ricordare per il futuro, salvala aggiungendo alla fine della risposta il blocco:
\`\`\`memory
{"fact": "informazione importante da memorizzare", "category": "Preferenze|Progetto|Regole"}
\`\`\`
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
  return content.replace(/```memory[\s\S]*?```/g, '').trim();
};
