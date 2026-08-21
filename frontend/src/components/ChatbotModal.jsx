import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  Cpu, 
  HardDrive,
  Download,
  Globe
} from 'lucide-react';
import { POPULAR_MODELS, sendOpenRouterChat } from '../services/openrouter';
import { runAgentChatPipeline } from '../services/agentPipeline';
import ModelPickerModal from './ModelPickerModal';
import AgentPipelineBadge from './AgentPipelineBadge';
import { downloadJSONFile } from '../services/storage';
import { useToast } from './Toast';

export default function ChatbotModal({ bot, onClose }) {
  const { addToast } = useToast();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ciao! Sono **${bot.name}** (${bot.avatar || '🤖'}), potenziato da **OpenRouter** con auto-calibrazione parametri e fact-checking web.\n\nCome posso aiutarti oggi?`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(bot.model || bot.baseModel || 'meta-llama/llama-3.3-70b-instruct:free');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [agentStep, setAgentStep] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!bot) return null;

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userMessage = { role: 'user', content: inputPrompt.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);
    setAgentStep('Analisi prompt...');

    try {
      const history = newMessages
        .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await runAgentChatPipeline({
        prompt: inputPrompt.trim(),
        messages: [
          { role: 'system', content: bot.systemPrompt || 'Sei un assistente AI amichevole, intelligente e utile.' },
          ...history
        ],
        model: selectedModel,
        onProgressStep: (s) => setAgentStep(s.label)
      });

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          { 
            role: 'assistant', 
            content: res.content,
            agentTrace: res.agentTrace
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${res.error}` }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Errore durante la risposta: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
      setAgentStep('');
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    addToast('Messaggio copiato!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportChatToDrive = () => {
    const payload = {
      botName: bot.name,
      model: selectedModel,
      chatDate: new Date().toISOString(),
      messages
    };
    downloadJSONFile(`${bot.name.replace(/\s+/g, '_')}_chat_export.json`, payload);
    addToast('Conversazione esportata per Google Drive!', 'success');
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat azzerata. Sono pronto per una nuova conversazione!`
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
              {bot.avatar || '🤖'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{bot.name}</h3>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-purple-400 font-mono">{selectedModel}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportChatToDrive}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
              title="Esporta chat per Google Drive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Esporta Drive</span>
            </button>

            <button
              onClick={clearChat}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Azzera chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model switcher bar */}
        <div className="p-2.5 px-6 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400">Modello:</span>
            <span className="font-mono text-purple-300 font-bold">{selectedModel}</span>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="ml-2 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-300 hover:text-white font-semibold text-[11px] transition-colors"
            >
              Cambia (400+ Modelli) ↗
            </button>
          </div>

          <span className="text-[10px] text-slate-500 italic hidden md:inline">
            "{bot.systemPrompt?.slice(0, 45)}..."
          </span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-medium shadow-md'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* Agent Trace Badge */}
                  {!isUser && msg.agentTrace && (
                    <AgentPipelineBadge agentTrace={msg.agentTrace} />
                  )}

                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      title="Copia messaggio"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-3 text-xs text-purple-300 flex items-center gap-2 shadow-lg">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{agentStep || `${bot.name} sta rispondendo...`}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center gap-3">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={`Scrivi un messaggio a ${bot.name}...`}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans shadow-inner"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </form>

        {/* Model Picker Modal */}
        <ModelPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          selectedModelId={selectedModel}
          onSelectModel={(modelId) => {
            setSelectedModel(modelId);
            addToast(`Modello attivo cambiato in: "${modelId}"`, 'success');
          }}
        />
      </div>
    </div>
  );
}
