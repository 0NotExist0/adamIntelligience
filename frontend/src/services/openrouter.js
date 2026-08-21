import axios from 'axios';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export const CURATED_POPULAR_MODELS = [
  // 100% FREE VERIFIED ACTIVE OPENROUTER MODELS
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Auto-Router',
    provider: 'OpenRouter',
    isFree: true,
    tag: '100% Uptime • Smart Auto Fallback',
    desc: 'Router intelligente di OpenRouter che instrada automaticamente verso i modelli gratuiti attualmente online con zero tempi di inattività.',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B IT',
    provider: 'Google',
    isFree: true,
    tag: 'Top Google Free • Alta Precisione',
    desc: 'Nuovissimo modello Google con eccellenti capacità di conversazione e ragionamento.',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5 Lightning',
    provider: 'NVIDIA',
    isFree: true,
    tag: 'Ultra Rapido • NVIDIA AI',
    desc: 'Velocità fulminea ed eccellente sintesi per risposte immediate.',
    context_length: 65536,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code',
    provider: 'Cohere',
    isFree: true,
    tag: 'Coding & Dev Specialist',
    desc: 'Specializzato nella scrittura, spiegazione e correzione di codice Python, JavaScript, React e script.',
    context_length: 32768,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'z-ai/glm-5.2:free',
    name: 'Z.ai GLM 5.2',
    provider: 'Z.ai',
    isFree: true,
    tag: 'Multitasking & Logica',
    desc: 'Modello performante per dialoghi articolati, traduzioni e logica.',
    context_length: 65536,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Google Gemma 4 26B A4B',
    provider: 'Google',
    isFree: true,
    tag: 'Google Gemma Free',
    desc: 'Modello compatto e potente per chat e compiti generali quotidiani.',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'OpenAI GPT-OSS 20B',
    provider: 'OpenAI',
    isFree: true,
    tag: 'Open Source',
    desc: 'Modello open weights versatile per compiti generali e generazione testi.',
    context_length: 32768,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    name: 'LiquidAI LFM 2.5',
    provider: 'LiquidAI',
    isFree: true,
    tag: 'Snello & Istantaneo',
    desc: 'Architettura snella e istantanea per compiti veloci.',
    context_length: 32768,
    pricing: { prompt: '0', completion: '0' }
  },

  // PAID / PRO FLAGSHIP MODELS
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B Instruct (PRO)',
    provider: 'Meta',
    isFree: false,
    tag: 'Top Performance Open Weight',
    desc: 'Versione standard di punta di Meta Llama 3.3 per compiti complessi ad alta intelligenza.',
    context_length: 131072,
    pricing: { prompt: '$0.12 / 1M', completion: '$0.30 / 1M' }
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (Chat PRO)',
    provider: 'DeepSeek',
    isFree: false,
    tag: 'Super Potente & Conveniente',
    desc: 'Modello MoE da 671B parametri con prestazioni ai vertici mondiali.',
    context_length: 64000,
    pricing: { prompt: '$0.14 / 1M', completion: '$0.28 / 1M' }
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    isFree: false,
    tag: 'Stato dell\'Arte Mondiale',
    desc: 'Il miglior modello per scrittura raffinata, coding complesso e ragionamento astratto.',
    context_length: 200000,
    pricing: { prompt: '$3.00 / 1M', completion: '$15.00 / 1M' }
  },
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    isFree: false,
    tag: 'Flagship Multimodale',
    desc: 'Il modello di punta di OpenAI con eccellenti capacità logiche e multilingua.',
    context_length: 128000,
    pricing: { prompt: '$2.50 / 1M', completion: '$10.00 / 1M' }
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'OpenAI',
    isFree: false,
    tag: 'Super Economico & Rapido',
    desc: 'Versione ad alte prestazioni ed estremamente economica di GPT-4o.',
    context_length: 128000,
    pricing: { prompt: '$0.15 / 1M', completion: '$0.60 / 1M' }
  }
];

export const POPULAR_MODELS = CURATED_POPULAR_MODELS;

let cachedModelsList = null;

export const fetchOpenRouterModelsCatalog = async () => {
  if (cachedModelsList && cachedModelsList.length > 50) {
    return cachedModelsList;
  }

  try {
    const response = await axios.get(`${OPENROUTER_API_BASE}/models`, { timeout: 15000 });
    const data = response.data?.data || [];

    if (data.length > 0) {
      const formatted = data.map((m) => {
        const isFree = m.id.endsWith(':free') || (
          Number(m.pricing?.prompt || 0) === 0 && 
          Number(m.pricing?.completion || 0) === 0
        );

        let provider = 'Other';
        if (m.id.startsWith('meta-llama/') || m.id.startsWith('meta/')) provider = 'Meta';
        else if (m.id.startsWith('openai/')) provider = 'OpenAI';
        else if (m.id.startsWith('anthropic/')) provider = 'Anthropic';
        else if (m.id.startsWith('google/')) provider = 'Google';
        else if (m.id.startsWith('deepseek/')) provider = 'DeepSeek';
        else if (m.id.startsWith('mistralai/')) provider = 'Mistral AI';
        else if (m.id.startsWith('qwen/')) provider = 'Alibaba Qwen';
        else if (m.id.startsWith('nvidia/')) provider = 'NVIDIA';
        else if (m.id.startsWith('cohere/')) provider = 'Cohere';
        else if (m.id.startsWith('microsoft/')) provider = 'Microsoft';
        else if (m.id.startsWith('amazon/')) provider = 'Amazon';

        const promptPrice = Number(m.pricing?.prompt || 0) * 1000000;
        const completionPrice = Number(m.pricing?.completion || 0) * 1000000;

        const pricingDisplay = isFree 
          ? '100% GRATUITO' 
          : `$${promptPrice.toFixed(2)} in / $${completionPrice.toFixed(2)} out (per 1M tokens)`;

        return {
          id: m.id,
          name: m.name || m.id,
          provider,
          isFree,
          desc: m.description || 'Nessuna descrizione disponibile.',
          context_length: m.context_length || 4096,
          pricingDisplay,
          rawPricing: m.pricing
        };
      });

      // Sort: Free models first, then popular providers
      formatted.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

      cachedModelsList = formatted;
      return formatted;
    }
  } catch (err) {
    console.warn('Fallback to curated models list:', err);
  }

  return CURATED_POPULAR_MODELS;
};

export const getOpenRouterKey = () => {
  return (localStorage.getItem('openrouter_api_key') || '').trim();
};

export const setOpenRouterKey = (key) => {
  if (key) {
    localStorage.setItem('openrouter_api_key', key.trim());
  } else {
    localStorage.removeItem('openrouter_api_key');
  }
};

import { buildMemoryContextPrompt, autoExtractMemoriesFromResponse, stripMemoryBlocks } from './memory';

// List of top verified active free fallback models in priority order
const RELIABLE_FREE_FALLBACKS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
  'cohere/north-mini-code:free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'liquid/lfm-2.5-2.6b:free'
];

export const sendOpenRouterChat = async ({
  model = 'openrouter/free',
  messages = [],
  temperature = 0.7,
  max_tokens = 1024,
  apiKey = null,
  enableMemory = true,
  allowFallback = true
}) => {
  const activeKey = apiKey || getOpenRouterKey();

  const headers = {
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin || 'https://aistudio.vercel.app',
    'X-Title': 'AI Studio Pro'
  };

  if (activeKey) {
    headers['Authorization'] = `Bearer ${activeKey}`;
  }

  // Inject Long-Term Memory
  let enrichedMessages = [...messages];
  if (enableMemory) {
    const memoryPrompt = buildMemoryContextPrompt();
    if (memoryPrompt) {
      const systemIdx = enrichedMessages.findIndex((m) => m.role === 'system');
      if (systemIdx >= 0) {
        enrichedMessages[systemIdx] = {
          role: 'system',
          content: `${enrichedMessages[systemIdx].content}${memoryPrompt}`
        };
      } else {
        enrichedMessages.unshift({
          role: 'system',
          content: `Sei un assistente AI intelligente e utile.${memoryPrompt}`
        });
      }
    }
  }

  if (!activeKey) {
    return {
      success: false,
      error: '⚠️ Chiave API OpenRouter mancante! Inserisci una chiave API gratuita (da openrouter.ai/keys) nelle Impostazioni.'
    };
  }

  const executeRequest = async (targetModel) => {
    return await axios.post(
      `${OPENROUTER_API_BASE}/chat/completions`,
      {
        model: targetModel,
        messages: enrichedMessages,
        temperature,
        max_tokens
      },
      { headers, timeout: 60000 }
    );
  };

  try {
    let currentModel = model || 'openrouter/free';
    
    // Automatically sanitize deprecated or decommissioned model slugs
    if (
      currentModel.includes('llama-3.3-70b-instruct:free') || 
      currentModel.includes('gemini-flash-1.5-8b:free') ||
      currentModel.includes('gemini-2.0-flash-exp:free')
    ) {
      currentModel = 'openrouter/free';
    }

    let response = null;
    let successfulModel = currentModel;
    const candidateModels = allowFallback 
      ? [currentModel, ...RELIABLE_FREE_FALLBACKS.filter((f) => f !== currentModel)]
      : [currentModel];

    let lastError = null;
    for (const targetModel of candidateModels) {
      try {
        response = await executeRequest(targetModel);
        successfulModel = targetModel;
        break; // Successfully got response
      } catch (reqErr) {
        lastError = reqErr;
        const errMsg = reqErr.response?.data?.error?.message || reqErr.message || '';
        const isFallbackable = errMsg.toLowerCase().includes('no endpoints found') ||
                              errMsg.toLowerCase().includes('unavailable for free') || 
                              errMsg.toLowerCase().includes('use this slug instead') ||
                              errMsg.toLowerCase().includes('not found') ||
                              errMsg.toLowerCase().includes('rate limit') ||
                              errMsg.toLowerCase().includes('temporarily unavailable') ||
                              reqErr.response?.status === 404 ||
                              reqErr.response?.status === 400 ||
                              reqErr.response?.status === 429;

        if (!allowFallback || !isFallbackable) {
          break; // Stop immediately for auth/key errors (401)
        }
        console.warn(`[OpenRouter Fallback] Il modello "${targetModel}" non è al momento online. Tentativo con fallback automatico...`);
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    if (response && response.data && response.data.choices && response.data.choices[0]) {
      const rawContent = response.data.choices[0].message.content || '';
      
      // Auto-extract and save any memories learned by AI
      let savedMemories = [];
      if (enableMemory) {
        savedMemories = autoExtractMemoriesFromResponse(rawContent);
      }

      const cleanContent = stripMemoryBlocks(rawContent);

      return {
        success: true,
        content: cleanContent,
        rawContent,
        savedMemories,
        model: response.data.model || successfulModel,
        usage: response.data.usage || {}
      };
    } else {
      return {
        success: false,
        error: 'Nessuna risposta ricevuta dal modello OpenRouter'
      };
    }
  } catch (err) {
    const status = err.response?.status;
    const rawMsg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || '';

    let userFriendlyMsg = rawMsg;
    if (status === 401 || rawMsg.toLowerCase().includes('user not found') || rawMsg.toLowerCase().includes('api key')) {
      userFriendlyMsg = 'Chiave API OpenRouter non valida. Verifica la tua chiave su openrouter.ai/keys e incollala nelle Impostazioni.';
    } else if (rawMsg.toLowerCase().includes('unavailable for free') || rawMsg.toLowerCase().includes('use this slug instead')) {
      userFriendlyMsg = 'Questo modello non è più disponibile gratuitamente (:free) su OpenRouter. È stato selezionato automaticamente Google Gemini 2.0 Flash o DeepSeek R1.';
    } else if (status === 402 || rawMsg.toLowerCase().includes('credits') || rawMsg.toLowerCase().includes('payment')) {
      userFriendlyMsg = 'Crediti insufficienti per questo modello PRO a pagamento. Per usare modelli gratuiti a costo €0.00, seleziona Google Gemini 2.0 Flash (:free), DeepSeek R1 (:free) o Qwen Coder (:free).';
    } else if (status === 429) {
      userFriendlyMsg = 'Limite temporaneo di richieste al minuto raggiunto sui server gratuiti di OpenRouter. Riprova tra qualche secondo.';
    }

    return {
      success: false,
      error: `Errore OpenRouter: ${userFriendlyMsg}`
    };
  }
};

