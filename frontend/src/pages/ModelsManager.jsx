import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  HardDrive, 
  Download, 
  Trash2, 
  MessageSquare, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Sliders,
  Copy
} from 'lucide-react';
import { downloadJSONFile, openGoogleDriveFolder } from '../services/storage';
import { useToast } from '../components/Toast';

export default function ModelsManager({ 
  models = [], 
  onOpenCreateModel, 
  onDeleteModel, 
  onChatWithModel 
}) {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.baseModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportToDrive = (model) => {
    const payload = {
      name: model.name,
      id: model.id,
      baseModel: model.baseModel,
      description: model.description,
      systemPrompt: model.systemPrompt,
      tags: model.tags || [],
      temperature: model.temperature || 0.7,
      maxTokens: model.maxTokens || 1024,
      architecture: 'OpenRouter-Compatible-Format',
      exportedAt: new Date().toISOString(),
      driveLocation: 'Google Drive / My Drive / AI Studio Models'
    };

    downloadJSONFile(`${model.name.replace(/\s+/g, '_')}_model_config.json`, payload);
    addToast(`Configurazione di "${model.name}" esportata! Caricala sul tuo Google Drive.`, 'success');
  };

  const handleCopyPrompt = (prompt, id) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    addToast('System Prompt copiato negli appunti!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">I Miei Modelli AI & Google Drive Vault</h1>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                {models.length} MODELLI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Modelli configurati, istruzioni personalizzate ed esportazione su Google Drive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openGoogleDriveFolder}
            className="px-3.5 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Apri Drive</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            onClick={onOpenCreateModel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Crea Nuovo Modello</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca modelli per nome, modello base o descrizione..."
          className="w-full sm:w-80 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
        />
      </div>

      {/* Models Grid */}
      {filteredModels.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <Cpu className="w-12 h-12 text-purple-400 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white">Nessun modello trovato</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Crea il tuo primo modello personalizzato basato su Llama 3.3, DeepSeek R1 o Qwen e salvalo su Google Drive.
          </p>
          <button
            onClick={onOpenCreateModel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crea Modello Ora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between group hover:border-purple-500/40 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-500/30">
                    {model.baseModel}
                  </span>

                  <span className="text-[10px] text-blue-400 flex items-center gap-1 font-semibold">
                    <HardDrive className="w-3 h-3" />
                    Drive Sync
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {model.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {model.description || 'Nessuna descrizione impostata'}
                  </p>
                </div>

                {/* System Prompt Box */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 relative group/prompt">
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block mb-1">
                    System Instructions
                  </span>
                  <p className="line-clamp-2 italic text-slate-400">"{model.systemPrompt}"</p>
                  <button
                    onClick={() => handleCopyPrompt(model.systemPrompt, model.id)}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Copia prompt"
                  >
                    {copiedId === model.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Hyperparameters Badges */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
                    Temp: <strong className="text-purple-300">{model.temperature ?? 0.7}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
                    Max Tokens: <strong className="text-purple-300">{model.maxTokens ?? 1024}</strong>
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onChatWithModel(model)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chatta</span>
                  </button>

                  <button
                    onClick={() => handleExportToDrive(model)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
                    title="Esporta JSON per Google Drive"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Drive JSON</span>
                  </button>
                </div>

                <button
                  onClick={() => onDeleteModel(model.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Elimina modello"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
