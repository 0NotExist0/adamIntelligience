import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Sparkles, 
  HardDrive, 
  Download, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  Table, 
  FileText,
  Check
} from 'lucide-react';
import { downloadJSONFile, downloadJSONLFile, openGoogleDriveFolder } from '../services/storage';
import { sendOpenRouterChat } from '../services/openrouter';
import { useToast } from '../components/Toast';

export default function DatasetsManager({ 
  datasets = [], 
  onSaveDataset, 
  onDeleteDataset 
}) {
  const { addToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');
  const [newDatasetFormat, setNewDatasetFormat] = useState('JSONL');

  const handleExportToDrive = (dataset) => {
    if (dataset.format === 'JSONL' && Array.isArray(dataset.data)) {
      downloadJSONLFile(`${dataset.name.replace(/\s+/g, '_')}.jsonl`, dataset.data);
    } else {
      downloadJSONFile(`${dataset.name.replace(/\s+/g, '_')}.json`, dataset);
    }
    addToast(`Dataset "${dataset.name}" esportato! Caricalo su Google Drive.`, 'success');
  };

  const handleGenerateSyntheticDataset = async (e) => {
    e.preventDefault();
    if (!topicPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const prompt = `Sei un data generator AI per fine-tuning. Crea un dataset di 5 coppie "instruction" e "output" di altissima qualità sul seguente argomento: "${topicPrompt}".
Rispondi ESCLUSIVAMENTE con un array JSON valido nel seguente formato:
[
  {"instruction": "domanda o compito 1", "output": "risposta dettagliata 1"},
  {"instruction": "domanda o compito 2", "output": "risposta dettagliata 2"}
]`;

      const res = await sendOpenRouterChat({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500
      });

      if (res.success) {
        let parsedData = [];
        try {
          const match = res.content.match(/\[[\s\S]*\]/);
          if (match) {
            parsedData = JSON.parse(match[0]);
          }
        } catch (err) {
          // fallback
        }

        if (parsedData.length > 0) {
          const newDataset = {
            id: `dataset-${Date.now()}`,
            name: `Dataset AI: ${topicPrompt.slice(0, 25)}`,
            format: 'JSONL',
            rowsCount: parsedData.length,
            description: `Generato automaticamente con AI per l'argomento: "${topicPrompt}"`,
            data: parsedData,
            createdAt: new Date().toISOString(),
            driveSync: true
          };

          onSaveDataset(newDataset);
          setTopicPrompt('');
          addToast(`Dataset "${newDataset.name}" generato con successo!`, 'success');
        } else {
          addToast('Generazione completata, ma il formato non era JSON standard.', 'warning');
        }
      } else {
        addToast(res.error || 'Errore durante la generazione del dataset', 'error');
      }
    } catch (err) {
      addToast('Errore di connessione a OpenRouter', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">Dataset di Training & Google Drive</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                {datasets.length} DATASET
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Crea, genera sinteticamente con AI ed esporta dataset per il fine-tuning su Google Drive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openGoogleDriveFolder}
            className="px-3.5 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* AI Synthetic Generator Box */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Generatore Dataset Sintetico con AI</h3>
            <p className="text-xs text-slate-400">Inserisci un argomento e OpenRouter genererà un dataset strutturato per te</p>
          </div>
        </div>

        <form onSubmit={handleGenerateSyntheticDataset} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            placeholder="Es: Domande e risposte su Python FastAPI, customer care e-commerce, diritto societario..."
            disabled={isGenerating}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
          />

          <button
            type="submit"
            disabled={isGenerating || !topicPrompt.trim()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Generazione in corso...' : 'Genera Dataset'}</span>
          </button>
        </form>
      </div>

      {/* Datasets Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200">Dataset Salvati</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between group hover:border-emerald-500/40 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    {dataset.format || 'JSONL'}
                  </span>

                  <span className="text-[10px] text-slate-400 font-semibold">
                    {dataset.rowsCount || (dataset.data ? dataset.data.length : 0)} RIGHE
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {dataset.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {dataset.description || 'Nessuna descrizione impostata'}
                  </p>
                </div>

                {/* Preview sample */}
                {dataset.data && dataset.data.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                      Esempio Record #1
                    </span>
                    <p className="text-slate-300 font-semibold truncate">
                      Q: {dataset.data[0].instruction || dataset.data[0].prompt || 'Istruzione'}
                    </p>
                    <p className="text-slate-400 text-[10px] line-clamp-2">
                      A: {dataset.data[0].output || dataset.data[0].response || 'Risposta'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleExportToDrive(dataset)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
                  title="Esporta su Google Drive"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Esporta su Drive</span>
                </button>

                <button
                  onClick={() => onDeleteDataset(dataset.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Elimina Dataset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
