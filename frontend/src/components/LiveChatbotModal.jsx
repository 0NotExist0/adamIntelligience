import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  Cpu, 
  RefreshCw,
  Globe,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { useToast } from './Toast';

export default function LiveChatbotModal({ spaceId, onClose, user }) {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ciao! Sono il tuo **Chatbot AI** pronto all'uso su Hugging Face nello Space **\`${spaceId}\`**! 🤖✨

Puoi iniziare a testare la conversazione direttamente qui sotto oppure aprire lo Space ufficiale su Hugging Face!`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedModel, setSelectedModel] = useState('meta-llama/Llama-3.2-3B-Instruct');
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'iframe'
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!spaceId) return null;

  const spaceUrl = `https://huggingface.co/spaces/${spaceId}`;
  const embedUrl = `https://hf.space/embed/${spaceId}/+`;

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userMessage = { role: 'user', content: inputPrompt.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await axios.post('/api/inference/chat', {
        model: selectedModel,
        messages: apiMessages,
        max_tokens: 512,
        temperature: 0.7
      });

      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.data.content }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Errore dal modello: ${res.data.error || 'Nessuna risposta'}` }
        ]);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Errore di connessione';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Errore durante la risposta: ${errMsg}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
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
      <div className="relative w-full max-w-5xl h-[88vh] glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{spaceId}</h3>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400">Chatbot Space attivo su Hugging Face Hub</p>
            </div>
          </div>

          {/* Mode Switcher & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 text-xs">
              <button
                onClick={() => setViewMode('chat')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'chat'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💬 Chat Diretta
              </button>
              <button
                onClick={() => setViewMode('iframe')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'iframe'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 Web View
              </button>
            </div>

            <a
              href={spaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>Apri su HF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'chat' ? (
          /* Native Interactive Chat */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60">
            {/* Top Config bar */}
            <div className="p-3 px-6 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400">Modello AI:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="google/gemini-2.0-flash-exp:free">Google Gemini 2.0 Flash (FREE)</option>
                  <option value="deepseek/deepseek-r1:free">DeepSeek R1 Reasoning (FREE)</option>
                  <option value="qwen/qwen-2.5-coder-32b-instruct:free">Qwen 2.5 Coder 32B (FREE)</option>
                  <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (FREE)</option>
                  <option value="meta-llama/llama-3.1-8b-instruct:free">Meta Llama 3.1 8B (FREE)</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                </select>
              </div>

              <button
                onClick={clearChat}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Azzera Chat</span>
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
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
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-purple-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Sto generando la risposta...</span>
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
                placeholder="Scrivi un messaggio per il chatbot..."
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans shadow-inner"
              />

              <button
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </form>
          </div>
        ) : (
          /* Web View / Iframe Preview with Fallback */
          <div className="flex-1 flex flex-col bg-slate-950 relative">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 text-xs flex items-center justify-between px-6">
              <span className="text-slate-400">
                Se l'iframe mostra restrizioni di sicurezza del browser, aprilo direttamente in una nuova scheda:
              </span>
              <a
                href={spaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5"
              >
                <span>Apri Space Ufficiale</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <iframe
              src={spaceUrl}
              title="Chatbot Space Live Preview"
              className="w-full flex-1 border-0"
              allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
              sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        )}
      </div>
    </div>
  );
}
