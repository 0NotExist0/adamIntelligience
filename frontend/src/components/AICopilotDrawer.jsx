import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  Cpu, 
  Trash2, 
  Loader2, 
  Copy, 
  Check, 
  HardDrive,
  Code,
  Globe
} from 'lucide-react';
import { POPULAR_MODELS, sendOpenRouterChat } from '../services/openrouter';
import { runAgentChatPipeline } from '../services/agentPipeline';
import AgentPipelineBadge from './AgentPipelineBadge';
import { useToast } from './Toast';

const COPILOT_SYSTEM_PROMPT = `Sei l'Assistente AI Copilot Ufficiale di "AI Studio Pro" (OpenRouter & Google Drive).
Sei un esperto di Machine Learning, LLM (DeepSeek R1, Llama 3.3, Claude 3.5 Sonnet, GPT-4o, Qwen Coder), prompt engineering, dataset e archiviazione modelli per Google Drive.
Rispondi in modo chiaro, utile, professionale ed entusiasta in Italiano.

Puoi eseguire azioni speciali per l'utente restituendo un blocco JSON:
\`\`\`action
{
  "action": "create_model",
  "name": "Nome Modello",
  "baseModel": "meta-llama/llama-3.3-70b-instruct:free",
  "description": "Descrizione",
  "systemPrompt": "Istruzioni"
}
\`\`\`
oppure per un chatbot:
\`\`\`action
{
  "action": "create_chatbot",
  "name": "Nome Chatbot",
  "avatar": "🤖",
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "systemPrompt": "Istruzioni"
}
\`\`\`
oppure per un dataset:
\`\`\`action
{
  "action": "create_dataset",
  "name": "Nome Dataset",
  "format": "JSONL",
  "description": "Descrizione",
  "data": [{"instruction": "q1", "output": "a1"}]
}
\`\`\`
`;

export default function AICopilotDrawer({ 
  isOpen, 
  onClose, 
  onModelCreated, 
  onChatbotCreated, 
  onDatasetCreated 
}) {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ciao! Sono il tuo **AI Copilot Studio**. ⚡🤖\n\nPosso aiutarti a:\n- **Creare modelli personalizzati** per Google Drive\n- **Creare Chatbot AI** basati su DeepSeek R1, Llama 3.3 o Gemini 2.0\n- **Generare dataset sintetici** di training\n- **Scrivere codice** Python, JavaScript o React\n\nCosa vorresti realizzare?`
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3.3-70b-instruct:free');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [agentStep, setAgentStep] = useState('');
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Crea un modello per Drive chiamato 'Esperto Finanza Personale'",
    "Crea un chatbot amichevole chiamato 'Adam Assistente'",
    "Genera un dataset di 5 domande/risposte su React 19",
    "Qual è il miglior modello per scrivere codice su OpenRouter?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMessage = { role: 'user', content: textToSend.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);
    setAgentStep('Calibrazione parametri...');

    try {
      const history = newMessages
        .filter((m, idx) => !(idx === 0 && m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await runAgentChatPipeline({
        prompt: textToSend.trim(),
        messages: [
          { role: 'system', content: COPILOT_SYSTEM_PROMPT },
          ...history
        ],
        model: selectedModel,
        onProgressStep: (s) => setAgentStep(s.label)
      });

      if (res.success) {
        let content = res.content;

        // Check for action blocks
        const actionMatch = content.match(/```action\s*([\s\S]*?)\s*```/);
        if (actionMatch) {
          try {
            const actionData = JSON.parse(actionMatch[1].trim());
            if (actionData.action === 'create_model' && onModelCreated) {
              onModelCreated(actionData);
              addToast(`Modello "${actionData.name}" creato dal Copilot!`, 'success');
            } else if (actionData.action === 'create_chatbot' && onChatbotCreated) {
              onChatbotCreated(actionData);
              addToast(`Chatbot "${actionData.name}" creato dal Copilot!`, 'success');
            } else if (actionData.action === 'create_dataset' && onDatasetCreated) {
              onDatasetCreated(actionData);
              addToast(`Dataset "${actionData.name}" creato dal Copilot!`, 'success');
            }
          } catch (e) {
            // ignore JSON error
          }
        }

        const cleanContent = content.replace(/```action[\s\S]*?```/g, '').trim();

        setMessages((prev) => [
          ...prev,
          { 
            role: 'assistant', 
            content: cleanContent || content,
            agentTrace: res.agentTrace
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${res.error}` }
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Errore: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
      setAgentStep('');
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    addToast('Copiato negli appunti!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900/95 border-l border-purple-500/40 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-lg shadow-lg shadow-purple-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Copilot Studio</h3>
            <p className="text-[11px] text-purple-400 font-mono">Powered by OpenRouter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-[11px] text-purple-200 font-semibold focus:outline-none"
          >
            {POPULAR_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name.slice(0, 16)}...
              </option>
            ))}
          </select>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`relative group max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-medium shadow'
                    : 'bg-slate-950/90 text-slate-200 border border-slate-800/80 shadow'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Agent Trace Badge */}
                {!isUser && msg.agentTrace && (
                  <AgentPipelineBadge agentTrace={msg.agentTrace} />
                )}

                {!isUser && (
                  <button
                    onClick={() => handleCopy(msg.content, index)}
                    className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-bounce" />
            </div>
            <div className="bg-slate-950 border border-purple-500/30 rounded-2xl p-3 text-xs text-purple-300 flex items-center gap-2 shadow-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>{agentStep || 'Copilot sta elaborando...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-purple-500/40 whitespace-nowrap transition-all shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Chiedi al Copilot di creare o spiegare..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
