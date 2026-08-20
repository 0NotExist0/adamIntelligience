import React, { useState } from 'react';
import { 
  Bot, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  HardDrive, 
  Download, 
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-react';
import { downloadJSONFile, openGoogleDriveFolder } from '../services/storage';
import { useToast } from '../components/Toast';

export default function ChatbotsManager({ 
  chatbots = [], 
  onOpenCreateChatbot, 
  onDeleteChatbot, 
  onOpenChatWithBot 
}) {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBots = chatbots.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (b.model && b.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportBotToDrive = (bot) => {
    const payload = {
      name: bot.name,
      id: bot.id,
      avatar: bot.avatar,
      title: bot.title,
      model: bot.model,
      systemPrompt: bot.systemPrompt,
      architecture: 'OpenRouter AI Chatbot',
      exportedAt: new Date().toISOString(),
      driveLocation: 'Google Drive / My Drive / AI Chatbots'
    };

    downloadJSONFile(`${bot.name.replace(/\s+/g, '_')}_chatbot.json`, payload);
    addToast(`Chatbot "${bot.name}" esportato! Caricalo sul tuo Google Drive.`, 'success');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">Chatbot AI Studio</h1>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold border border-pink-500/30">
                {chatbots.length} ASSISTENTI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Crea chatbot dedicati, personalizza la personalità e sincronizzali con Google Drive
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

          <button
            onClick={onOpenCreateChatbot}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-pink-200" />
            <span>Crea Nuovo Chatbot</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca chatbot per nome o modello..."
          className="w-full sm:w-80 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
        />
      </div>

      {/* Chatbots Grid */}
      {filteredBots.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <Bot className="w-12 h-12 text-pink-400 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-white">Nessun chatbot configurato</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Crea il tuo primo chatbot AI basato su Llama 3.3 70B, DeepSeek R1 o Gemini 2.0 Flash in 2 semplici passaggi.
          </p>
          <button
            onClick={onOpenCreateChatbot}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crea Chatbot Ora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBots.map((bot) => (
            <div
              key={bot.id}
              className="glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between group hover:border-purple-500/40 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-pink-600/30 text-white flex items-center justify-center text-xl border border-purple-500/30">
                      {bot.avatar || '🤖'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                        {bot.name}
                      </h3>
                      <p className="text-[11px] text-purple-400 font-mono">
                        {bot.model}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ATTIVO
                  </span>
                </div>

                {/* Prompt Preview */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-[9px] text-pink-400 font-bold uppercase tracking-wider block mb-1">
                    Istruzioni Personalità
                  </span>
                  <p className="line-clamp-2 italic text-slate-400">"{bot.systemPrompt}"</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenChatWithBot(bot)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-bold text-xs shadow-md shadow-purple-500/25 active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Apri Chat</span>
                  </button>

                  <button
                    onClick={() => handleExportBotToDrive(bot)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all"
                    title="Esporta su Google Drive"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Drive</span>
                  </button>
                </div>

                <button
                  onClick={() => onDeleteChatbot(bot.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Elimina Chatbot"
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
