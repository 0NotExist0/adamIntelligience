// Local & Google Drive Storage Management System

const STORAGE_KEYS = {
  MODELS: 'aistudio_custom_models',
  CHATBOTS: 'aistudio_custom_chatbots',
  DATASETS: 'aistudio_custom_datasets',
  SETTINGS: 'aistudio_settings'
};

const DEFAULT_MODELS = [
  {
    id: 'model-adam-core',
    name: 'Adam AI Assistant v1.0',
    baseModel: 'meta-llama/llama-3.3-70b-instruct:free',
    description: 'Assistente AI generale ottimizzato per produttività, analisi e problem solving in italiano.',
    systemPrompt: 'Sei Adam, un assistente AI avanzato, brillante, preciso e amichevole. Rispondi con grande chiarezza, formattando in Markdown ed evidenziando i punti chiave.',
    tags: ['Llama 3.3', 'General', 'Italiano'],
    temperature: 0.7,
    maxTokens: 1024,
    createdAt: '2026-08-20T10:00:00Z',
    driveSync: true,
    driveFileName: 'Adam_AI_Assistant_v1.0.json'
  },
  {
    id: 'model-dev-expert',
    name: 'Python & React Code Master',
    baseModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
    description: 'Esperto di programmazione Fullstack: React 19, Vite, Tailwind CSS, Python FastAPI e architetture cloud.',
    systemPrompt: 'Sei un Senior Software Architect specializzato in Python, React, Tailwind CSS e modern web engineering. Fornisci sempre codice pulito, modulare e pronto all\'uso.',
    tags: ['Qwen Coder', 'Python', 'React', 'Dev'],
    temperature: 0.3,
    maxTokens: 2048,
    createdAt: '2026-08-20T12:00:00Z',
    driveSync: true,
    driveFileName: 'Python_React_Code_Master.json'
  }
];

const DEFAULT_CHATBOTS = [
  {
    id: 'bot-adam',
    name: 'Adam Chatbot',
    avatar: '🤖',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    title: 'Adam AI Chatbot',
    systemPrompt: 'Sei Adam, un chatbot AI amichevole, intelligente e utile. Parla in italiano.',
    createdAt: '2026-08-20T14:00:00Z',
    driveSync: true
  }
];

const DEFAULT_DATASETS = [
  {
    id: 'dataset-qa-ita',
    name: 'Domande e Risposte AI Italiano',
    format: 'JSONL',
    rowsCount: 25,
    description: 'Dataset di istruzioni e risposte per fine-tuning di modelli conversazionali in lingua italiana.',
    data: [
      { instruction: "Spiega come funziona OpenRouter", output: "OpenRouter è un gateway AI unificato che fornisce accesso a centinaia di modelli LLM con una sola interfaccia." },
      { instruction: "Come salvare un modello su Google Drive?", output: "Puoi esportare la configurazione JSON o i pesi del modello e caricarli direttamente nella tua cartella di Google Drive." }
    ],
    createdAt: '2026-08-20T11:00:00Z',
    driveSync: true
  }
];

import { getUserScopedKey } from './auth';

// --- MODELS ---
export const getCustomModels = () => {
  try {
    const key = getUserScopedKey(STORAGE_KEYS.MODELS);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : DEFAULT_MODELS;
  } catch (e) {
    return DEFAULT_MODELS;
  }
};

export const saveCustomModel = (model) => {
  const models = getCustomModels();
  const existingIdx = models.findIndex((m) => m.id === model.id);
  const updatedModel = {
    ...model,
    id: model.id || `model-${Date.now()}`,
    createdAt: model.createdAt || new Date().toISOString(),
    driveSync: true,
    driveFileName: `${model.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
  };

  if (existingIdx >= 0) {
    models[existingIdx] = updatedModel;
  } else {
    models.unshift(updatedModel);
  }

  const key = getUserScopedKey(STORAGE_KEYS.MODELS);
  localStorage.setItem(key, JSON.stringify(models));
  return updatedModel;
};

export const deleteCustomModel = (id) => {
  const models = getCustomModels().filter((m) => m.id !== id);
  const key = getUserScopedKey(STORAGE_KEYS.MODELS);
  localStorage.setItem(key, JSON.stringify(models));
  return models;
};

// --- CHATBOTS ---
export const getCustomChatbots = () => {
  try {
    const key = getUserScopedKey(STORAGE_KEYS.CHATBOTS);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : DEFAULT_CHATBOTS;
  } catch (e) {
    return DEFAULT_CHATBOTS;
  }
};

export const saveCustomChatbot = (chatbot) => {
  const chatbots = getCustomChatbots();
  const existingIdx = chatbots.findIndex((c) => c.id === chatbot.id);
  const updatedChatbot = {
    ...chatbot,
    id: chatbot.id || `bot-${Date.now()}`,
    createdAt: chatbot.createdAt || new Date().toISOString(),
    driveSync: true
  };

  if (existingIdx >= 0) {
    chatbots[existingIdx] = updatedChatbot;
  } else {
    chatbots.unshift(updatedChatbot);
  }

  const key = getUserScopedKey(STORAGE_KEYS.CHATBOTS);
  localStorage.setItem(key, JSON.stringify(chatbots));
  return updatedChatbot;
};

export const deleteCustomChatbot = (id) => {
  const chatbots = getCustomChatbots().filter((c) => c.id !== id);
  const key = getUserScopedKey(STORAGE_KEYS.CHATBOTS);
  localStorage.setItem(key, JSON.stringify(chatbots));
  return chatbots;
};

// --- DATASETS ---
export const getCustomDatasets = () => {
  try {
    const key = getUserScopedKey(STORAGE_KEYS.DATASETS);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : DEFAULT_DATASETS;
  } catch (e) {
    return DEFAULT_DATASETS;
  }
};

export const saveCustomDataset = (dataset) => {
  const datasets = getCustomDatasets();
  const existingIdx = datasets.findIndex((d) => d.id === dataset.id);
  const updatedDataset = {
    ...dataset,
    id: dataset.id || `dataset-${Date.now()}`,
    createdAt: dataset.createdAt || new Date().toISOString(),
    rowsCount: Array.isArray(dataset.data) ? dataset.data.length : (dataset.rowsCount || 1),
    driveSync: true
  };

  if (existingIdx >= 0) {
    datasets[existingIdx] = updatedDataset;
  } else {
    datasets.unshift(updatedDataset);
  }

  const key = getUserScopedKey(STORAGE_KEYS.DATASETS);
  localStorage.setItem(key, JSON.stringify(datasets));
  return updatedDataset;
};

export const deleteCustomDataset = (id) => {
  const datasets = getCustomDatasets().filter((d) => d.id !== id);
  const key = getUserScopedKey(STORAGE_KEYS.DATASETS);
  localStorage.setItem(key, JSON.stringify(datasets));
  return datasets;
};

// --- GOOGLE DRIVE EXPORT UTILITIES ---
export const downloadJSONFile = (filename, dataObj) => {
  const jsonStr = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadJSONLFile = (filename, dataArray) => {
  const lines = dataArray.map((row) => JSON.stringify(row)).join('\n');
  const blob = new Blob([lines], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.jsonl') ? filename : `${filename}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const openGoogleDriveFolder = () => {
  window.open('https://drive.google.com/drive/my-drive', '_blank');
};
