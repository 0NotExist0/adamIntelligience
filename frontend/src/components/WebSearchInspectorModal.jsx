import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Search, 
  Terminal, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Database, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { multiMethodWebSearch, getSearchLogsHistory } from '../services/webSearch';
import { useToast } from './Toast';

export default function WebSearchInspectorModal({ isOpen, onClose, initialQuery = '' }) {
  const { addToast } = useToast();
  const [testQuery, setTestQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeLog, setActiveLog] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const history = getSearchLogsHistory();
      setLogs([...history]);
      if (history.length > 0) {
        setActiveLog(history[0]);
      }
      if (initialQuery && !history.some((h) => h.query.toLowerCase() === initialQuery.toLowerCase())) {
        setTestQuery(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleRunSearch = async (e) => {
    e?.preventDefault();
    if (!testQuery.trim() || loading) return;

    setLoading(true);
    try {
      const res = await multiMethodWebSearch(testQuery.trim());
      const updatedHistory = getSearchLogsHistory();
      setLogs([...updatedHistory]);
      setActiveLog(updatedHistory[0] || null);
      addToast(`Ricerca completata: ${res.results?.length || 0} fonti trovate! (Controlla anche la console F12)`, 'success');
    } catch (err) {
      addToast(`Errore durante la ricerca: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!activeLog) return;
    navigator.clipboard.writeText(JSON.stringify(activeLog, null, 2));
    setCopied(true);
    addToast('Dati JSON copiati negli appunti!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-5xl h-[88vh] glass-panel bg-slate-900/95 border border-blue-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-blue-500/25">
              🌐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Console & Inspector Fact-Checking Web</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                  MULTI-METODO ATTIVO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verifica fonti da DuckDuckGo, Wikipedia, OpenAlex, Scraping Backend e Console DevTools
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test Search Bar */}
        <div className="p-4 px-6 border-b border-slate-800/80 bg-slate-950/50 shrink-0">
          <form onSubmit={handleRunSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Digita qualsiasi query o fatto da verificare sul web (es. novità AI 2026, formula di Eulero, capitale Islanda)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !testQuery.trim()}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 shadow-lg shadow-blue-500/20 flex items-center gap-2 shrink-0 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ricerca in corso...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Esegui Fact-Check Web</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Body Layout: Left History List | Right Detail View */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Left Column: Logs History */}
          <div className="border-r border-slate-800/80 bg-slate-950/40 p-4 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Cronologia Ricerche ({logs.length})
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>Nessuna ricerca web recente.</p>
                <p className="text-[10px] mt-1 text-slate-600">Esegui una query in alto per testare i motori.</p>
              </div>
            ) : (
              logs.map((item, idx) => {
                const isSelected = activeLog === item;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveLog(item)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/15 shadow-md shadow-blue-500/10'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white truncate">{item.query}</span>
                      <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-blue-300 font-mono shrink-0">
                        {item.resultsCount} fonti
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[140px]">{item.method}</span>
                      <span className="font-mono text-emerald-400">{item.durationMs}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Active Log Inspector */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-4 bg-slate-950/20">
            {activeLog ? (
              <div className="space-y-4">
                {/* Method & Stats Header */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Query: "{activeLog.query}"</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                        {activeLog.method}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        ⏱️ {activeLog.durationMs}ms
                      </span>
                      <span className="text-slate-500">
                        • {new Date(activeLog.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiato!' : 'Copia JSON'}</span>
                  </button>
                </div>

                {/* Extracted Sources Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Fonti Estratte & Verificate ({activeLog.results?.length || 0})
                  </h4>

                  {activeLog.results && activeLog.results.length > 0 ? (
                    <div className="space-y-2">
                      {activeLog.results.map((r, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 hover:border-blue-500/30 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-blue-300">{r.title}</span>
                            <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 shrink-0">
                              {r.source || 'Web'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed">{r.snippet}</p>

                          {r.url && (
                            <div className="pt-1 flex items-center gap-1 text-[10px] text-blue-400 truncate">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                {r.url}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-500 italic">
                      Nessuna fonte diretta reperita per questa query.
                    </div>
                  )}
                </div>

                {/* Prompt Injection Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    Blocco di Sintesi Iniettato nel Prompt AI (Priorità 2)
                  </h4>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-purple-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {activeLog.summary_text}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Globe className="w-10 h-10 text-slate-600" />
                <p className="text-sm font-semibold">Seleziona una ricerca dalla colonna di sinistra o avvia un test.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
