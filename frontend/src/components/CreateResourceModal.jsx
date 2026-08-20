import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Database, 
  Cpu, 
  Lock, 
  Globe, 
  Sparkles, 
  Loader2, 
  Check,
  Tag
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export default function CreateResourceModal({ isOpen, onClose, initialType = 'model', user, onSuccess }) {
  const { addToast } = useToast();
  const [resourceType, setResourceType] = useState(initialType);
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [license, setLicense] = useState('apache-2.0');
  const [spaceSdk, setSpaceSdk] = useState('gradio');
  const [spaceHardware, setSpaceHardware] = useState('cpu-basic');
  const [tagsInput, setTagsInput] = useState('pytorch, transformers');
  const [loading, setLoading] = useState(false);

  // Sync initialType when modal opens
  React.useEffect(() => {
    if (initialType) setResourceType(initialType);
  }, [initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoName.trim()) {
      addToast('Inserisci il nome del repository', 'error');
      return;
    }

    const cleanName = repoName.trim().replace(/\s+/g, '-');
    const repoId = cleanName.includes('/') ? cleanName : `${user?.name || 'user'}/${cleanName}`;

    setLoading(true);

    try {
      if (resourceType === 'model') {
        const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        const readmeContent = `---\nlicense: ${license}\ntags:\n${tags.map((t) => `  - ${t}`).join('\n')}\n---\n\n# ${cleanName}\n\nModello creato tramite la Dashboard Moderna Hugging Face.\n\n## Descrizione\nInserisci qui la documentazione del modello.\n`;
        
        await axios.post('/api/models/create', {
          repo_id: repoId,
          private: isPrivate,
          license: license,
          tags: tags,
          readme_content: readmeContent
        });

        addToast(`Modello '${repoId}' creato con successo!`, 'success');
      } else if (resourceType === 'dataset') {
        const readmeContent = `---\nlicense: ${license}\n---\n\n# Dataset: ${cleanName}\n\nDataset creato tramite la Dashboard Moderna Hugging Face.\n`;
        
        await axios.post('/api/datasets/create', {
          repo_id: repoId,
          private: isPrivate,
          readme_content: readmeContent
        });

        addToast(`Dataset '${repoId}' creato con successo!`, 'success');
      } else if (resourceType === 'space') {
        await axios.post('/api/spaces/create', {
          repo_id: repoId,
          sdk: spaceSdk,
          hardware: spaceHardware,
          private: isPrivate
        });

        addToast(`Space '${repoId}' creato con successo!`, 'success');
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      onSuccess();
      onClose();
      setRepoName('');
    } catch (err) {
      addToast(err.response?.data?.detail || `Errore durante la creazione di ${resourceType}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg">
              {resourceType === 'model' && <Layers className="w-5 h-5 text-amber-400" />}
              {resourceType === 'dataset' && <Database className="w-5 h-5 text-emerald-400" />}
              {resourceType === 'space' && <Cpu className="w-5 h-5 text-cyan-400" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Crea Nuovo {resourceType === 'model' ? 'Modello' : resourceType === 'dataset' ? 'Dataset' : 'Space AI'}
              </h3>
              <p className="text-xs text-slate-400">Configura il repository su Hugging Face Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 my-4">
          <button
            type="button"
            onClick={() => setResourceType('model')}
            className={`p-3 rounded-xl border text-left transition-all ${
              resourceType === 'model'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 mb-1.5 text-amber-400" />
            <div className="text-xs font-bold">Modello</div>
            <div className="text-[10px] text-slate-500">Pesi & Architetture</div>
          </button>

          <button
            type="button"
            onClick={() => setResourceType('dataset')}
            className={`p-3 rounded-xl border text-left transition-all ${
              resourceType === 'dataset'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-md'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 mb-1.5 text-emerald-400" />
            <div className="text-xs font-bold">Dataset</div>
            <div className="text-[10px] text-slate-500">Dati & Dataset Cards</div>
          </button>

          <button
            type="button"
            onClick={() => setResourceType('space')}
            className={`p-3 rounded-xl border text-left transition-all ${
              resourceType === 'space'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-md'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 mb-1.5 text-cyan-400" />
            <div className="text-xs font-bold">Space AI</div>
            <div className="text-[10px] text-slate-500">Gradio, Streamlit, Docker</div>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Repo Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Nome Repository</label>
            <div className="flex items-center">
              <span className="bg-slate-950 border border-r-0 border-slate-800 text-slate-400 text-xs px-3 py-2.5 rounded-l-xl font-mono">
                {user?.name || 'username'} /
              </span>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="il-mio-nuovo-progetto"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-r-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Space Specific: SDK & Hardware */}
          {resourceType === 'space' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Framework / SDK</label>
                <select
                  value={spaceSdk}
                  onChange={(e) => setSpaceSdk(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="gradio">Gradio (Python)</option>
                  <option value="streamlit">Streamlit (Python)</option>
                  <option value="docker">Docker Container</option>
                  <option value="static">HTML / Static</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Hardware Gratuito</label>
                <select
                  value={spaceHardware}
                  onChange={(e) => setSpaceHardware(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="cpu-basic">CPU basic (2 vCPU, 16GB RAM) - Gratuito</option>
                  <option value="cpu-upgrade">CPU upgrade (8 vCPU, 32GB RAM)</option>
                  <option value="t4-small">Nvidia T4 GPU (16GB VRAM)</option>
                </select>
              </div>
            </div>
          )}

          {/* Model Specific: License & Tags */}
          {resourceType === 'model' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Licenza</label>
                <select
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="apache-2.0">Apache 2.0</option>
                  <option value="mit">MIT</option>
                  <option value="gpl-3.0">GPL 3.0</option>
                  <option value="cc-by-4.0">Creative Commons BY 4.0</option>
                  <option value="other">Altra Licenza</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tag Chiave</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="pytorch, llm, vision"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Visibility: Public or Private */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Visibilità Repository</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  !isPrivate
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Pubblico</div>
                  <div className="text-[10px] text-slate-500">Visibile a chiunque sulla community</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  isPrivate
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Privato</div>
                  <div className="text-[10px] text-slate-500">Accessibile solo da te</div>
                </div>
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !repoName.trim()}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 stroke-[2.5]" />}
            <span>{loading ? 'Creazione in corso...' : `Crea ${resourceType.toUpperCase()} su Hugging Face`}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
