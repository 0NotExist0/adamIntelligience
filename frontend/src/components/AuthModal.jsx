import React, { useState } from 'react';
import { 
  X, 
  Mail,
  Key, 
  Globe, 
  Cookie, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Sparkles, 
  ShieldCheck,
  ExternalLink,
  Lock,
  User
} from 'lucide-react';
import axios from 'axios';
import { useToast } from './Toast';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials', 'token', 'browser', 'cookie'
  
  // Credentials state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Token state
  const [tokenInput, setTokenInput] = useState('');
  
  // Cookie state
  const [cookieInput, setCookieInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserStatusMsg, setBrowserStatusMsg] = useState('');

  if (!isOpen) return null;

  // Handle Email & Password Login
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      addToast('Inserisci email/username e password', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login-credentials', {
        username_or_email: emailInput.trim(),
        password: passwordInput
      });
      if (res.data.success) {
        addToast(`Accesso riuscito! Benvenuto @${res.data.user.name}`, 'success');
        onLoginSuccess(res.data.user, 'credentials');
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Credenziali non valide o errore di accesso', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle direct Token Login
  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      addToast('Inserisci un token Hugging Face valido', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login-token', { token: tokenInput.trim() });
      if (res.data.success) {
        addToast(`Accesso completato! Benvenuto @${res.data.user.name}`, 'success');
        onLoginSuccess(res.data.user, 'token');
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante l\'accesso con token', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Cookie Login
  const handleCookieSubmit = async (e) => {
    e.preventDefault();
    if (!cookieInput.trim()) {
      addToast('Inserisci il valore del cookie di sessione', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login-cookie', { cookie: cookieInput.trim() });
      if (res.data.success) {
        addToast(`Accesso completato con cookie! Benvenuto @${res.data.user.name}`, 'success');
        onLoginSuccess(res.data.user, 'cookie');
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Cookie non valido o scaduto', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Browser Automation Login (Desktop only)
  const handleBrowserLogin = async () => {
    setBrowserLoading(true);
    setBrowserStatusMsg('Apertura finestra browser interattiva sul PC desktop...');
    
    try {
      const res = await axios.post('/api/auth/browser-login');
      if (res.data.success) {
        addToast(`Login completato tramite browser! Ciao @${res.data.user.name}`, 'success');
        onLoginSuccess(res.data.user, 'browser_cookie');
        onClose();
      } else {
        addToast(res.data.error || 'Login non completato', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante il login via browser', 'error');
    } finally {
      setBrowserLoading(false);
      setBrowserStatusMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden my-auto">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
              🤗
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Accedi a Hugging Face</h3>
              <p className="text-xs text-slate-400">Collegati per gestire modelli, dataset e spaces</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Method Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 my-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'credentials'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Email / Pass</span>
          </button>
          
          <button
            onClick={() => setActiveTab('token')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'token'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span>Token HF</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'browser'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Browser SSO</span>
          </button>
        </div>

        {/* Tab 1: Email & Password (Primary, works on mobile & desktop) */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Email o Username Hugging Face</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nome_utente o email@esempio.com"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !emailInput || !passwordInput}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 stroke-[2.5]" />}
              <span>{loading ? 'Autenticazione in corso...' : 'Accedi a Hugging Face'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: User Access Token */}
        {activeTab === 'token' && (
          <form onSubmit={handleTokenSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Access Token Hugging Face</label>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  Crea Token <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 font-mono transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Consigliato: usa un token con permessi di <strong>Write</strong> per poter gestire e creare modelli e spaces.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !tokenInput}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 stroke-[2.5]" />}
              <span>{loading ? 'Verifica in corso...' : 'Salva ed Entra'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Browser Interactive Login (for desktop host) */}
        {activeTab === 'browser' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Finestra Browser (Google / GitHub SSO)</span>
              </div>
              <p>
                Apre una finestra Chromium sullo schermo del computer principale per effettuare il login con <strong>Google SSO</strong> o <strong>GitHub SSO</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                (Nota: Se stai usando l'app da smartphone, usa la scheda <strong>Email / Pass</strong> o <strong>Token HF</strong>).
              </p>
            </div>

            {browserLoading ? (
              <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-amber-300">{browserStatusMsg}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Completa il login nella finestra aperta sul PC...
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleBrowserLogin}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Globe className="w-4 h-4 stroke-[2.5]" />
                <span>Apri Finestra Browser Desktop</span>
              </button>
            )}
          </div>
        )}

        {/* Footer Security Note */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>I tuoi dati rimangono memorizzati localmente sul tuo server in totale sicurezza.</span>
        </div>
      </div>
    </div>
  );
}
