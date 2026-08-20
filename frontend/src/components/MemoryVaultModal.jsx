import React, { useState, useEffect } from 'react';
import { 
  X, 
  Brain, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles, 
  Check, 
  Search, 
  HardDrive, 
  Tag, 
  ShieldCheck
} from 'lucide-react';
import { getMemories, saveMemory, deleteMemory, clearAllMemories } from '../services/memory';
import { downloadJSONFile } from '../services/storage';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

export default function MemoryVaultModal({ isOpen, onClose, onMemoriesUpdated }) {
  const { addToast } = useToast();
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState('Preferenze');

  const categories = ['Preferenze', 'Progetto', 'Regole', 'Architettura', 'Appreso', 'Generale'];

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const loadMemories = () => {
    const mems = getMemories();
    setMemories(mems);
    if (onMemoriesUpdated) onMemoriesUpdated(mems);
  };

  if (!isOpen) return null;

  const handleAddMemory = (e) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    const saved = saveMemory(newFact.trim(), newCategory, 'Manuale Utente');
    if (saved) {
      addToast('Nuovo ricordo salvato nella memoria AI!', 'success');
      confetti({ particleCount: 40, spread: 50 });
      setNewFact('');
      loadMemories();
    } else {
      addToast('Questo ricordo esiste già nella memoria.', 'info');
    }
  };

  const handleDelete = (id) => {
    deleteMemory(id);
    loadMemories();
    addToast('Ricordo eliminato', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('Sei sicuro di voler azzerare tutta la memoria dell\'AI?')) {
      clearAllMemories();
      loadMemories();
      addToast('Memoria azzerata', 'info');
    }
  };

  const handleExportToDrive = () => {
    const payload = {
      title: 'AI Studio Pro - Memoria a Lungo Termine',
      exportedAt: new Date().toISOString(),
      memoriesCount: memories.length,
      memories
    };
    downloadJSONFile(`memoria_ai_studio_${new Date().toISOString().slice(0, 10)}.json`, payload);
    addToast('Memoria esportata! Puoi salvarla su Google Drive.', 'success');
  };

  const filteredMemories = memories.filter((m) =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-[85vh] glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Memoria a Lungo Termine dell'AI</h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-500/30">
                  {memories.length} FATTI MEMORIZZATI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                L'AI consulta sempre queste informazioni prima di rispondere e ne salva di nuove in autonomia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToDrive}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
              title="Esporta memoria per Google Drive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Esporta Drive</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Memory Form */}
        <form onSubmit={handleAddMemory} className="p-4 px-6 border-b border-slate-800/80 bg-slate-950/60 space-y-3 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Aggiungi una regola o informazione da ricordare (es. 'Usa sempre Tailwind v4', 'Il nome del progetto è Adam')..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
            />

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!newFact.trim()}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ricorda</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Iniezione automatica attiva su tutti i modelli
            </span>

            {memories.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
              >
                Azzera Tutta la Memoria
              </button>
            )}
          </div>
        </form>

        {/* Memories List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-950/40">
          {filteredMemories.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-2 text-center text-slate-500">
              <Brain className="w-10 h-10 opacity-40" />
              <p className="text-xs">Nessun ricordo trovato nella memoria.</p>
            </div>
          ) : (
            filteredMemories.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/30 flex items-start justify-between gap-3 group transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/30">
                      {m.category}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString('it-IT')} • {m.source || 'AI'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {m.text}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Dimentica questo ricordo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
