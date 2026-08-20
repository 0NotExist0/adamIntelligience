import React, { useState } from 'react';
import { 
  X, 
  Cpu, 
  HardDrive, 
  Sparkles, 
  Check, 
  Sliders,
  Plus
} from 'lucide-react';
import { POPULAR_MODELS } from '../services/openrouter';
import ModelPickerModal from './ModelPickerModal';
import { useToast } from './Toast';
import confetti from 'canvas-confetti';

export default function CreateModelModal({ isOpen, onClose, onModelCreated }) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [baseModel, setBaseModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('Sei un assistente AI specializzato, preciso ed efficiente. Rispondi sempre con spiegazioni chiare e codice pronto all\'uso.');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Inserisci un nome per il modello', 'error');
      return;
    }

    const newModel = {
      id: `model-${Date.now()}`,
      name: name.trim(),
      baseModel,
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      temperature,
      maxTokens,
      tags: [baseModel.split('/')[1] || 'OpenRouter', 'Custom'],
      createdAt: new Date().toISOString(),
      driveSync: true
    };

    onModelCreated(newModel);
    addToast(`Modello "${newModel.name}" creato! Pronto per Google Drive.`, 'success');
    confetti({ particleCount: 70, spread: 60 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Crea Nuovo Modello AI per Google Drive</h3>
              <p className="text-xs text-slate-400">Configura istruzioni, modello base OpenRouter e parametri</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Nome Modello</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Italian Medical AI Assistant, Code Refactor Bot..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Modello Base OpenRouter</label>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="text-purple-400 hover:text-purple-300 font-bold hover:underline"
              >
                Sfoglia 400+ Modelli (Free/Paid) ↗
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="font-mono text-purple-300 font-bold">{baseModel}</span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-semibold text-[11px]"
              >
                Cambia Modello
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Descrizione Modello</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrizione dello scopo e delle capacità del modello..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">System Prompt (Istruzioni di Base)</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Definisci il comportamento, il tono e le conoscenze del modello..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Temperature</span>
                <span className="text-purple-300 font-bold font-mono">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Max Tokens</span>
                <span className="text-purple-300 font-bold font-mono">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="128"
                max="2048"
                step="64"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-2">
            <HardDrive className="w-4 h-4 shrink-0 text-blue-400" />
            <span>Questo modello sarà salvato e potrà essere esportato su Google Drive in formato standard JSON.</span>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            Salva Modello per Google Drive
          </button>
        </form>

        {/* Model Picker Modal */}
        <ModelPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          selectedModelId={baseModel}
          onSelectModel={(modelId) => {
            setBaseModel(modelId);
            addToast(`Modello base impostato su: "${modelId}"`, 'success');
          }}
        />
      </div>
    </div>
  );
}
