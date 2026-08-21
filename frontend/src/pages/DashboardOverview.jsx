import React from 'react';
import { 
  Cpu, 
  Bot, 
  Database, 
  Zap, 
  HardDrive, 
  Sparkles, 
  Plus, 
  ArrowUpRight, 
  Download, 
  ExternalLink,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { openGoogleDriveFolder } from '../services/storage';

export default function DashboardOverview({
  stats,
  models = [],
  chatbots = [],
  datasets = [],
  onNavigate,
  onOpenCreateModel,
  onOpenCreateChatbot,
  onOpenOpenRouter,
  onOpenChatWithModel
}) {
  const statCards = [
    {
      title: 'Modelli Salvati & Drive',
      value: models.length,
      sub: 'Pronti per export & deploy',
      icon: Cpu,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300'
    },
    {
      title: 'Chatbot AI Attivi',
      value: chatbots.length,
      sub: 'Conversazioni e assistenti',
      icon: Bot,
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300'
    },
    {
      title: 'Dataset di Training',
      value: datasets.length,
      sub: 'Istruzioni & coppie QA',
      icon: Database,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300'
    },
    {
      title: 'Modelli OpenRouter',
      value: '100+',
      sub: 'DeepSeek R1, Llama 3.3, Claude',
      icon: Zap,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden glass-panel rounded-3xl p-8 border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Studio Pro • OpenRouter & Google Drive Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Crea, allena e gestisci modelli AI salvandoli direttamente su <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Google Drive</span>
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Sfrutta la potenza di <strong>DeepSeek R1, Llama 3.3 70B, Claude 3.5 Sonnet e GPT-4o</strong> via OpenRouter. Crea chatbot personalizzati, genera dataset sintetici e scarica tutto su Google Drive o importa su Vercel.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenCreateChatbot}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Crea Nuovo Chatbot</span>
            </button>

            <button
              onClick={onOpenCreateModel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Crea Modello per Drive</span>
            </button>

            <button
              onClick={openGoogleDriveFolder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold text-xs transition-all"
            >
              <HardDrive className="w-4 h-4" />
              <span>Apri Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className={`glass-panel p-5 rounded-2xl border bg-gradient-to-br ${s.color} flex items-center justify-between shadow-lg`}
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">{s.title}</span>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <p className="text-[11px] text-slate-400">{s.sub}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => onNavigate('strikes')}
          className="glass-card p-6 rounded-3xl border border-rose-500/30 hover:border-rose-500/60 cursor-pointer group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
            📢
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
              Monitor Scioperi
            </h3>
            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Radar per tutte le 8 categorie (Treni, TPL, Aerei, Sanità, Scuola) con switch automatico.
          </p>
        </div>

        <div 
          onClick={onOpenCreateChatbot}
          className="glass-card p-6 rounded-3xl border border-purple-500/30 hover:border-purple-500/60 cursor-pointer group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
            🤖
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
            Crea Chatbot AI
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configura un assistente conversazionale con avatar, prompt personalizzato e modello OpenRouter.
          </p>
        </div>

        <div 
          onClick={onOpenCreateModel}
          className="glass-card p-6 rounded-3xl border border-blue-500/30 hover:border-blue-500/60 cursor-pointer group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
            💾
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
            Modello per Drive
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Definisci pesi, istruzioni e architettura per esportarli con 1 click nel tuo Google Drive.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('datasets')}
          className="glass-card p-6 rounded-3xl border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer group transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
            📊
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
            Dataset con AI
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Genera automaticamente coppie di istruzioni e risposte sintetiche per il fine-tuning.
          </p>
        </div>
      </div>

      {/* Recent Models & Chatbots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">I Tuoi Modelli & Chatbot</h2>
            <p className="text-xs text-slate-400">Modelli configurati e sincronizzabili con Google Drive</p>
          </div>

          <button
            onClick={() => onNavigate('models')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
          >
            <span>Vedi tutti</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.slice(0, 3).map((m) => (
            <div
              key={m.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 group hover:border-purple-500/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30 font-mono">
                    {m.baseModel.split('/')[1] || m.baseModel}
                  </span>
                  <span className="text-[10px] text-blue-400 flex items-center gap-1 font-semibold">
                    <HardDrive className="w-3 h-3" />
                    Google Drive Ready
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {m.description || m.systemPrompt}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onOpenChatWithModel(m)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all"
                >
                  💬 Chatta Subito
                </button>

                <span className="text-[10px] text-slate-500">
                  {new Date(m.createdAt).toLocaleDateString('it-IT')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
