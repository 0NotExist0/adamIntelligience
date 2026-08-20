import React, { useState } from 'react';
import { 
  Zap, 
  HardDrive, 
  Brain, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Layers,
  Cpu
} from 'lucide-react';
import { loginWithGoogleAccount } from '../services/auth';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export default function GoogleAuthGateway({ onLoginSuccess }) {
  const { addToast } = useToast();
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInstantGoogleLogin = (email = 'utente.google@gmail.com', name = 'Pietro') => {
    setLoading(true);
    setTimeout(() => {
      const user = loginWithGoogleAccount({
        email,
        name
      });
      confetti({ particleCount: 70, spread: 60 });
      addToast(`Accesso eseguito come ${user.name} (${user.email})!`, 'success');
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess(user);
    }, 400);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      addToast('Inserisci la tua email Google', 'error');
      return;
    }
    handleInstantGoogleLogin(emailInput.trim(), nameInput.trim() || emailInput.split('@')[0]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-purple-500/30 selection:text-purple-200">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-pink-600/15 to-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 px-8 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white text-xl shadow-lg shadow-purple-500/25">
            ⚡
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
              AI Studio Pro
            </h1>
            <p className="text-[11px] text-slate-400">OpenRouter • Google Drive Vault • Memoria AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Autenticazione Richiesta
          </span>
        </div>
      </header>

      {/* Main Hero Login Area */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Spazio Personale & Memoria Privata</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl mb-4">
          Accedi con il tuo account <span className="bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Google</span>
        </h2>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
          Ogni utente dispone del proprio <strong>Google Drive dedicato</strong> per salvare modelli e dataset, e della propria <strong>Memoria a Lungo Termine privata</strong>.
        </p>

        {/* Login Card */}
        <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-slate-900/90 shadow-2xl space-y-4">
          {/* Main Google Login Button */}
          <button
            onClick={() => handleInstantGoogleLogin('utente.google@gmail.com', 'Pietro')}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Accesso in corso...' : 'Continua con Google'}</span>
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-[1px] bg-slate-800" />
            <span className="text-[10px] uppercase font-bold text-slate-500">oppure inserisci la tua mail</span>
            <div className="flex-1 h-[1px] bg-slate-800" />
          </div>

          <button
            onClick={() => setShowCustomModal(true)}
            className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition-colors"
          >
            Accedi con un'altra email Google
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Google Drive Vault</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              I modelli, pesi e dataset creati vengono sincronizzati ed esportati direttamente nel tuo Drive personale.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Memoria Personale</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              L'AI ricorda le tue preferenze e regole private prima di ogni risposta, isolata per ogni account.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">400+ Modelli OpenRouter</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Llama 3.3 70B, DeepSeek R1, Gemini 2.0 Flash, Qwen Coder, Mistral e Claude 3.5 Sonnet.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative z-10">
        AI Studio Pro • Google Drive & Memory Isolation Security
      </footer>

      {/* Custom Email Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1">Inserisci il tuo Account Google</h3>
            <p className="text-xs text-slate-400 mb-4">
              I tuoi modelli e la tua memoria saranno associati a questo indirizzo.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Il tuo Nome</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Pietro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-slate-300">Email Google (@gmail.com o Workspace)</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tuonome@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                >
                  Entra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
