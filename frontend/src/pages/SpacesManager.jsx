import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  RotateCw, 
  Pause, 
  Play, 
  ExternalLink, 
  Folder, 
  Eye, 
  Lock, 
  Globe, 
  Heart, 
  Loader2, 
  Maximize2, 
  X,
  Sparkles,
  Server
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

export default function SpacesManager({ user, onOpenCreateModal, onOpenCreateChatbot, onOpenLivePreview, onInspectRepo }) {
  const { addToast } = useToast();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  
  // Live Preview Modal
  const [previewSpace, setPreviewSpace] = useState(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/spaces');
      setSpaces(res.data);
    } catch (err) {
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (spaceId) => {
    const [owner, name] = spaceId.split('/');
    setActionLoading((prev) => ({ ...prev, [spaceId]: 'restarting' }));
    try {
      await axios.post(`/api/spaces/${owner}/${name}/restart`);
      addToast(`Space '${spaceId}' in riavvio...`, 'success');
      setTimeout(loadSpaces, 2000);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante il riavvio dello space', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [spaceId]: null }));
    }
  };

  const handlePause = async (spaceId) => {
    const [owner, name] = spaceId.split('/');
    setActionLoading((prev) => ({ ...prev, [spaceId]: 'pausing' }));
    try {
      await axios.post(`/api/spaces/${owner}/${name}/pause`);
      addToast(`Space '${spaceId}' sospeso`, 'info');
      setTimeout(loadSpaces, 2000);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante la sospensione', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [spaceId]: null }));
    }
  };

  const getStageBadge = (stage) => {
    const s = (stage || 'RUNNING').toUpperCase();
    if (s.includes('RUN')) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          RUNNING
        </span>
      );
    } else if (s.includes('BUILD') || s.includes('START')) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          BUILDING
        </span>
      );
    } else if (s.includes('SLEEP') || s.includes('PAUS')) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
          SLEEPING
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-bold border border-rose-500/30">
        ERROR
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Gestione Spaces (AI Web Apps)</h1>
            <p className="text-xs text-slate-400">Monitora, riavvia ed esegui le tue applicazioni Gradio, Streamlit e Docker</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadSpaces}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            title="Aggiorna stato spaces"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreateChatbot}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 border border-purple-400/30 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-pink-200 animate-pulse" />
            <span>Crea Chatbot Space</span>
          </button>

          <button
            onClick={() => onOpenCreateModal('space')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuovo Space Vuoto</span>
          </button>
        </div>
      </div>

      {/* Spaces Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span>Caricamento Spaces in corso...</span>
        </div>
      ) : spaces.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <Cpu className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Nessuno Space attivo</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Non hai ancora creato alcuno Space su Hugging Face. Puoi crearne uno in pochi secondi con Gradio o Streamlit!
          </p>
          <button
            onClick={() => onOpenCreateModal('space')}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Crea il tuo primo Space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {spaces.map((space) => {
            const isLoading = Boolean(actionLoading[space.id]);
            return (
              <div
                key={space.id}
                className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cyan-400">
                        {space.author || space.id.split('/')[0]}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 uppercase">
                        {space.sdk || 'Gradio'}
                      </span>
                    </div>

                    {getStageBadge(space.stage)}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors break-all">
                      {space.id}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Server className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hardware: <strong className="text-slate-300">{space.hardware || 'CPU-basic'}</strong></span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenLivePreview ? onOpenLivePreview(space.id) : setPreviewSpace(space.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-300" />
                      <span>Chatbot Live</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRestart(space.id)}
                      disabled={isLoading}
                      title="Riavvia Space"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => handlePause(space.id)}
                      disabled={isLoading}
                      title="Sospendi / Pausa"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onInspectRepo(space.id, 'space')}
                      title="File sorgente dello Space"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`https://huggingface.co/spaces/${space.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Apri su Hugging Face"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Embedded Preview Modal */}
      {previewSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl h-[90vh] glass-panel bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  🚀
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {previewSpace}
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live App
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Anteprima incorporata interattiva</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://huggingface.co/spaces/${previewSpace}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 mr-2"
                >
                  Apri in nuova scheda <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setPreviewSpace(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-slate-950 relative">
              <iframe
                src={`https://${previewSpace.replace('/', '-')}.hf.space`}
                title="Space Live Preview"
                className="w-full h-full border-0"
                allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
