import axios from 'axios';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

export const POPULAR_MODELS = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta Llama 3.3 70B Instruct',
    provider: 'Meta',
    tag: '100% FREE • Consigliato',
    desc: 'Il modello open source più potente di Meta con 70B parametri.',
    badge: 'FREE Power',
    isFree: true,
    color: 'border-purple-500/40 text-purple-300 bg-purple-500/10'
  },
  {
    id: 'deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 Reasoning',
    provider: 'DeepSeek',
    tag: '100% FREE • Ragionamento Deep',
    desc: 'Specializzato in ragionamento logico, matematica e deduzione complessa.',
    badge: 'Top Reasoning',
    isFree: true,
    color: 'border-blue-500/40 text-blue-300 bg-blue-500/10'
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Google Gemini 2.0 Flash',
    provider: 'Google',
    tag: '100% FREE • Velocità Lampo',
    desc: 'Ultima generazione Google per risposte istantanee con contesto enorme.',
    badge: 'Ultra Fast',
    isFree: true,
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B',
    provider: 'Alibaba',
    tag: '100% FREE • Coding & Script',
    desc: 'Specializzato in codice, Python, JavaScript, algoritmi e sviluppo software.',
    badge: 'Dev Specialist',
    isFree: true,
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10'
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct',
    provider: 'Mistral AI',
    tag: '100% FREE • Leggero & Rapido',
    desc: 'Modello versatile e conciso per task veloci e spiegazioni brevi.',
    badge: 'Free Classic',
    isFree: true,
    color: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    tag: 'Stato dell\'Arte Mondiale',
    desc: 'Il punto di riferimento globale per qualità di scrittura, comprensione ed empatia.',
    badge: 'PRO Anthropic',
    isFree: false,
    color: 'border-orange-500/40 text-orange-300 bg-orange-500/10'
  },
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    tag: 'Flagship Multimodale',
    desc: 'Il modello di punta di OpenAI per compiti complessi.',
    badge: 'PRO OpenAI',
    isFree: false,
    color: 'border-teal-500/40 text-teal-300 bg-teal-500/10'
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'OpenAI',
    tag: 'Economico & Veloce',
    desc: 'Versione snella e super performante di GPT-4o.',
    badge: 'PRO Budget',
    isFree: false,
    color: 'border-teal-500/30 text-teal-200 bg-teal-500/5'
  }
];

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

export const sendOpenRouterChat = async ({
  model = 'meta-llama/llama-3.3-70b-instruct:free',
  messages = [],
  temperature = 0.7,
  max_tokens = 1024,
  apiKey = null
}) => {
  const activeKey = apiKey || getOpenRouterKey();

  // Try direct OpenRouter API
  const headers = {
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin || 'https://aistudio.vercel.app',
    'X-Title': 'AI Studio Pro'
  };

  if (activeKey) {
    headers['Authorization'] = `Bearer ${activeKey}`;
  }

  try {
    const response = await axios.post(
      `${OPENROUTER_API_BASE}/chat/completions`,
      {
        model,
        messages,
        temperature,
        max_tokens
      },
      { headers, timeout: 60000 }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        content: response.data.choices[0].message.content,
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
    const errDetail = err.response?.data?.error?.message || err.response?.data?.detail || err.message;
    return {
      success: false,
      error: `Errore OpenRouter: ${errDetail}`
    };
  }
};
