import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Sparkles, 
  Bot, 
  User, 
  Sliders, 
  Cpu,
  Layers,
  Gift,
  Globe,
  Database,
  ShieldCheck,
  CheckCircle2,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CURATED_POPULAR_MODELS, sendOpenRouterChat, streamOpenRouterChat } from '../services/openrouter';
import { runAgentChatPipeline, runAgentChatPipelineStream } from '../services/agentPipeline';
import ModelPickerModal from '../components/ModelPickerModal';
import AgentPipelineBadge from '../components/AgentPipelineBadge';
import WebSearchInspectorModal from '../components/WebSearchInspectorModal';
import { useToast } from '../components/Toast';

export default function InferencePlayground({ initialModel }) {
  const [selectedModel, setSelectedModel] = useState(() => {
    const raw = initialModel || 'openrouter/free';
    return (raw.includes('llama-3.3-70b-instruct:free') || raw.includes('gemini-flash-1.5-8b:free')) ? 'openrouter/free' : raw;
  });
  const [customModel, setCustomModel] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isWebInspectorOpen, setIsWebInspectorOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo **Agente AI Avanzato** potenziato da **OpenRouter**, calibrazione dinamica dei parametri, **Streaming Live delle Risposte e dei Pensieri**, **Fact-Checking Web in tempo reale** e **Memoria a Lungo Termine prioritaria**.\n\nFai qualsiasi domanda o chiedi codice: calcolerò in tempo reale i parametri ottimali, mostrerò il flusso dei pensieri in streaming e genererò risposte complete senza interruzioni!',
      agentTrace: {
        calibratedTemperature: 0.2,
        calibratedMaxTokens: 8192,
        taskType: 'general_qa',
        reasoningStrategy: 'Streaming in tempo reale & Priorità al Memory Vault',
        webSources: [],
        webSearchPerformed: false,
        prioritizedMemoriesCount: 2,
        confidenceScore: '100% (Verificato)'
      }
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(true);
  const [forceWebSearch, setForceWebSearch] = useState(false);
  const [currentPipelineStep, setCurrentPipelineStep] = useState(null);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [collapsedThoughts, setCollapsedThoughts] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentPipelineStep]);

  const toggleThoughtCollapse = (index) => {
    setCollapsedThoughts((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userPromptText = inputPrompt.trim();
    const userMessage = { role: 'user', content: userPromptText };
    const placeholderAssistant = { 
      role: 'assistant', 
      content: '', 
      reasoning: '', 
      isStreaming: true 
    };

    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, placeholderAssistant]);
    setInputPrompt('');
    setLoading(true);
    setCurrentPipelineStep({ stage: 'init', label: '🚀 Avvio pipeline Agente Intelligente...', progress: 10 });

    const activeModelId = selectedModel === 'custom' ? customModel.trim() : selectedModel;

    try {
      if (isAgentMode) {
        // --- AUTONOMOUS AGENT PIPELINE WITH REAL-TIME STREAMING ---
        const agentResult = await runAgentChatPipelineStream({
          prompt: userPromptText,
          messages: newMessages.filter((m, idx) => !(idx === 0 && m.role === 'assistant')),
          model: activeModelId,
          forceWebSearch: forceWebSearch,
          onProgressStep: (step) => {
            setCurrentPipelineStep(step);
            if (step.meta) {
              setTemperature(step.meta.temperature);
              setMaxTokens(step.meta.max_tokens);
            }
          },
          onStreamChunk: ({ content, reasoning, agentTrace, isError }) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: isError ? `⚠️ ${content}` : content,
                  reasoning: reasoning || updated[lastIdx].reasoning || '',
                  agentTrace: agentTrace || updated[lastIdx].agentTrace,
                  isStreaming: true
                };
              }
              return updated;
            });
          }
        });

        // Finalize state
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: agentResult.success ? agentResult.content : `⚠️ ${agentResult.error}`,
              reasoning: agentResult.reasoning || updated[lastIdx].reasoning || '',
              agentTrace: agentResult.agentTrace,
              isStreaming: false
            };
          }
          return updated;
        });
      } else {
        // --- MANUAL STREAMING MODE ---
        const apiMessages = newMessages
          .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
          .map((m) => ({ role: m.role, content: m.content }));

        const streamRes = await streamOpenRouterChat({
          model: activeModelId,
          messages: apiMessages,
          max_tokens: maxTokens,
          temperature: temperature,
          onChunk: ({ content, reasoning, isError }) => {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: isError ? `⚠️ ${content}` : content,
                  reasoning: reasoning || updated[lastIdx].reasoning || '',
                  isStreaming: true
                };
              }
              return updated;
            });
          }
        });

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: streamRes.success ? streamRes.content : `⚠️ ${streamRes.error}`,
              reasoning: streamRes.reasoning || updated[lastIdx].reasoning || '',
              isStreaming: false
            };
          }
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `❌ Errore durante lo streaming: ${err.message}`,
            isStreaming: false
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      setCurrentPipelineStep(null);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    addToast('Testo copiato negli appunti!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat azzerata. Seleziona un modello e inizia una nuova conversazione!'
      }
    ]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Playground AI OpenRouter</h1>
            <p className="text-xs text-slate-400">Testa oltre 400 modelli divisi tra Gratuiti (FREE) e PRO a Pagamento</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsWebInspectorOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Apri console di ispezione e fact-checking web"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Console Fact-Checking Web</span>
          </button>

          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Sfoglia Catalogo (400+ Modelli)</span>
          </button>

          <button
            onClick={clearChat}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Azzera</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left: Settings Panel */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6 overflow-y-auto">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Modello Attivo</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="text-[11px] text-purple-400 hover:text-purple-300 hover:underline font-semibold"
                >
                  Cambia
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-300">
                    {selectedModel.split('/')[0]}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    selectedModel.includes(':free') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {selectedModel.includes(':free') ? '100% FREE' : 'PRO / Paid'}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">
                  {selectedModel.split('/')[1] || selectedModel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Sfoglia 400+ Modelli Divisi</span>
              </button>
            </div>

            {/* Autonomous Agent Mode Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-900/30 to-indigo-950/40 border border-purple-500/40 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/30">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">Modalità Agente AI</h3>
                    <p className="text-[10px] text-purple-300">Calibrazione & Verifica</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAgentMode}
                    onChange={(e) => setIsAgentMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {isAgentMode 
                  ? 'Il modello legge il prompt prima di rispondere, calcola automaticamente Temperatura e Token ottimali, effettua fact-checking sul Web e applica la Memoria con Priorità Assoluta.'
                  : 'Modalità manuale classica: i parametri qui sotto vengono usati staticamente.'}
              </p>

              {isAgentMode && (
                <div className="pt-2 border-t border-purple-500/20 flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={forceWebSearch}
                      onChange={(e) => setForceWebSearch(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Forza Fact-Checking Web sempre</span>
                  </label>

                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Temp Dinamica:</span>
                      <strong className="text-cyan-300 font-mono">{temperature}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Token Dinamici:</span>
                      <strong className="text-indigo-300 font-mono">{maxTokens}</strong>
                    </div>
                    <div className="flex justify-between text-amber-300">
                      <span>Memoria Vault:</span>
                      <strong>Priorità 1 Assoluta</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hyperparameters Sliders (Only if not in agent mode or for manual override) */}
            {!isAgentMode && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Parametri Manuali</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Temperature</span>
                    <span className="font-mono text-purple-300 font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Max Tokens (Lunghezza Risposta)</span>
                    <span className="font-mono text-purple-300 font-bold">{maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="16384"
                    step="512"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>512</span>
                    <span>8192 (Default)</span>
                    <span>16384 (Massimo)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tutti i modelli con etichetta <strong>FREE</strong> sono 100% gratuiti.</span>
          </div>
        </div>

        {/* Right: Chat Area */}
        <div className="lg:col-span-3 glass-panel rounded-3xl border border-slate-800 flex flex-col justify-between overflow-hidden bg-slate-950/60">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`relative group max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-medium shadow-md'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-800 shadow-md'
                    }`}
                  >
                    {/* Live Streaming Reasoning / Thoughts Accordion */}
                    {!isUser && msg.reasoning && (
                      <div className="mb-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 overflow-hidden shadow-inner animate-in fade-in duration-200">
                        <button
                          type="button"
                          onClick={() => toggleThoughtCollapse(index)}
                          className="w-full px-3 py-2 bg-purple-900/20 hover:bg-purple-900/40 flex items-center justify-between text-[11px] font-bold text-purple-300 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                            <span>Processo di Pensiero & Ragionamento</span>
                            {msg.isStreaming && !msg.content && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-500/30 animate-pulse">
                                Streaming Pensieri...
                              </span>
                            )}
                          </div>
                          {collapsedThoughts[index] ? (
                            <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 text-purple-400" />
                          )}
                        </button>

                        {!collapsedThoughts[index] && (
                          <div className="p-3 font-mono text-[11px] text-purple-200/90 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border-t border-purple-500/20 bg-slate-950/40">
                            {msg.reasoning}
                            {msg.isStreaming && !msg.content && (
                              <span className="inline-block w-1.5 h-3 bg-purple-400 ml-1 animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Content Stream */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content || (msg.isStreaming && !msg.reasoning ? (
                        <span className="text-slate-400 italic flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          Inizio elaborazione risposta...
                        </span>
                      ) : '')}
                      {msg.isStreaming && msg.content && (
                        <span className="inline-block w-2 h-3.5 bg-purple-400 ml-1 animate-pulse align-middle" />
                      )}
                    </div>

                    {/* Agent Trace Inspector */}
                    {!isUser && msg.agentTrace && (
                      <AgentPipelineBadge agentTrace={msg.agentTrace} />
                    )}

                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        title="Copia risposta"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 shadow">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />

            {loading && !messages[messages.length - 1]?.content && !messages[messages.length - 1]?.reasoning && (
              <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-bounce" />
                </div>
                <div className="bg-slate-900/95 border border-purple-500/40 rounded-2xl p-4 text-xs text-purple-200 space-y-2.5 max-w-md shadow-xl">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>{currentPipelineStep?.label || `Elaborazione con ${selectedModel.split('/')[1] || selectedModel}...`}</span>
                  </div>

                  {/* 4-Stage Progress Steps */}
                  {isAgentMode && (
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div 
                          className="bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${currentPipelineStep?.progress || 35}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span className={currentPipelineStep?.progress >= 25 ? "text-purple-300 font-bold" : ""}>1. Meta-Analisi</span>
                        <span className={currentPipelineStep?.progress >= 50 ? "text-amber-300 font-bold" : ""}>2. Memoria Vault</span>
                        <span className={currentPipelineStep?.progress >= 75 ? "text-blue-300 font-bold" : ""}>3. Web Check</span>
                        <span className={currentPipelineStep?.progress >= 90 ? "text-emerald-300 font-bold" : ""}>4. Sintesi</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input Prompt Bar */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center gap-3">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={`Chiedi all'Agente AI (auto-calibrazione parametri, web check e memoria prioritaria)...`}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans shadow-inner"
            />

            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
            </button>
          </form>
        </div>
      </div>

      {/* Model Picker Modal */}
      <ModelPickerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        selectedModelId={selectedModel}
        onSelectModel={(modelId) => {
          setSelectedModel(modelId);
          addToast(`Modello cambiato in "${modelId}"`, 'success');
        }}
      />

      {/* Web Fact-Checking Console Inspector Modal */}
      {isWebInspectorOpen && (
        <WebSearchInspectorModal
          isOpen={isWebInspectorOpen}
          onClose={() => setIsWebInspectorOpen(false)}
        />
      )}
    </div>
  );
}
