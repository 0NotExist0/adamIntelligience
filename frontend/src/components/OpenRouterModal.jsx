import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Sparkles, 
  ExternalLink, 
  Check, 
  Loader2, 
  Zap
} from 'lucide-react';
import { getOpenRouterKey, setOpenRouterKey, sendOpenRouterChat } from '../services/openrouter';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export default function OpenRouterModal({ isOpen, onClose, onKeySaved }) {
  const { addToast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentKey(getOpenRouterKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      addToast('Inserisci una chiave API OpenRouter valida', 'error');
      return;
    }

    setOpenRouterKey(apiKey.trim());
    setCurrentKey(apiKey.trim());
    setApiKey('');
    addToast('Chiave OpenRouter salvata con successo!', 'success');
    confetti({ particleCount: 60, spread: 50 });
    if (onKeySaved) onKeySaved();
  };

  const handleRemoveKey = () => {
    setOpenRouterKey('');
    setCurrentKey('');
    addToast('Chiave OpenRouter rimossa', 'info');
    if (onKeySaved) onKeySaved();
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendOpenRouterChat({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: 'Rispondi solo: Connessione OpenRouter Riuscita!' }],
        max_tokens: 30
      });

      if (res.success) {
        setTestResult({ success: true, message: res.content });
        addToast('Connessione OpenRouter riuscita!', 'success');
      } else {
        setTestResult({ success: false, error: res.error });
      }
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Integrazione OpenRouter AI</h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                  100+ MODELLI
                </span>
              </div>
              <p className="text-xs text-slate-400">DeepSeek R1, Llama 3.3 70B, Claude 3.5, GPT-4o, Gemini 2.0</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="py-4 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${currentKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <span className="font-semibold text-slate-200">
                  {currentKey ? 'Chiave API OpenRouter Attiva' : 'Nessuna Chiave Inserita'}
                </span>
                {currentKey && (
                  <p className="text-[11px] font-mono text-purple-300">
                    {currentKey.slice(0, 8)}...{currentKey.slice(-4)}
                  </p>
                )}
              </div>
            </div>

            {currentKey && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTestKey}
                  disabled={testing}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Testa</span>
                </button>
                <button
                  onClick={handleRemoveKey}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                >
                  Rimuovi
                </button>
              </div>
            )}
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs border ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testResult.message}</span>
                </div>
              ) : (
                <div>❌ {testResult.error}</div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveKey} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Chiave API OpenRouter (sk-or-v1-...)</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  Ottieni chiave gratuita su openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxx..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              Salva Chiave OpenRouter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
