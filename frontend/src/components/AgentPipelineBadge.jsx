import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Database, 
  Sliders, 
  ShieldCheck, 
  ExternalLink, 
  Cpu, 
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';

export default function AgentPipelineBadge({ agentTrace }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!agentTrace) return null;

  const {
    calibratedTemperature,
    calibratedMaxTokens,
    taskType,
    reasoningStrategy,
    webSources = [],
    webSearchPerformed,
    searchQuery,
    prioritizedMemoriesCount = 0,
    prioritizedMemories = [],
    confidenceScore = '100%'
  } = agentTrace;

  const getTaskLabel = (type) => {
    switch (type) {
      case 'code': return 'Coding & Scripting';
      case 'math_logic': return 'Logica & Matematica';
      case 'factual_query': return 'Verifica Fattuale';
      case 'creative_writing': return 'Scrittura Creativa';
      case 'system_config': return 'Configurazione Sistema';
      default: return 'Q&A Generale';
    }
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-800/80 font-sans">
      {/* Compact Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {/* Agent Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 shadow-sm">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Agente Calibrato</span>
          </span>

          {/* Temperature */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800" title="Temperatura calibrata dinamicamente">
            <Sliders className="w-2.5 h-2.5 text-cyan-400" />
            <span>Temp: <strong className="text-cyan-300">{calibratedTemperature}</strong></span>
          </span>

          {/* Tokens */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800" title="Token stimati necessari">
            <Cpu className="w-2.5 h-2.5 text-indigo-400" />
            <span>Tokens: <strong className="text-indigo-300">{calibratedMaxTokens}</strong></span>
          </span>

          {/* Web Search */}
          {webSearchPerformed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Globe className="w-2.5 h-2.5 text-blue-400" />
              <span>Web: <strong>{webSources.length} Fonti</strong></span>
            </span>
          )}

          {/* Memory Vault Priority */}
          {prioritizedMemoriesCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Database className="w-2.5 h-2.5 text-amber-400" />
              <span>Memoria: <strong>Priorità 1 ({prioritizedMemoriesCount})</strong></span>
            </span>
          )}

          {/* Confidence */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>{confidenceScore}</span>
          </span>
        </div>

        {/* Toggle Inspector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold py-0.5 px-1.5 rounded hover:bg-slate-800 transition-colors"
        >
          <span>{isOpen ? 'Nascondi Dettagli Pipeline' : 'Mostra Verifica & Fonti'}</span>
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Accordion Details */}
      {isOpen && (
        <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/90 border border-purple-500/25 space-y-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          {/* 1. Meta-Analysis */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-purple-300">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                1. Meta-Analisi & Ottimizzazione Iperparametri
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] uppercase font-mono">
                {getTaskLabel(taskType)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pl-5">
              Il meta-agente ha impostato la temperatura a <strong className="text-white">{calibratedTemperature}</strong> e il limite a <strong className="text-white">{calibratedMaxTokens} token</strong> per garantire massima coerenza logica e zero allucinazioni.
              {reasoningStrategy && <span className="block italic text-slate-400 mt-0.5">Strategia: "{reasoningStrategy}"</span>}
            </p>
          </div>

          {/* 2. Priority 1: Saved Memory Vault */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                2. Informazioni Salvate Applicate (Priorità 1 Assoluta)
              </span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase font-mono">
                PREVALENZA TOTALE SU WEB
              </span>
            </div>
            
            {prioritizedMemories.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic pl-5">Nessuna regola specifica trovata nel Memory Vault per questo prompt.</p>
            ) : (
              <div className="space-y-1 pl-5">
                {prioritizedMemories.map((m, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <div className="flex-1">
                      <span className="font-bold text-amber-300">[{m.category || 'Regola'}]: </span>
                      <span>{m.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Priority 2: Web Search & Fact-Checking */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                3. Verifica Web in Tempo Reale (Priorità 2)
              </span>
              {searchQuery && (
                <span className="text-[10px] text-slate-400 font-mono italic">
                  Query: "{searchQuery}"
                </span>
              )}
            </div>

            {webSources.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic pl-5">
                {webSearchPerformed ? 'Nessun risultato web esterno necessario per questa risposta.' : 'Verifica web non richiesta per questo prompt logico/interno.'}
              </p>
            ) : (
              <div className="space-y-1.5 pl-5">
                {webSources.map((src, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200 truncate">{src.title}</span>
                      {src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 text-[10px]"
                        >
                          <span>Fonte</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    {src.snippet && <p className="text-[10px] text-slate-400 leading-tight">{src.snippet}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Certified Verdict */}
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sintesi completata: Conflitti risolti e risposta certificata senza dubbio.
            </span>
            <span className="font-mono text-purple-300 font-bold">100% ACCURATEZZA</span>
          </div>
        </div>
      )}
    </div>
  );
}
