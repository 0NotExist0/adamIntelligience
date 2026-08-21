import React, { useState, useEffect } from 'react';
import { 
  Key, 
  HardDrive, 
  ExternalLink, 
  Check, 
  Loader2, 
  Sparkles, 
  GitBranch, 
  Globe, 
  Zap, 
  ShieldCheck,
  Download,
  Terminal,
  Code,
  User,
  UserCheck,
  FolderOpen,
  Trash2,
  RefreshCw,
  Plus,
  Lock,
  FolderPlus
} from 'lucide-react';
import { getOpenRouterKey, setOpenRouterKey, sendOpenRouterChat } from '../services/openrouter';
import { getCustomModels, getCustomChatbots, getCustomDatasets, downloadJSONFile, openGoogleDriveFolder, getGoogleDriveUrl } from '../services/storage';
import { 
  getCurrentUser, 
  getSavedAccounts, 
  updateUserProfile, 
  switchAccount, 
  removeSavedAccount, 
  clearAllBrowserCredentials,
  loginWithGoogleAccount
} from '../services/auth';
import confetti from 'canvas-confetti';
import { useToast } from '../components/Toast';

export default function SettingsManager({ onUserUpdated, onSwitchAccount, onLogout }) {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [savedAccounts, setSavedAccounts] = useState(() => getSavedAccounts());

  // Profile / Drive Edit state
  const [customDriveInput, setCustomDriveInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // New account form state
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');

  // OpenRouter key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setNameInput(user.name || '');
      setCustomDriveInput(user.customFolderConfigured ? user.driveFolderUrl : '');
    }
    setSavedAccounts(getSavedAccounts());
    setCurrentKey(getOpenRouterKey());
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updated = updateUserProfile({
      name: nameInput.trim(),
      driveFolderUrl: customDriveInput.trim() || null
    });
    if (updated) {
      setCurrentUser(updated);
      setSavedAccounts(getSavedAccounts());
      setIsEditingProfile(false);
      addToast('Profilo e link Google Drive aggiornati!', 'success');
      if (onUserUpdated) onUserUpdated(updated);
    }
  };

  const handleSwitch = (userId) => {
    const switched = switchAccount(userId);
    if (switched) {
      setCurrentUser(switched);
      setSavedAccounts(getSavedAccounts());
      addToast(`Passato all'account ${switched.name} (${switched.email})`, 'success');
      if (onSwitchAccount) {
        onSwitchAccount(switched);
      } else {
        window.location.reload();
      }
    }
  };

  const handleRemoveAccount = (userId, email) => {
    const updated = removeSavedAccount(userId);
    setSavedAccounts(updated);
    addToast(`Account ${email} rimosso dalle credenziali del browser`, 'info');
    const current = getCurrentUser();
    if (!current) {
      if (onLogout) onLogout();
      else window.location.reload();
    }
  };

  const handleAddNewAccount = (e) => {
    e.preventDefault();
    if (!newEmailInput.trim()) {
      addToast('Inserisci una email valida', 'error');
      return;
    }
    const user = loginWithGoogleAccount({
      email: newEmailInput.trim(),
      name: newNameInput.trim(),
      rememberInBrowser: true
    });
    setSavedAccounts(getSavedAccounts());
    setCurrentUser(user);
    setShowAddAccountModal(false);
    setNewEmailInput('');
    setNewNameInput('');
    addToast(`Nuovo account ${user.name} aggiunto e salvato nel browser!`, 'success');
    if (onSwitchAccount) onSwitchAccount(user);
  };

  const handleClearAllCredentials = () => {
    if (window.confirm('Sei sicuro di voler eliminare TUTTI gli account, sessioni e chiavi salvate in questo browser?')) {
      clearAllBrowserCredentials();
      addToast('Tutte le credenziali sono state eliminate dal browser', 'info');
      if (onLogout) onLogout();
      else window.location.reload();
    }
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setOpenRouterKey(apiKeyInput.trim());
    setCurrentKey(apiKeyInput.trim());
    setApiKeyInput('');
    addToast('Chiave OpenRouter salvata con successo!', 'success');
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleRemoveKey = () => {
    setOpenRouterKey('');
    setCurrentKey('');
    addToast('Chiave OpenRouter rimossa', 'info');
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendOpenRouterChat({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: 'Rispondi solo: OpenRouter Attivo e Connesso!' }],
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

  const handleExportFullDriveBackup = () => {
    const backup = {
      platform: 'AI Studio Pro',
      backupDate: new Date().toISOString(),
      user: currentUser,
      models: getCustomModels(),
      chatbots: getCustomChatbots(),
      datasets: getCustomDatasets()
    };

    downloadJSONFile(`AI_Studio_${currentUser?.name?.replace(/\s+/g, '_') || 'User'}_Backup_${new Date().toISOString().slice(0, 10)}.json`, backup);
    addToast('Backup completo scaricato! Puoi archiviarlo sul tuo Google Drive.', 'success');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white">Impostazioni, Account Google & Credenziali</h1>
          <p className="text-xs text-slate-400">
            Gestisci il tuo Google Drive personale, gli account memorizzati nel browser e la chiave OpenRouter
          </p>
        </div>
      </div>

      {/* Section 1: Active Google Account & Personal Drive Vault */}
      <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-500/20 overflow-hidden">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{currentUser?.name || 'Utente'}</h2>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Account Google Attivo
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{currentUser?.email || 'Nessuna email'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openGoogleDriveFolder}
              className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>Apri Mio Drive</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
            >
              {isEditingProfile ? 'Chiudi Modifica' : 'Modifica Drive / Nome'}
            </button>
          </div>
        </div>

        {/* Profile Edit Form */}
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 animate-in fade-in">
            <h4 className="text-xs font-bold text-white">Personalizza Profilo & Collegamento Google Drive</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Nome Visualizzato</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Cartella Google Drive Specifica (Opzionale)</label>
                <input
                  type="url"
                  value={customDriveInput}
                  onChange={(e) => setCustomDriveInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
              >
                Salva Modifiche
              </button>
            </div>
          </form>
        ) : (
          <div className="text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Destinazione Google Drive:</span>
              <span className="font-mono text-blue-300 truncate max-w-lg">{getGoogleDriveUrl()}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Tutti i modelli, chatbot e dataset che crei o scarichi sono collegati esclusivamente a questo account.
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Saved Accounts in this Browser (Multi-Account Switcher) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Credenziali & Account Salvati nel Browser</h2>
              <p className="text-xs text-slate-400">
                {savedAccounts.length} account memorizzati localmente in questo browser (localStorage)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Altro Account</span>
            </button>

            <button
              onClick={handleClearAllCredentials}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              title="Cancella tutte le credenziali dal browser"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Credenziali</span>
            </button>
          </div>
        </div>

        {/* Accounts List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedAccounts.map((acc) => {
            const isActive = acc.id === currentUser?.id;
            return (
              <div
                key={acc.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-purple-950/30 border-purple-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-sm">
                    {acc.avatar ? (
                      <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                    ) : (
                      acc.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white">{acc.name}</h4>
                      {isActive && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">ATTIVO</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{acc.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(acc.id)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold"
                    >
                      Passa
                    </button>
                  )}

                  <button
                    onClick={() => handleRemoveAccount(acc.id, acc.email)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Rimuovi account dal browser"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: OpenRouter API Key */}
      <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Chiave API OpenRouter</h2>
              <p className="text-xs text-slate-400">Accesso a DeepSeek R1, Llama 3.3 70B, Claude 3.5 Sonnet e GPT-4o</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              currentKey
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${currentKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{currentKey ? `Chiave Attiva (${currentKey.slice(0, 8)}...)` : 'Nessuna Chiave Inserita'}</span>
            </div>

            {currentKey && (
              <button
                onClick={handleTestKey}
                disabled={testing}
                className="px-3 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Testa</span>
              </button>
            )}
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-2xl text-xs border ${
            testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {testResult.success ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{testResult.message}</span>
              </div>
            ) : (
              <div>❌ {testResult.error}</div>
            )}
          </div>
        )}

        <form onSubmit={handleSaveKey} className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Inserisci o Aggiorna Chiave API (sk-or-v1-...)</span>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline inline-flex items-center gap-1 text-[11px]"
            >
              Ottieni chiave gratis su openrouter.ai/keys <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={!apiKeyInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              Salva Chiave
            </button>

            {currentKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                Rimuovi
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Section 4: Google Drive Backup */}
      <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/20 via-slate-900 to-slate-900 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Drive Backup & Esportazione</h2>
              <p className="text-xs text-slate-400">Esporta l'archivio completo di modelli, chatbot e dataset dell'utente attivo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFullDriveBackup}
              className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica Backup Completo</span>
            </button>

            <button
              onClick={openGoogleDriveFolder}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>Apri Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: GitHub & Vercel Deploy Guide */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Deploy su GitHub & Vercel</h2>
            <p className="text-xs text-slate-400">Pubblica la tua applicazione online con hosting globale gratuito</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <GitBranch className="w-4 h-4" />
              <span>1. Carica su GitHub</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Crea un nuovo repository su GitHub e carica il codice con i comandi:
            </p>
            <pre className="p-2.5 rounded-xl bg-slate-900 font-mono text-[10px] text-purple-200 overflow-x-auto">
              git init{'\n'}
              git add .{'\n'}
              git commit -m "AI Studio Pro"{'\n'}
              git remote add origin YOUR_GITHUB_URL{'\n'}
              git push -u origin main
            </pre>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Globe className="w-4 h-4" />
              <span>2. Importa su Vercel</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Vai su <strong>vercel.com</strong>, clicca su <em>"Add New Project"</em>, seleziona il tuo repository GitHub e clicca su <strong>Deploy</strong>. Il sito sarà online in 30 secondi con certificato SSL e CDN mondiale!
            </p>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:underline font-semibold text-[11px] pt-1"
            >
              <span>Apri Vercel Import Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Modal to add another account */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Aggiungi Account Google nel Browser</h3>
            <p className="text-xs text-slate-400">
              Puoi memorizzare più account Google su questo dispositivo per passare rapidamente dall'uno all'altro.
            </p>

            <form onSubmit={handleAddNewAccount} className="space-y-3 text-xs text-left">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Email Google</label>
                <input
                  type="email"
                  required
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="esempio.utente@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Nome o Alias</label>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg"
                >
                  Aggiungi & Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

