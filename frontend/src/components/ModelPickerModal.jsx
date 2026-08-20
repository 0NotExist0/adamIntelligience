import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Cpu, 
  Check, 
  Sparkles, 
  Zap, 
  Layers, 
  Loader2, 
  DollarSign, 
  Gift
} from 'lucide-react';
import { fetchOpenRouterModelsCatalog, CURATED_POPULAR_MODELS } from '../services/openrouter';

export default function ModelPickerModal({ isOpen, onClose, selectedModelId, onSelectModel }) {
  const [models, setModels] = useState(CURATED_POPULAR_MODELS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('free'); // 'free', 'paid', 'all'
  const [selectedProvider, setSelectedProvider] = useState('all');

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const catalog = await fetchOpenRouterModelsCatalog();
      setModels(catalog);
    } catch (e) {
      setModels(CURATED_POPULAR_MODELS);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const providers = ['all', ...new Set(models.map((m) => m.provider).filter(Boolean))];

  const freeModelsCount = models.filter((m) => m.isFree).length;
  const paidModelsCount = models.filter((m) => !m.isFree).length;

  const filteredModels = models.filter((m) => {
    // Tab filter
    if (activeTab === 'free' && !m.isFree) return false;
    if (activeTab === 'paid' && m.isFree) return false;

    // Provider filter
    if (selectedProvider !== 'all' && m.provider !== selectedProvider) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.desc && m.desc.toLowerCase().includes(q)) ||
        (m.provider && m.provider.toLowerCase().includes(q))
      );
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[88vh] glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Catalogo Completo Modelli OpenRouter</h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-500/30">
                  {models.length} MODELLI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Seleziona qualsiasi modello diviso tra 100% Gratuiti e Modelli PRO a Pagamento
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

        {/* Filter Bar */}
        <div className="p-4 px-6 border-b border-slate-800/80 bg-slate-950/60 space-y-3 shrink-0">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('free')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'free'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Modelli GRATUITI ({freeModelsCount})</span>
              </button>

              <button
                onClick={() => setActiveTab('paid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'paid'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Modelli A PAGAMENTO / PRO ({paidModelsCount})</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tutti i Modelli ({models.length})</span>
              </button>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px] hidden sm:inline">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tutti i Provider</option>
                {providers.filter((p) => p !== 'all').map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome modello (es. llama-3.3, deepseek-r1, gpt-4o, claude, qwen, mistral)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
            />
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-purple-300">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs font-semibold">Caricamento catalogo OpenRouter (400+ modelli)...</p>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-slate-400 text-center">
              <Cpu className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Nessun modello trovato</p>
              <p className="text-xs text-slate-500">Prova a modificare i filtri o il testo di ricerca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredModels.map((m) => {
                const isSelected = selectedModelId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/15 scale-[1.01]'
                        : m.isFree
                        ? 'border-emerald-500/30 bg-slate-900/80 hover:border-emerald-500/60 hover:bg-slate-900'
                        : 'border-slate-800 bg-slate-900/60 hover:border-purple-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {m.provider}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {m.isFree ? (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              100% GRATUITO
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                              PRO • A Pagamento
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {m.name}
                        </h4>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          {m.id}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <div className="space-x-2 text-slate-400 font-mono">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          ctx: {m.context_length ? `${Math.round(m.context_length / 1024)}k` : '4k'}
                        </span>
                        <span className="text-[11px] font-semibold text-purple-300">
                          {m.pricingDisplay}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-200 group-hover:bg-purple-600 group-hover:text-white'
                        }`}
                      >
                        {isSelected ? 'Selezionato' : 'Scegli'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
