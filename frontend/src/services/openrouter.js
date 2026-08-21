import axios from 'axios';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export const CURATED_POPULAR_MODELS = [
  // FREE MODELS
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta Llama 3.3 70B Instruct',
    provider: 'Meta',
    isFree: true,
    tag: 'Consigliato • Massima Intelligenza',
    desc: 'Il miglior modello open-weight di Meta per conversazioni brillanti e compiti complessi.',
    context_length: 131072,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 Reasoning',
    provider: 'DeepSeek',
    isFree: true,
    tag: 'Top Reasoning • Logica & Matematica',
    desc: 'Specializzato in ragionamento profondo, step-by-step thinking e deduzione scientifica.',
    context_length: 65536,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash',
    provider: 'Google',
    isFree: true,
    tag: 'Ultra Fast • Finestra 1M',
    desc: 'Nuovissima generazione Google con velocità istantanea e comprensione contestuale enorme.',
    context_length: 1048576,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Alibaba Qwen',
    isFree: true,
    tag: 'Coding & Dev Specialist',
    desc: 'Il punto di riferimento open source per scrittura codice, script e automazioni.',
    context_length: 32768,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct',
    provider: 'Mistral AI',
    isFree: true,
    tag: 'Leggero & Veloce',
    desc: 'Modello classico versatile per risposte sintetiche e compiti quotidiani.',
    context_length: 32768,
    pricing: { prompt: '0', completion: '0' }
  },
  {
    id: 'google/gemini-flash-1.5-8b:free',
    name: 'Google Gemini Flash 1.5 8B',
    provider: 'Google',
    isFree: true,
    tag: 'Snello & Rapido',
    desc: 'Modello ultraleggero ideale per compiti ripetitivi e velocità massima.',
    context_length: 1000000,
    pricing: { prompt: '0', completion: '0' }
  },

  // PAID / PRO FLAGSHIP MODELS
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
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3 (Chat)',
    provider: 'DeepSeek',
    isFree: false,
    tag: 'Super Potente & Conveniente',
    desc: 'Modello MoE da 671B parametri con prestazioni ai vertici mondiali.',
    context_length: 64000,
    pricing: { prompt: '$0.14 / 1M', completion: '$0.28 / 1M' }
  },
  {
    id: 'mistralai/mistral-large-2411',
    name: 'Mistral Large 2411',
    provider: 'Mistral AI',
    isFree: false,
    tag: 'Top Performance Europea',
    desc: 'Modello flagship di Mistral AI specializzato in ragionamento e multilingualità.',
    context_length: 128000,
    pricing: { prompt: '$2.00 / 1M', completion: '$6.00 / 1M' }
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

export const sendOpenRouterChat = async ({
  model = 'meta-llama/llama-3.3-70b-instruct:free',
  messages = [],
  temperature = 0.7,
  max_tokens = 1024,
  apiKey = null,
  enableMemory = true
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
      error: '⚠️ Chiave API OpenRouter mancante! I modelli contrassegnati con ":free" (DeepSeek R1, Llama 3.3, Gemini 2.0) sono al 100% GRATUITI a costo €0.00, ma OpenRouter richiede comunque una Chiave API gratuita per autorizzare le richieste. Puoi generarne una in 30 secondi gratis su openrouter.ai/keys (non serve carta di credito) e incollarla qui cliccando su "Impostazioni & Chiavi".'
    };
  }

  try {
    const response = await axios.post(
      `${OPENROUTER_API_BASE}/chat/completions`,
      {
        model,
        messages: enrichedMessages,
        temperature,
        max_tokens
      },
      { headers, timeout: 60000 }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
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
        model: response.data.model || model,
        usage: response.data.usage || {}
      };
    } else {
      return {
        success: false,
        error: 'Nessuna risposta ricevuta dal modello'
      };
    }
  } catch (err) {
    const status = err.response?.status;
    const rawMsg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || '';

    let userFriendlyMsg = rawMsg;
    if (status === 401 || rawMsg.toLowerCase().includes('user not found') || rawMsg.toLowerCase().includes('api key')) {
      userFriendlyMsg = 'Chiave API OpenRouter non valida o non inserita. Genera una chiave gratuita su openrouter.ai/keys (a costo 0€) e salvala nell\'app.';
    } else if (status === 402 || rawMsg.toLowerCase().includes('credits') || rawMsg.toLowerCase().includes('payment')) {
      if (model.includes(':free')) {
        userFriendlyMsg = 'Questo modello è gratuito (:free), ma i server gratuiti di OpenRouter sono temporaneamente congestionati dal traffico mondiale o il limite orario gratuito del tuo account è stato raggiunto. Prova a selezionare un altro modello gratuito (es. Google Gemini 2.0 Flash o DeepSeek R1).';
      } else {
        userFriendlyMsg = `Il modello "${model}" è un modello PRO a pagamento e richiede crediti sul tuo account OpenRouter. Se desideri usare modelli a costo zero, seleziona uno dei modelli con il tag ":free" (es. Llama 3.3 70B :free, DeepSeek R1 :free, Gemini 2.0 :free).`;
      }
    } else if (status === 429) {
      userFriendlyMsg = 'Limite di richieste al minuto raggiunto sui nodi gratuiti di OpenRouter. Riprova tra pochi secondi o passa a un altro modello gratuito.';
    }

    return {
      success: false,
      error: `Errore OpenRouter: ${userFriendlyMsg}`
    };
  }
};
