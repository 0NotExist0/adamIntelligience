import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Folder, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Loader2, 
  FileCode, 
  Check, 
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import { useToast } from './Toast';

export default function RepoFileManagerModal({ isOpen, onClose, repoId, repoType = 'model', onRepoUpdated }) {
  const { addToast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [commitMsg, setCommitMsg] = useState('Upload file via HF Studio');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Parse owner and name
  const [owner, name] = (repoId || '').split('/');

  useEffect(() => {
    if (isOpen && owner && name) {
      loadRepoFiles();
    } else {
      setFiles([]);
      setSelectedFile(null);
      setFileContent('');
    }
  }, [isOpen, repoId]);

  const loadRepoFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/repos/${repoType}/${owner}/${name}/files`);
      setFiles(res.data);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante il caricamento dei file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (filePath) => {
    setSelectedFile(filePath);
    setContentLoading(true);
    try {
      const res = await axios.get(`/api/repos/${repoType}/${owner}/${name}/raw-file`, {
        params: { path: filePath }
      });
      setFileContent(res.data.content);
    } catch (err) {
      setFileContent('Impossibile caricare il contenuto di questo file (potrebbe essere un file binario o di grandi dimensioni).');
    } finally {
      setContentLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path_in_repo', file.name);
    formData.append('commit_message', commitMsg);

    setUploadLoading(true);
    try {
      await axios.post(`/api/repos/${repoType}/${owner}/${name}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addToast(`File '${file.name}' caricato con successo!`, 'success');
      loadRepoFiles();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante l\'upload del file', 'error');
    } finally {
      setUploadLoading(false);
      e.target.value = null;
    }
  };

  const handleDeleteFile = async (filePath) => {
    if (!confirm(`Sei sicuro di voler eliminare il file '${filePath}' dal repository?`)) return;

    try {
      await axios.delete(`/api/repos/${repoType}/${owner}/${name}/delete-file`, {
        params: { path: filePath }
      });
      addToast(`File '${filePath}' rimosso dal repository`, 'success');
      if (selectedFile === filePath) {
        setSelectedFile(null);
        setFileContent('');
      }
      loadRepoFiles();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante l\'eliminazione del file', 'error');
    }
  };

  const handleDeleteEntireRepo = async () => {
    try {
      await axios.delete(`/api/repos/${repoType}/${owner}/${name}`);
      addToast(`Repository '${repoId}' eliminato definitivamente`, 'success');
      onRepoUpdated();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Errore durante l\'eliminazione del repo', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              📁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">{repoId}</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {repoType}
                </span>
              </div>
              <p className="text-xs text-slate-400">File Manager & Repository Explorer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Delete entire repo trigger */}
            {deleteConfirm ? (
              <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-rose-300 font-semibold">Confermi eliminazione?</span>
                <button
                  onClick={handleDeleteEntireRepo}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Sì, elimina
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-500/20 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Repo</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Explorer & File View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Files Tree & Upload */}
          <div className="w-1/3 border-r border-slate-800 flex flex-col justify-between bg-slate-950/30">
            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>File nel Repo ({files.length})</span>
                <button 
                  onClick={loadRepoFiles}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Ricarica
                </button>
              </div>

              {loading ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
                  Caricamento file...
                </div>
              ) : files.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Nessun file presente. Carica il primo file!
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => handleViewFile(file.path)}
                    className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      selectedFile === file.path
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate font-mono">{file.path}</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.path);
                        }}
                        title="Elimina file"
                        className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload Area */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
              <label className="w-full flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-slate-900 transition-all text-center">
                {uploadLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-amber-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">Carica un file</span>
                    <span className="text-[10px] text-slate-500">Pesi, configs, script, dataset</span>
                  </>
                )}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadLoading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Right Column: File Content Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950/60 overflow-hidden">
            {selectedFile ? (
              <>
                <div className="p-3 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-mono">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>{selectedFile}</span>
                  </div>
                  <a
                    href={`https://huggingface.co/${repoType === 'dataset' ? 'datasets/' : repoType === 'space' ? 'spaces/' : ''}${repoId}/blob/main/${selectedFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Visualizza su Hugging Face
                  </a>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  {contentLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400 mr-2" />
                      Caricamento anteprima...
                    </div>
                  ) : (
                    <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs space-y-2">
                <FileCode className="w-12 h-12 text-slate-700" />
                <p className="font-semibold text-slate-400">Seleziona un file dalla lista a sinistra</p>
                <p className="text-[11px] max-w-sm">
                  Puoi visualizzare il codice sorgente, le configurazioni o i file README direttamente all'interno della dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
