import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Zap, 
  HardDrive, 
  ExternalLink, 
  Bot, 
  Cpu,
  Layers,
  Settings,
  LogOut,
  UserCheck
} from 'lucide-react';
import { getOpenRouterKey } from '../services/openrouter';

export default function Navbar({ 
  user,
  onLogout,
  onOpenCopilot, 
  onOpenCreateChatbot, 
  onOpenCreateModel, 
  onOpenOpenRouter, 
  onOpenMemory,
  memoryCount = 0,
  onNavigate 
}) {
  const hasKey = Boolean(getOpenRouterKey());

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between bg-slate-950/85 backdrop-blur-xl">
      {/* Left: Brand */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform flex items-center justify-center text-white text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-300 bg-clip-text text-transparent">
                AI Studio Pro
              </span>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Drive + Memory
              </span>
            </div>
            <p className="text-xs text-slate-400">Hub Modelli AI, Memoria Persistente & Google Drive</p>
          </div>
        </div>
      </div>

      {/* Center Nav links */}
      <div className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80">
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('strikes')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-600/20 transition-all flex items-center gap-1.5"
        >
          <span>📢 Scioperi</span>
          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full font-bold border border-rose-500/30">
            LIVE
          </span>
        </button>
        <button
          onClick={() => onNavigate('models')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          Modelli & Drive
        </button>
        <button
          onClick={() => onNavigate('chatbots')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          Chatbot Studio
        </button>
        <button
          onClick={() => onNavigate('datasets')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          Dataset
        </button>
        <button
          onClick={() => onNavigate('playground')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          Playground AI
        </button>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2.5">
        {/* Memory Vault Button */}
        <button
          onClick={onOpenMemory}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
          title="Gestisci la memoria a lungo termine dell'AI"
        >
          <span className="text-sm">🧠</span>
          <span className="hidden sm:inline">Memoria AI</span>
          <span className="text-[10px] bg-purple-500/30 px-1.5 py-0.2 rounded-full font-mono">
            {memoryCount}
          </span>
        </button>

        {/* Google Drive Link */}
        <a
          href="https://drive.google.com/drive/my-drive"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all"
          title="Apri Google Drive"
        >
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span>Drive</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>

        {/* OpenRouter Key Setup */}
        <button
          onClick={onOpenOpenRouter}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
            hasKey
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
          }`}
          title="Configura chiave OpenRouter"
        >
          <Zap className={`w-3.5 h-3.5 ${hasKey ? 'text-emerald-400' : 'text-purple-400 animate-pulse'}`} />
          <span>{hasKey ? 'OpenRouter Attivo' : 'Chiave OpenRouter'}</span>
        </button>

        {/* Crea Modello Button */}
        <button
          onClick={onOpenCreateModel}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span>Nuovo Modello</span>
        </button>

        {/* Crea Chatbot Button */}
        <button
          onClick={onOpenCreateChatbot}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 border border-purple-400/30 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
          <span>Crea Chatbot</span>
        </button>

        {/* AI Copilot Button */}
        <button
          onClick={onOpenCopilot}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 active:scale-95 transition-all"
          title="Apri AI Copilot"
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* Google User Profile & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 py-1 px-2.5 rounded-2xl">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden xl:block text-left">
                <span className="text-[11px] font-bold text-white leading-none block">{user.name}</span>
                <span className="text-[9px] text-slate-400 leading-none block truncate max-w-[100px]">{user.email}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition-all active:scale-95"
              title="Disconnetti account Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
