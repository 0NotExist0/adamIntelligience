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
  Code
} from 'lucide-react';
import { getOpenRouterKey, setOpenRouterKey, sendOpenRouterChat } from '../services/openrouter';
import { getCustomModels, getCustomChatbots, getCustomDatasets, downloadJSONFile, openGoogleDriveFolder } from '../services/storage';
import confetti from 'canvas-confetti';
import { useToast } from '../components/Toast';

export default function SettingsManager() {
  const { addToast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const k = getOpenRouterKey();
    setCurrentKey(k);
  }, []);

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
        model: 'meta-llama/llama-3.3-70b-instruct:free',
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
      models: getCustomModels(),
      chatbots: getCustomChatbots(),
      datasets: getCustomDatasets()
    };

    downloadJSONFile(`AI_Studio_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`, backup);
    addToast('Backup completo scaricato! Puoi archiviarlo su Google Drive.', 'success');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-white">Impostazioni, Chiavi & Deploy</h1>
          <p className="text-xs text-slate-400">
            Gestisci la connessione OpenRouter, i backup su Google Drive e il deploy su Vercel / GitHub
          </p>
        </div>
      </div>

      {/* OpenRouter Key Card */}
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

      {/* Google Drive Vault & Backup Card */}
      <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/20 via-slate-900 to-slate-900 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Drive Backup & Sincronizzazione</h2>
              <p className="text-xs text-slate-400">Esporta l'intero archivio di modelli, chatbot e dataset</p>
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

      {/* GitHub & Vercel Deploy Guide Card */}
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
    </div>
  );
}
