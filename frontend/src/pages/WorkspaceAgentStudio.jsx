import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  FileCode, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  Play, 
  Send, 
  Save, 
  Trash2, 
  Download, 
  RefreshCw, 
  Check, 
  Copy, 
  Loader2, 
  Sparkles, 
  Bot, 
  User, 
  Plus, 
  Search, 
  Code, 
  Layers, 
  Cpu, 
  History, 
  FolderCheck, 
  ExternalLink,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  FolderUp,
  Key
} from 'lucide-react';
import { 
  getWorkspaceInfo, 
  validateAndSetWorkspaceFolder, 
  getWorkspaceTree, 
  getWorkspaceFileContent, 
  saveWorkspaceFile, 
  deleteWorkspaceFile, 
  runWorkspaceCommand, 
  runWorkspaceAgentTask, 
  getActiveWorkspaceFolder, 
  setActiveWorkspaceFolder,
  getSavedChatSessions,
  saveChatSession,
  deleteChatSession,
  exportChatSessionAsMarkdown,
  pickDirectoryNative,
  browseNativeOSFolder,
  browseLocalDirectories,
  getActiveDirectoryHandle,
  setActiveDirectoryHandle,
  buildTreeFromDirectoryHandle,
  readFileFromDirectoryHandle,
  writeFileToDirectoryHandle,
  deleteFileFromDirectoryHandle,
  downloadFileDirectly
} from '../services/workspaceAgent';
import { POPULAR_MODELS, getOpenRouterKey, setOpenRouterKey } from '../services/openrouter';
import { useToast } from '../components/Toast';

export default function WorkspaceAgentStudio() {
  const { addToast } = useToast();

  // Workspace & Folder State
  const [folderPath, setFolderPath] = useState('');
  const [activeFolderInfo, setActiveFolderInfo] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [fileSearch, setFileSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  // Left panel mode: 'files' | 'history'
  const [leftTab, setLeftTab] = useState('files');
  // Right panel mode: 'editor' | 'terminal'
  const [rightTab, setRightTab] = useState('editor');

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState([
    {
      type: 'info',
      text: 'Console di Workspace pronta. I comandi eseguiti dall\'Agente AI o manualmente compariranno qui.'
    }
  ]);
  const [manualCommand, setManualCommand] = useState('');
  const [isRunningCommand, setIsRunningCommand] = useState(false);

  // Chat & Agent State
  const [currentSessionId, setCurrentSessionId] = useState(() => `session-${Date.now()}`);
  const [sessionTitle, setSessionTitle] = useState('Task Workspace');
  const [savedSessions, setSavedSessions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Ciao! Sono il tuo **Agente AI di Workspace**.\n\nSpecificando una **cartella di lavoro** qui sopra, posso:\n- 📂 **Esplorare e mappare i file** del tuo progetto\n- 🔍 **Leggere e analizzare** codice sorgente e documentazione\n- ✍️ **Creare o modificare file** di codice in totale autonomia\n- 💻 **Eseguire comandi da terminale** (test, build, linter, git)\n- 💾 **Salvare la cronologia completa delle chat** e riprenderla quando vuoi!\n\nInserisci un percorso cartella o seleziona una delle cartelle rapide per iniziare.',
      agentTrace: null
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepLabel, setCurrentStepLabel] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // OpenRouter API Key state
  const [userApiKey, setUserApiKey] = useState(() => getOpenRouterKey());
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [isKeyInputOpen, setIsKeyInputOpen] = useState(false);

  const handleSaveInlineKey = (e) => {
    e.preventDefault();
    const key = inlineKeyInput.trim();
    if (!key) return;
    setOpenRouterKey(key);
    setUserApiKey(key);
    setInlineKeyInput('');
    setIsKeyInputOpen(false);
    addToast('Chiave API OpenRouter salvata con successo!', 'success');
  };

  const messagesEndRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Load initial workspace info & saved sessions
  useEffect(() => {
    initWorkspace();
    loadSessionsList();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const initWorkspace = async () => {
    const info = await getWorkspaceInfo();
    setActiveFolderInfo(info);
    
    const savedActive = getActiveWorkspaceFolder();
    const target = savedActive || info.current_project_dir || info.default_folder || '';
    if (target) {
      setFolderPath(target);
      handleLoadFolder(target);
    }
  };

  const loadSessionsList = () => {
    const list = getSavedChatSessions();
    setSavedSessions(list);
  };

  const handleLoadFolder = async (targetPath) => {
    const path = (targetPath || folderPath).trim();
    if (!path) return;

    setIsLoadingTree(true);
    const res = await validateAndSetWorkspaceFolder(path);
    if (res.success) {
      setFolderPath(res.data.folder_path);
      const tree = await getWorkspaceTree(res.data.folder_path);
      setFileTree(tree);
      // auto-expand root level
      setExpandedFolders({ [res.data.folder_path]: true });
      addToast(`Cartella "${res.data.folder_name}" caricata con successo!`, 'success');
      appendTerminal('success', `[WORKSPACE]: Connesso a ${res.data.folder_path}`);
    } else {
      addToast(`Errore cartella: ${res.error}`, 'error');
      appendTerminal('error', `[ERRORE]: Impossibile accedere a ${path}: ${res.error}`);
    }
    setIsLoadingTree(false);
  };

  const handleConfirmPathClick = async () => {
    const isWeb = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isWeb && !getActiveDirectoryHandle()) {
      addToast('Su Vercel, seleziona la cartella dal selettore per autorizzare la scrittura reale sul disco!', 'info');
      await handleOpenNativeFolderDialog();
    } else {
      await handleLoadFolder();
    }
  };

  const [isDirBrowserOpen, setIsDirBrowserOpen] = useState(false);
  const [browserDirsData, setBrowserDirsData] = useState(null);
  const [isBrowsingDirs, setIsBrowsingDirs] = useState(false);

  const handleOpenNativeFolderDialog = async () => {
    setIsLoadingTree(true);
    // On Web / Vercel: use browser File System Access API for direct local PC disk read/write
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const res = await pickDirectoryNative();
        if (res.success && res.handle) {
          setFolderPath(res.name);
          const tree = await buildTreeFromDirectoryHandle(res.handle);
          setFileTree(tree);
          setExpandedFolders({ [res.name]: true });
          addToast(`Cartella "${res.name}" connessa con accesso diretto al disco!`, 'success');
          appendTerminal('success', `[WORKSPACE]: Connesso a cartella locale "${res.name}" (Accesso Diretto Disco PC)`);
          setIsLoadingTree(false);
          return;
        } else if (res.cancelled) {
          setIsLoadingTree(false);
          return;
        }
      } catch (err) {
        console.warn('Browser directory picker skipped:', err);
      }
    }

    // Otherwise fallback to backend dialog or directory browser
    try {
      const res = await browseNativeOSFolder(folderPath);
      if (!res.cancelled && res.success && res.folder_path) {
        setFolderPath(res.folder_path);
        await handleLoadFolder(res.folder_path);
      } else {
        handleOpenDirBrowser();
      }
    } catch (err) {
      handleOpenDirBrowser();
    } finally {
      setIsLoadingTree(false);
    }
  };

  const handleOpenDirBrowser = async (target = '') => {
    setIsDirBrowserOpen(true);
    setIsBrowsingDirs(true);
    const data = await browseLocalDirectories(target || folderPath);
    setBrowserDirsData(data);
    setIsBrowsingDirs(false);
  };

  const handleSelectBrowserDir = async (path) => {
    setIsDirBrowserOpen(false);
    setFolderPath(path);
    await handleLoadFolder(path);
  };

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleSelectFile = async (filePath, relativePath) => {
    setSelectedFile({ fullPath: filePath, relativePath });
    setRightTab('editor');
    
    const activeHandle = getActiveDirectoryHandle();
    if (activeHandle) {
      const res = await readFileFromDirectoryHandle(activeHandle, relativePath);
      if (res.success) {
        setFileContent(res.content);
        setIsEditingFile(false);
      } else {
        setFileContent(`// Errore lettura file: ${res.error}`);
      }
      return;
    }

    if (!folderPath) return;
    const res = await getWorkspaceFileContent(folderPath, relativePath);
    if (res.success) {
      setFileContent(res.content);
      setIsEditingFile(false);
    } else {
      setFileContent(`// Errore lettura file: ${res.error}`);
    }
  };

  const handleSaveCurrentFile = async () => {
    if (!selectedFile) return;
    setIsSavingFile(true);

    const activeHandle = getActiveDirectoryHandle();
    if (activeHandle) {
      const res = await writeFileToDirectoryHandle(activeHandle, selectedFile.relativePath, fileContent);
      if (res.success) {
        addToast(`File ${selectedFile.relativePath} salvato su disco!`, 'success');
        setIsEditingFile(false);
        appendTerminal('success', `[FILE SALVATO]: ${selectedFile.relativePath}`);
      } else {
        addToast(`Errore salvataggio: ${res.error}`, 'error');
      }
      setIsSavingFile(false);
      return;
    }

    if (!folderPath) {
      setIsSavingFile(false);
      return;
    }
    const res = await saveWorkspaceFile(folderPath, selectedFile.relativePath, fileContent);
    if (res.success) {
      addToast(`File ${selectedFile.relativePath} salvato su disco!`, 'success');
      setIsEditingFile(false);
      appendTerminal('success', `[FILE SALVATO]: ${selectedFile.relativePath}`);
    } else {
      addToast(`Errore salvataggio: ${res.error}`, 'error');
    }
    setIsSavingFile(false);
  };

  const handleDeleteCurrentFile = async (relativePath) => {
    if (!relativePath) return;
    if (!confirm(`Sei sicuro di voler eliminare "${relativePath}"?`)) return;

    const activeHandle = getActiveDirectoryHandle();
    if (activeHandle) {
      const res = await deleteFileFromDirectoryHandle(activeHandle, relativePath);
      if (res.success) {
        addToast(`File ${relativePath} eliminato`, 'info');
        setSelectedFile(null);
        setFileContent('');
        const tree = await buildTreeFromDirectoryHandle(activeHandle);
        setFileTree(tree);
        appendTerminal('warning', `[FILE ELIMINATO]: ${relativePath}`);
      } else {
        addToast(`Errore: ${res.error}`, 'error');
      }
      return;
    }

    if (!folderPath) return;
    const res = await deleteWorkspaceFile(folderPath, relativePath);
    if (res.success) {
      addToast(`File ${relativePath} eliminato`, 'info');
      setSelectedFile(null);
      setFileContent('');
      // refresh tree
      const tree = await getWorkspaceTree(folderPath);
      setFileTree(tree);
      appendTerminal('warning', `[FILE ELIMINATO]: ${relativePath}`);
    } else {
      addToast(`Errore: ${res.error}`, 'error');
    }
  };

  const appendTerminal = (type, text) => {
    setTerminalHistory((prev) => [
      ...prev,
      { type, text, timestamp: new Date().toLocaleTimeString('it-IT') }
    ]);
  };

  const handleExecuteManualCommand = async (e) => {
    e.preventDefault();
    if (!manualCommand.trim() || isRunningCommand || !folderPath) return;

    const cmd = manualCommand.trim();
    setManualCommand('');
    setIsRunningCommand(true);
    appendTerminal('input', `$ ${cmd}`);

    const res = await runWorkspaceCommand(folderPath, cmd);
    if (res.stdout) appendTerminal('stdout', res.stdout);
    if (res.stderr) appendTerminal('stderr', res.stderr);
    if (!res.success && res.error) appendTerminal('error', res.error);
    appendTerminal('info', `Exit Code: ${res.returncode ?? 0}`);
    
    setIsRunningCommand(false);
  };

  // --- SEND AGENT TASK ---
  const handleSendTask = async (customPrompt = null) => {
    const taskText = customPrompt || inputPrompt;
    if (!taskText.trim() || loading) return;

    if (!folderPath) {
      addToast('Specifica prima una cartella di lavoro target su cui operare!', 'warning');
      return;
    }

    const userMessage = { role: 'user', content: taskText.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);
    setCurrentStepLabel('Analisi cartella e pianificazione task...');

    // Auto-generate title if default
    if (sessionTitle === 'Task Workspace' && newMessages.length === 2) {
      setSessionTitle(taskText.slice(0, 32) + (taskText.length > 32 ? '...' : ''));
    }

    try {
      appendTerminal('info', `[AGENTE AVVIATO]: "${taskText}"`);

      const agentRes = await runWorkspaceAgentTask({
        folderPath,
        taskPrompt: taskText.trim(),
        messages: newMessages.filter((m, idx) => !(idx === 0 && m.role === 'assistant')),
        model: selectedModel,
        maxIterations: 6
      });

      if (agentRes.success) {
        // Log all steps executed into terminal
        if (agentRes.steps && agentRes.steps.length > 0) {
          agentRes.steps.forEach((step) => {
            appendTerminal('agent_step', `🛠️ [STEP ${step.iteration}] Tool: ${step.tool}(${step.args || ''})`);
            if (step.result?.output) {
              appendTerminal('stdout', step.result.output);
            }
          });
          // Refresh file tree in case files were created/modified
          const activeHandle = getActiveDirectoryHandle();
          if (activeHandle) {
            const updatedTree = await buildTreeFromDirectoryHandle(activeHandle);
            setFileTree(updatedTree);
          } else {
            const updatedTree = await getWorkspaceTree(folderPath);
            setFileTree(updatedTree);
          }
        }

        const assistantMessage = {
          role: 'assistant',
          content: agentRes.content,
          agentTrace: {
            steps: agentRes.steps || [],
            stepsCount: agentRes.steps_count || 0,
            iterations: agentRes.iterations || 1,
            generatedFiles: agentRes.generatedFiles || [],
            model: agentRes.model,
            folder: folderPath
          }
        };

        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);

        // Auto-save session
        saveChatSession({
          id: currentSessionId,
          title: sessionTitle || taskText.slice(0, 30),
          folderPath,
          model: selectedModel,
          messages: updatedMessages
        });
        loadSessionsList();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Errore durante l'esecuzione del task: ${agentRes.error}` }
        ]);
        appendTerminal('error', `[ERRORE AGENTE]: ${agentRes.error}`);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Errore imprevisto: ${err.message}` }
      ]);
      appendTerminal('error', `[ECCEZIONE]: ${err.message}`);
    } finally {
      setLoading(false);
      setCurrentStepLabel('');
    }
  };

  // --- SESSION MANAGEMENT ---
  const handleSaveCurrentSession = () => {
    const saved = saveChatSession({
      id: currentSessionId,
      title: sessionTitle || 'Conversazione Workspace',
      folderPath,
      model: selectedModel,
      messages
    });
    loadSessionsList();
    addToast(`Sessione "${saved.title}" salvata!`, 'success');
  };

  const handleLoadSession = (session) => {
    setCurrentSessionId(session.id);
    setSessionTitle(session.title || 'Task Workspace');
    setMessages(session.messages || []);
    if (session.folderPath) {
      setFolderPath(session.folderPath);
      handleLoadFolder(session.folderPath);
    }
    if (session.model) {
      setSelectedModel(session.model);
    }
    addToast(`Sessione "${session.title}" caricata`, 'info');
  };

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    setCurrentSessionId(newId);
    setSessionTitle('Nuova Task Workspace');
    setMessages([
      {
        role: 'assistant',
        content: `✨ Nuova sessione avviata per la cartella: \`${folderPath || 'Nessuna cartella impostata'}\`.\n\nCosa vorresti realizzare adesso?`
      }
    ]);
  };

  const handleDeleteSession = (id) => {
    deleteChatSession(id);
    loadSessionsList();
    addToast('Sessione eliminata', 'info');
  };

  const handleExportSession = () => {
    exportChatSessionAsMarkdown({
      id: currentSessionId,
      title: sessionTitle,
      folderPath,
      model: selectedModel,
      messages
    });
    addToast('File Markdown esportato con successo!', 'success');
  };

  const quickPrompts = [
    "Analizza la struttura del progetto e descrivi i file principali",
    "Trova potenziali bug o problemi di codice in questa cartella",
    "Crea un file README.md completo con istruzioni di installazione e uso",
    "Scrivi dei test unitari per i file principali di questo progetto",
    "Esegui la build o controlla la sintassi del progetto"
  ];

  // Helper recursive renderer for file tree
  const renderTreeNodes = (nodes) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path];
      const isSelected = selectedFile?.fullPath === node.path;
      
      // Filter search
      if (fileSearch.trim() && !node.is_dir) {
        if (!node.name.toLowerCase().includes(fileSearch.toLowerCase())) {
          return null;
        }
      }

      if (node.is_dir) {
        return (
          <div key={node.path} className="space-y-0.5 select-none">
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 text-slate-300 hover:text-white cursor-pointer text-xs transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500/80 shrink-0" />
              )}
              <span className="font-semibold truncate">{node.name}</span>
            </div>

            {isExpanded && node.children && node.children.length > 0 && (
              <div className="pl-4 border-l border-slate-800 ml-2 space-y-0.5">
                {renderTreeNodes(node.children)}
              </div>
            )}
          </div>
        );
      }

      // File Node
      let FileIcon = FileText;
      let iconColor = 'text-slate-400';
      if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json'].includes(node.extension)) {
        FileIcon = FileCode;
        iconColor = node.extension === 'py' ? 'text-blue-400' : 'text-purple-400';
      }

      return (
        <div
          key={node.path}
          onClick={() => handleSelectFile(node.path, node.relative_path)}
          className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40 shadow-sm'
              : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <FileIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
            <span className="truncate">{node.name}</span>
          </div>
          {node.size > 0 && (
            <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
              {node.size > 1024 ? `${Math.round(node.size / 1024)}K` : `${node.size}B`}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-5rem)] flex flex-col space-y-4 animate-in fade-in duration-300">
      {/* Top Workspace Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-purple-500/30 flex flex-col gap-3 bg-slate-950/90 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white">Agente AI di Workspace</h1>
                {getActiveDirectoryHandle() ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>DISCO LOCALE PC CONNESSO ({getActiveDirectoryHandle().name})</span>
                  </span>
                ) : (
                  <button
                    onClick={handleOpenNativeFolderDialog}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer transition-all animate-pulse"
                    title="Clicca per autorizzare la scrittura reale sulla cartella del computer"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>CLICCA PER AUTORIZZARE SCRITTURA PC</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">Seleziona qualsiasi cartella del computer: l'Agente AI leggerà, scriverà ed eseguirà comandi lì dentro</p>
            </div>
          </div>

          {/* Action Buttons: Native Windows Dialog & Browser */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsKeyInputOpen(!isKeyInputOpen)}
              className={`px-3 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow ${
                userApiKey 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse hover:bg-amber-500/30'
              }`}
              title={userApiKey ? 'Chiave OpenRouter Attiva' : 'Inserisci Chiave OpenRouter'}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{userApiKey ? 'Chiave AI Attiva' : 'Inserisci Chiave API'}</span>
            </button>

            <button
              onClick={handleOpenNativeFolderDialog}
              disabled={isLoadingTree}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/30 active:scale-95 transition-all"
            >
              {isLoadingTree ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
              <span>Sfoglia Cartella dal PC</span>
            </button>

            <button
              onClick={() => handleOpenDirBrowser()}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <span>🧭 Esplora Directory PC</span>
            </button>
          </div>
        </div>

        {/* Inline API Key Input Banner (if missing or opened) */}
        {(!userApiKey || isKeyInputOpen) && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 shadow-lg">
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {userApiKey 
                  ? 'Chiave API OpenRouter attualmente impostata. Incollane una nuova per cambiarla:' 
                  : 'Per consentire all\'Agente AI di rispondere su Vercel, inserisci la tua chiave API gratuita (da openrouter.ai/keys):'}
              </span>
            </div>

            <form onSubmit={handleSaveInlineKey} className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="password"
                value={inlineKeyInput}
                onChange={(e) => setInlineKeyInput(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1 sm:w-64 bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all shrink-0"
              >
                Salva Chiave
              </button>
            </form>
          </div>
        )}

        {/* Folder Path Input & Quick Shortcuts Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-800/80">
          <div className="relative flex-1">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmPathClick()}
              placeholder="Percorso cartella locale (es. C:\Progetti\MioSito o C:\Users\...)..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2 text-xs font-mono text-purple-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
            />
          </div>

          <button
            onClick={() => handleConfirmPathClick()}
            disabled={isLoadingTree}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors shrink-0"
          >
            {isLoadingTree ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Conferma Percorso</span>
          </button>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {activeFolderInfo?.current_project_dir && (
              <button
                onClick={() => {
                  setFolderPath(activeFolderInfo.current_project_dir);
                  handleLoadFolder(activeFolderInfo.current_project_dir);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
              >
                Progetto
              </button>
            )}

            {activeFolderInfo?.desktop_dir && (
              <button
                onClick={() => {
                  setFolderPath(activeFolderInfo.desktop_dir);
                  handleLoadFolder(activeFolderInfo.desktop_dir);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
              >
                Desktop
              </button>
            )}

            {activeFolderInfo?.onedrive_dir && (
              <button
                onClick={() => {
                  setFolderPath(activeFolderInfo.onedrive_dir);
                  handleLoadFolder(activeFolderInfo.onedrive_dir);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
              >
                OneDrive
              </button>
            )}

            {activeFolderInfo?.documents_dir && (
              <button
                onClick={() => {
                  setFolderPath(activeFolderInfo.documents_dir);
                  handleLoadFolder(activeFolderInfo.documents_dir);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
              >
                Documenti
              </button>
            )}

            {activeFolderInfo?.downloads_dir && (
              <button
                onClick={() => {
                  setFolderPath(activeFolderInfo.downloads_dir);
                  handleLoadFolder(activeFolderInfo.downloads_dir);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition-colors"
              >
                Download
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Studio Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: File Tree & Saved Chat Sessions (3 cols) */}
        <div className="lg:col-span-3 glass-panel rounded-3xl border border-slate-800 flex flex-col bg-slate-950/70 overflow-hidden">
          {/* Header Switcher */}
          <div className="p-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950">
            <div className="flex gap-1">
              <button
                onClick={() => setLeftTab('files')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  leftTab === 'files'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>File ({fileTree.length})</span>
              </button>

              <button
                onClick={() => setLeftTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  leftTab === 'history'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Chat ({savedSessions.length})</span>
              </button>
            </div>

            {leftTab === 'files' ? (
              <button
                onClick={() => handleLoadFolder()}
                title="Ricarica albero file"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin' : ''}`} />
              </button>
            ) : (
              <button
                onClick={handleNewChat}
                title="Avvia nuova sessione"
                className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border border-purple-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Left Content */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {leftTab === 'files' ? (
              <>
                {/* Search in files */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Cerca file..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Tree */}
                <div className="space-y-1">
                  {fileTree.length > 0 ? (
                    renderTreeNodes(fileTree)
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                      <Folder className="w-8 h-8 mx-auto text-slate-600" />
                      <p>Nessun file caricato.</p>
                      <p className="text-[11px]">Seleziona una cartella in alto per esplorare i file.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Saved Chat Sessions */
              <div className="space-y-2">
                <button
                  onClick={handleNewChat}
                  className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition-all hover:opacity-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuova Conversazione</span>
                </button>

                {savedSessions.length > 0 ? (
                  savedSessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => handleLoadSession(sess)}
                      className={`group p-3 rounded-2xl border text-xs cursor-pointer transition-all relative ${
                        sess.id === currentSessionId
                          ? 'bg-purple-900/30 border-purple-500/50 text-white shadow'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold truncate pr-4 text-purple-200">
                          {sess.title || 'Sessione'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(sess.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{new Date(sess.timestamp || Date.now()).toLocaleDateString('it-IT')}</span>
                        <span>{sess.messages?.length || 0} messaggi</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                    <p>Nessuna chat salvata.</p>
                    <p className="text-[10px]">Le conversazioni con l'agente verranno salvate qui.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center Column: AI Agent Chat & Task Studio (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl border border-slate-800 flex flex-col bg-slate-950/80 overflow-hidden">
          {/* Chat Header */}
          <div className="p-3 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Titolo Sessione..."
                className="bg-transparent text-xs font-bold text-white focus:outline-none focus:border-b border-purple-500 w-44"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-[11px] text-purple-200 font-semibold focus:outline-none"
              >
                {POPULAR_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.slice(0, 16)}...
                  </option>
                ))}
              </select>

              <button
                onClick={handleSaveCurrentSession}
                title="Salva chat"
                className="p-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salva</span>
              </button>

              <button
                onClick={handleExportSession}
                title="Esporta chat in Markdown"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
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
                    className={`relative group max-w-[88%] rounded-2xl p-3.5 leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-medium shadow'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-800/80 shadow'
                    }`}
                  >
                    {/* Main text content */}
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                    {/* Agent Trace Badge & Steps Inspector */}
                    {!isUser && msg.agentTrace?.steps?.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-purple-500/20 space-y-2">
                        {/* Generated Files Download Cards */}
                        {msg.agentTrace?.generatedFiles?.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>File creati sul tuo PC ({msg.agentTrace.generatedFiles.length}):</span>
                            </span>
                            {msg.agentTrace.generatedFiles.map((gf, gfIdx) => (
                              <div
                                key={gfIdx}
                                className="p-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-1.5 text-emerald-200 truncate">
                                  <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="font-mono font-bold truncate">{gf.path}</span>
                                </div>
                                <button
                                  onClick={() => downloadFileDirectly(gf.path, gf.content)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow shrink-0 transition-all active:scale-95"
                                  title="Scarica file sul computer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Scarica File</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Azioni eseguite nella cartella ({msg.agentTrace.steps.length}):</span>
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {msg.agentTrace.steps.map((st, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1 font-mono"
                            >
                              <div className="flex items-center justify-between text-purple-300">
                                <strong>Tool: {st.tool}</strong>
                                <span className="text-[9px] text-slate-500">Iter. {st.iteration}</span>
                              </div>
                              <p className="text-slate-400 truncate text-[10px]">{st.args}</p>
                              {st.result?.output && (
                                <p className="text-emerald-300/90 text-[10px] line-clamp-2">
                                  {st.result.output}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isUser && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedIndex(index);
                          addToast('Risposta copiata!', 'success');
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-3 text-xs text-purple-300 flex items-center gap-2 shadow-lg">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>{currentStepLabel || 'L\'Agente sta operando sui file della cartella...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick task prompt chips */}
          <div className="p-2 px-3 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto flex gap-1.5 no-scrollbar">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendTask(q)}
                className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Prompt */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTask();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Chiedi all'Agente AI di creare file, analizzare codice o eseguire comandi..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner font-sans"
            />

            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold shadow-lg shadow-purple-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Right Column: Code Editor Preview & Terminal Console (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl border border-slate-800 flex flex-col bg-slate-950/90 overflow-hidden">
          {/* Header Switcher */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex gap-1">
              <button
                onClick={() => setRightTab('editor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  rightTab === 'editor'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Editor File</span>
              </button>

              <button
                onClick={() => setRightTab('terminal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  rightTab === 'terminal'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminale</span>
              </button>
            </div>

            {rightTab === 'editor' && selectedFile && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSaveCurrentFile}
                  disabled={isSavingFile}
                  className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  {isSavingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Salva</span>
                </button>

                <button
                  onClick={() => handleDeleteCurrentFile(selectedFile.relativePath)}
                  title="Elimina file"
                  className="p-1 rounded-xl text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {rightTab === 'editor' ? (
              /* Code Editor Area */
              <div className="flex-1 flex flex-col min-h-0">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="truncate">{selectedFile.relativePath}</span>
                      <span>{fileContent.length} chars</span>
                    </div>

                    <textarea
                      value={fileContent}
                      onChange={(e) => {
                        setFileContent(e.target.value);
                        setIsEditingFile(true);
                      }}
                      className="flex-1 w-full bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs space-y-2">
                    <Code className="w-8 h-8 text-slate-600" />
                    <p>Nessun file aperto nell'editor.</p>
                    <p className="text-[11px]">Clicca su un file a sinistra per visualizzarlo o modificarlo qui.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Terminal Console Area */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
                <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {terminalHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`leading-tight ${
                        item.type === 'input'
                          ? 'text-cyan-300 font-bold'
                          : item.type === 'agent_step'
                          ? 'text-purple-300 font-bold'
                          : item.type === 'stdout'
                          ? 'text-slate-300 whitespace-pre-wrap'
                          : item.type === 'stderr' || item.type === 'error'
                          ? 'text-rose-400 whitespace-pre-wrap'
                          : item.type === 'success'
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.text}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>

                {/* Manual command execution bar */}
                <form
                  onSubmit={handleExecuteManualCommand}
                  className="p-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2"
                >
                  <span className="text-purple-400 font-mono text-xs font-bold">$</span>
                  <input
                    type="text"
                    value={manualCommand}
                    onChange={(e) => setManualCommand(e.target.value)}
                    placeholder="Esegui comando (es. npm run build, dir, git status)..."
                    disabled={isRunningCommand || !folderPath}
                    className="flex-1 bg-transparent font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isRunningCommand || !manualCommand.trim() || !folderPath}
                    className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 transition-all"
                  >
                    {isRunningCommand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal: Navigatore Directory del PC */}
      {isDirBrowserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Esploratore Cartelle del PC</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                    {browserDirsData?.current || 'Caricamento directory...'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDirBrowserOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search / Direct Path Bar inside modal */}
            <div className="flex gap-2">
              <input
                type="text"
                value={browserDirsData?.current || ''}
                onChange={(e) => setBrowserDirsData((prev) => ({ ...prev, current: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenDirBrowser(browserDirsData?.current)}
                placeholder="Incolla o modifica il percorso (es. C:\Users\...)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => handleOpenDirBrowser(browserDirsData?.current)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold shrink-0 border border-slate-700"
              >
                Vai
              </button>
            </div>

            {/* Quick Drives & Locations */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unità / Drive:</span>
                {browserDirsData?.drives?.map((dr) => (
                  <button
                    key={dr}
                    onClick={() => handleOpenDirBrowser(dr)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-purple-950/60 text-purple-200 border border-slate-800 text-xs font-mono font-bold transition-all"
                  >
                    {dr}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Posizioni Rapide:</span>
                {browserDirsData?.quick_locations?.map((loc) => (
                  <button
                    key={loc.label}
                    onClick={() => handleOpenDirBrowser(loc.path)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parent directory button */}
            {browserDirsData?.parent && (
              <button
                onClick={() => handleOpenDirBrowser(browserDirsData.parent)}
                className="w-full p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2 border border-slate-800 transition-colors"
              >
                <FolderUp className="w-4 h-4 text-purple-400" />
                <span>.. Torna alla cartella superiore ({browserDirsData.parent})</span>
              </button>
            )}

            {/* Subdirectories List */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[350px] p-2 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              {isBrowsingDirs ? (
                <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Lettura directory del computer...</span>
                </div>
              ) : browserDirsData?.subdirectories?.length > 0 ? (
                browserDirsData.subdirectories.map((dir) => (
                  <div
                    key={dir.path}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-slate-200 text-xs group transition-colors"
                  >
                    <div
                      onClick={() => handleOpenDirBrowser(dir.path)}
                      className="flex items-center gap-2 flex-1 cursor-pointer truncate"
                    >
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate group-hover:text-purple-300 font-medium">{dir.name}</span>
                    </div>

                    <button
                      onClick={() => handleSelectBrowserDir(dir.path)}
                      className="px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 text-[11px] font-bold transition-all shrink-0 ml-2"
                    >
                      Seleziona Questa
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nessuna sottocartella trovata in questo percorso.
                </div>
              )}
            </div>

            {/* Footer confirmation */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setIsDirBrowserOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Chiudi
              </button>

              {browserDirsData?.current && (
                <button
                  onClick={() => handleSelectBrowserDir(browserDirsData.current)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Imposta "{browserDirsData.current.split('\\').pop() || browserDirsData.current}" come Cartella di Lavoro</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

