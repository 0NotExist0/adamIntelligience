import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Cpu,
  Layers,
  HardDrive
} from 'lucide-react';
import { POPULAR_MODELS } from '../services/openrouter';
import ModelPickerModal from './ModelPickerModal';
import confetti from 'canvas-confetti';
import { useToast } from './Toast';

export default function CreateChatbotModal({ isOpen, onClose, onChatbotCreated }) {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [chatbotName, setChatbotName] = useState('');
  const [chatbotAvatar, setChatbotAvatar] = useState('🤖');
  const [chatbotTitle, setChatbotTitle] = useState('Assistente AI Intelligente');
  const [systemPrompt, setSystemPrompt] = useState('Sei un assistente AI amichevole, intelligente e molto competente. Rispondi sempre in modo chiaro e utile in italiano.');

  const avatars = ['🤖', '⚡', '🧠', '🌟', '💻', '🚀', '🔮', '🛡️', '🎯', '🐱'];

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && !selectedModel) {
      addToast('Seleziona un modello AI', 'error');
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!chatbotName.trim()) {
      addToast('Inserisci un nome per il chatbot', 'error');
      return;
    }

    const newBot = {
      id: `bot-${Date.now()}`,
      name: chatbotName.trim(),
      avatar: chatbotAvatar,
      model: selectedModel,
      title: chatbotTitle.trim() || chatbotName.trim(),
      systemPrompt: systemPrompt.trim(),
      createdAt: new Date().toISOString(),
      driveSync: true
    };

    onChatbotCreated(newBot);
    addToast(`Chatbot "${newBot.name}" creato con successo!`, 'success');
    confetti({ particleCount: 70, spread: 60 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel bg-slate-900/95 border border-purple-500/40 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25">
              🤖
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Crea Nuovo Chatbot AI</h3>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Passo 1/2: Scegli il Modello AI di OpenRouter' : 'Passo 2/2: Personalità & Nome Chatbot'}
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

        {step === 1 ? (
          /* STEP 1: MODEL SELECTION */
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Modelli Principali:</span>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 hover:underline"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Sfoglia tutti i 400+ Modelli OpenRouter ↗</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {POPULAR_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/15 shadow-md shadow-purple-500/10 scale-[1.01]'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-300 font-mono">
                          {model.provider}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${model.color || 'border-purple-500/30 text-purple-300'}`}>
                          {model.badge || (model.isFree ? '100% FREE' : 'PRO')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{model.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {model.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{model.tag || model.id}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected model preview bar */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Modello Selezionato:</span>
                <span className="font-mono text-purple-300 font-bold">{selectedModel}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px]"
              >
                Cambia
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
              >
                <span>Avanti: Configura Personalità</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: CUSTOMIZATION */
          <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-300">Nome Chatbot</label>
                <input
                  type="text"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="es. Adam AI, Assistente Coding..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Avatar</label>
                <div className="flex gap-1.5 flex-wrap">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setChatbotAvatar(av)}
                      className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center border transition-all ${
                        chatbotAvatar === av
                          ? 'bg-purple-500/30 border-purple-500 text-white scale-105'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">System Prompt (Istruzioni di Comportamento)</label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Spiega come deve rispondere il chatbot..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 shadow-inner resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Indietro</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 text-pink-200" />
                <span>Crea & Salva Chatbot</span>
              </button>
            </div>
          </form>
        )}
        {/* Model Picker Modal */}
        <ModelPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          selectedModelId={selectedModel}
          onSelectModel={(modelId) => {
            setSelectedModel(modelId);
            addToast(`Modello selezionato: "${modelId}"`, 'success');
          }}
        />
      </div>
    </div>
  );
}
