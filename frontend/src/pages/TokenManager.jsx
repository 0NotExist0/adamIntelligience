import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  ExternalLink, 
  User, 
  Building, 
  Globe, 
  Cookie, 
  CheckCircle2,
  Lock,
  Zap,
  Sparkles,
  Key,
  Check,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { useToast } from '../components/Toast';

export default function TokenManager({ user, authType, onOpenAuth, onLogout }) {
  const { addToast } = useToast();
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterStatus, setOpenRouterStatus] = useState({ configured: false, api_key_masked: '' });
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    fetchOpenRouterStatus();
  }, []);

  const fetchOpenRouterStatus = async () => {
    try {
      const res = await axios.get('/api/openrouter/status');
      setOpenRouterStatus(res.data);
    } catch (e) {
      // Ignored
    }
  };

  const handleSaveOpenRouterKey = async (e) => {
    e.preventDefault();
    if (!openRouterKey.trim()) return;

    setSavingKey(true);
    try {
      const res = await axios.post('/api/openrouter/save-key', { api_key: openRouterKey.trim() });
      if (res.data.success) {
        addToast('Chiave API OpenRouter salvata con successo!', 'success');
        confetti({ particleCount: 60, spread: 50 });
        setOpenRouterKey('');
        fetchOpenRouterStatus();
      }
    } catch (err) {
      addToast('Errore durante il salvataggio della chiave OpenRouter', 'error');
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-500 text-slate-950 flex items-center justify-center font-bold">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white">Token, OpenRouter & Sessione</h1>
          <p className="text-xs text-slate-400">Gestisci l'autenticazione Hugging Face e la chiave API di OpenRouter</p>
        </div>
      </div>

      {/* OpenRouter Integration Card */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900 space-y-5 shadow-xl shadow-purple-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">OpenRouter AI Gateway</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                  100+ MODELLI AI
                </span>
              </div>
              <p className="text-xs text-slate-400">DeepSeek R1, Llama 3.3 70B, Claude 3.5 Sonnet, GPT-4o, Gemini 2.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              openRouterStatus.configured
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${openRouterStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{openRouterStatus.configured ? `Attivo (${openRouterStatus.api_key_masked})` : 'Nessuna Chiave Inserita'}</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveOpenRouterKey} className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Inserisci Chiave API OpenRouter (sk-or-v1-...)</span>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1 text-[11px]"
            >
              Ottieni chiave gratis su openrouter.ai/keys <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={savingKey || !openRouterKey.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva Chiave'}
            </button>
          </div>
        </form>
      </div>

      {user ? (
        <div className="space-y-6">
          {/* Active Session Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <img 
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`} 
                  alt="avatar"
                  className="w-14 h-14 rounded-2xl object-cover border border-amber-500/30 shadow-lg shadow-amber-500/10"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{user.fullname || user.name}</h2>
                    {user.isPro && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">@{user.name} • {user.email || 'Email protetta'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Cambia Account / Metodo
                </button>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnetti</span>
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[11px]">Metodo di Accesso</span>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  {authType === 'token' && <KeyRound className="w-4 h-4 text-amber-400" />}
                  {authType === 'browser_cookie' && <Globe className="w-4 h-4 text-cyan-400" />}
                  {authType === 'cookie' && <Cookie className="w-4 h-4 text-emerald-400" />}
                  <span className="capitalize">{authType || 'Token Hugging Face'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[11px]">Stato Connessione</span>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Autenticato & Operativo</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[11px]">Tipo Account</span>
                <div className="text-xs font-bold text-slate-200">
                  {user.isPro ? 'Hugging Face PRO' : 'Community Gratuito'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <KeyRound className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Nessuna sessione Hugging Face attiva</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Collega il tuo account Hugging Face per visualizzare i dettagli della sessione e accedere alle tue risorse private.
          </p>
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Collega Account Ora</span>
          </button>
        </div>
      )}
    </div>
  );
}
