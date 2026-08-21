import React from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Bot, 
  Database, 
  Zap, 
  HardDrive, 
  Settings, 
  Sparkles, 
  ExternalLink,
  FolderDown,
  Brain
} from 'lucide-react';
import { openGoogleDriveFolder } from '../services/storage';

export default function Sidebar({ activeTab, onNavigate, onOpenCopilot, onOpenMemory, stats }) {
  const navItems = [
    { id: 'dashboard', label: 'Panoramica Hub', icon: LayoutDashboard, badge: null },
    { id: 'models', label: 'Modelli & Drive', icon: Cpu, badge: stats?.modelsCount || null },
    { id: 'chatbots', label: 'Chatbot Studio', icon: Bot, badge: stats?.chatbotsCount || null },
    { id: 'datasets', label: 'Dataset di Training', icon: Database, badge: stats?.datasetsCount || null },
    { id: 'playground', label: 'Playground AI', icon: Zap, badge: '400+ AI' },
    { id: 'settings', label: 'Impostazioni & Chiavi', icon: Settings, badge: null }
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Navigation items */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 block">
            Strumenti Principali
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Memory Vault Widget */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-900/80 border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>Memoria Attiva</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            L'AI consulta i fatti memorizzati prima di ogni risposta.
          </p>
          <button
            onClick={onOpenMemory}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[11px] font-bold transition-all"
          >
            <span>Gestisci Memoria</span>
          </button>
        </div>

        {/* Google Drive Fast Access Widget */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-900/80 border border-blue-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Google Drive Vault</span>
            </div>
            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
              SYNC
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            I tuoi modelli, pesi e dataset possono essere salvati e scaricati direttamente su Drive.
          </p>
          <button
            onClick={openGoogleDriveFolder}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors"
          >
            <span>Apri Drive Personale</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* AI Copilot bottom prompt */}
      <div className="pt-4 border-t border-slate-800/80">
        <button
          onClick={onOpenCopilot}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 hover:border-purple-500/60 text-left space-y-1.5 group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover:rotate-12 transition-transform" />
              <span>AI Copilot Studio</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-400">
            Chiedimi di creare modelli, scrivere prompt o generare dataset!
          </p>
        </button>
      </div>
    </aside>
  );
}
