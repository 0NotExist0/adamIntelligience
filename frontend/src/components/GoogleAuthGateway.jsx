import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  HardDrive, 
  Brain, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Layers,
  Cpu,
  User,
  Trash2,
  CheckCircle2,
  FolderPlus,
  ExternalLink,
  Plus
} from 'lucide-react';
import { 
  loginWithGoogleAccount, 
  getSavedAccounts, 
  removeSavedAccount, 
  switchAccount 
} from '../services/auth';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export default function GoogleAuthGateway({ onLoginSuccess }) {
  const { addToast } = useToast();
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [customDriveUrl, setCustomDriveUrl] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdvancedDrive, setShowAdvancedDrive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const handlePerformLogin = (email, name, driveFolderUrl = null, remember = true) => {
    if (!email || !email.trim()) {
      addToast('Inserisci un indirizzo email Google valido', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const user = loginWithGoogleAccount({
        email: email.trim(),
        name: (name || '').trim(),
        driveFolderUrl: driveFolderUrl ? driveFolderUrl.trim() : null,
        rememberInBrowser: remember
      });

      confetti({ particleCount: 70, spread: 60 });
      addToast(`Benvenuto, ${user.name}! Collegato al tuo Google Drive personale.`, 'success');
      setLoading(false);
      setShowLoginModal(false);
      if (onLoginSuccess) onLoginSuccess(user);
    }, 350);
  };

  const handleSavedAccountClick = (acc) => {
    setLoading(true);
    setTimeout(() => {
      const user = switchAccount(acc.id);
      if (user) {
        confetti({ particleCount: 50, spread: 50 });
        addToast(`Accesso eseguito come ${user.name} (${user.email})!`, 'success');
        setLoading(false);
        if (onLoginSuccess) onLoginSuccess(user);
      } else {
        // Fallback
        handlePerformLogin(acc.email, acc.name, acc.driveFolderUrl, true);
      }
    }, 200);
  };

  const handleRemoveAccount = (e, userId, email) => {
    e.stopPropagation();
    const updated = removeSavedAccount(userId);
    setSavedAccounts(updated);
    addToast(`Account ${email} rimosso dal browser`, 'info');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handlePerformLogin(emailInput, nameInput, customDriveUrl, rememberMe);
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
            <p className="text-[11px] text-slate-400">OpenRouter • Google Drive Vault • Memoria AI Isolata</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Autenticazione Personale
          </span>
        </div>
      </header>

      {/* Main Hero Login Area */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Spazio Personale & Google Drive Diretto</span>
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-2xl mb-3">
          Accedi con il tuo account <span className="bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Google</span>
        </h2>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-7 leading-relaxed">
          Ogni utente si collega al <strong>proprio Google Drive personale</strong> per salvare e sincronizzare modelli e dataset, con credenziali memorizzate in modo sicuro nel browser.
        </p>

        {/* Main Card Area */}
        <div className="w-full max-w-md space-y-4">
          {/* Saved Accounts in this Browser Section (if any) */}
          {savedAccounts.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/80 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  Account Salvati in questo Browser ({savedAccounts.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">1-Click Login</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => handleSavedAccountClick(acc)}
                    className="p-2.5 rounded-2xl bg-slate-950/70 hover:bg-purple-950/30 border border-slate-800/80 hover:border-purple-500/40 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-sm">
                        {acc.avatar ? (
                          <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                        ) : (
                          (acc.name || acc.email).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {acc.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-purple-300 font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20">
                        Entra ↗
                      </span>
                      <button
                        onClick={(e) => handleRemoveAccount(e, acc.id, acc.email)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Rimuovi questo account dal browser"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Login Action Card */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-purple-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            {/* Main Google Login Button */}
            <button
              onClick={() => setShowLoginModal(true)}
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
              <span>{loading ? 'Accesso in corso...' : 'Accedi con il tuo Account Google'}</span>
            </button>

            <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Credenziali e file isolati al 100% nel tuo Drive personale</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 w-full text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Il Tuo Google Drive</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              I modelli, pesi e dataset creati vengono indirizzati ed esportati direttamente nel tuo Drive personale.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Memoria Privata Isolata</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              L'AI ricorda le tue preferenze e istruzioni senza mischiare i dati tra diversi account o sviluppatori.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Salvataggio nel Browser</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Le credenziali e lo stato di login restano memorizzati sul tuo dispositivo per non dover riaccedere ogni volta.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md relative z-10">
        AI Studio Pro • Google Drive & Multi-Account Isolation Security
      </footer>

      {/* Google Account Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md">
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
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Collega il tuo Account Google</h3>
                <p className="text-xs text-slate-400">
                  Inserisci la tua email per collegare il tuo Google Drive personale
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">La tua Email Google (@gmail.com o Workspace)</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="esempio.utente@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Il tuo Nome o Alias (Opzionale)</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="es. Mario Rossi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              {/* Advanced: Custom Google Drive Folder URL */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDrive(!showAdvancedDrive)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{showAdvancedDrive ? 'Nascondi opzione cartella Drive' : 'Hai una cartella Google Drive specifica? (Opzionale)'}</span>
                </button>

                {showAdvancedDrive && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 animate-in fade-in">
                    <label className="text-[11px] font-semibold text-slate-300">URL o Link Cartella Google Drive</label>
                    <input
                      type="url"
                      value={customDriveUrl}
                      onChange={(e) => setCustomDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/xxxxxxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-slate-500">Se lasci vuoto, userà automaticamente il tuo Google Drive personale.</p>
                  </div>
                )}
              </div>

              {/* Remember in browser Checkbox */}
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950"
                />
                <span>Salva e ricorda le credenziali in questo browser</span>
              </label>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
                >
                  {loading ? 'Accesso...' : 'Connetti & Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

