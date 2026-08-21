import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import DashboardOverview from './pages/DashboardOverview';
import ModelsManager from './pages/ModelsManager';
import ChatbotsManager from './pages/ChatbotsManager';
import DatasetsManager from './pages/DatasetsManager';
import InferencePlayground from './pages/InferencePlayground';
import SettingsManager from './pages/SettingsManager';

import CreateModelModal from './components/CreateModelModal';
import CreateChatbotModal from './components/CreateChatbotModal';
import ChatbotModal from './components/ChatbotModal';
import OpenRouterModal from './components/OpenRouterModal';
import AICopilotDrawer from './components/AICopilotDrawer';
import MemoryVaultModal from './components/MemoryVaultModal';
import GoogleAuthGateway from './components/GoogleAuthGateway';

import { 
  getCustomModels, 
  saveCustomModel, 
  deleteCustomModel,
  getCustomChatbots,
  saveCustomChatbot,
  deleteCustomChatbot,
  getCustomDatasets,
  saveCustomDataset,
  deleteCustomDataset
} from './services/storage';

import { getMemories } from './services/memory';
import { getCurrentUser, logoutUser } from './services/auth';

import { Bot } from 'lucide-react';

function DashboardApp() {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data state
  const [models, setModels] = useState([]);
  const [chatbots, setChatbots] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [memories, setMemories] = useState([]);

  // Modals state
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCreateChatbotOpen, setIsCreateChatbotOpen] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [activeChatbotModal, setActiveChatbotModal] = useState(null);
  const [playgroundInitialModel, setPlaygroundInitialModel] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = () => {
    setModels(getCustomModels());
    setChatbots(getCustomChatbots());
    setDatasets(getCustomDatasets());
    setMemories(getMemories());
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    addToast('Account disconnesso con successo', 'info');
  };

  const handleSaveModel = (newModel) => {
    saveCustomModel(newModel);
    loadData();
  };

  const handleDeleteModel = (id) => {
    deleteCustomModel(id);
    loadData();
    addToast('Modello eliminato', 'info');
  };

  const handleSaveChatbot = (newBot) => {
    saveCustomChatbot(newBot);
    loadData();
  };

  const handleDeleteChatbot = (id) => {
    deleteCustomChatbot(id);
    loadData();
    addToast('Chatbot eliminato', 'info');
  };

  const handleSaveDataset = (newDataset) => {
    saveCustomDataset(newDataset);
    loadData();
  };

  const handleDeleteDataset = (id) => {
    deleteCustomDataset(id);
    loadData();
    addToast('Dataset eliminato', 'info');
  };

  const handleChatWithModel = (model) => {
    setActiveChatbotModal({
      id: model.id,
      name: model.name,
      avatar: '🤖',
      model: model.baseModel,
      systemPrompt: model.systemPrompt,
      temperature: model.temperature,
      maxTokens: model.maxTokens
    });
  };

  const handleChatWithBot = (bot) => {
    setActiveChatbotModal(bot);
  };

  const stats = {
    modelsCount: models.length,
    chatbotsCount: chatbots.length,
    datasetsCount: datasets.length
  };

  // If not logged in, enforce Google Authentication Gateway
  if (!currentUser) {
    return <GoogleAuthGateway onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenCreateChatbot={() => setIsCreateChatbotOpen(true)}
        onOpenCreateModel={() => setIsCreateModelOpen(true)}
        onOpenOpenRouter={() => setIsOpenRouterModalOpen(true)}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
        memoryCount={memories.length}
        onNavigate={(tab) => setActiveTab(tab)}
        onUserChanged={(u) => {
          setCurrentUser(u);
          loadData();
        }}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenMemory={() => setIsMemoryModalOpen(true)}
          stats={stats}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              stats={stats}
              models={models}
              chatbots={chatbots}
              datasets={datasets}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCreateModel={() => setIsCreateModelOpen(true)}
              onOpenCreateChatbot={() => setIsCreateChatbotOpen(true)}
              onOpenOpenRouter={() => setIsOpenRouterModalOpen(true)}
              onOpenChatWithModel={handleChatWithModel}
            />
          )}

          {activeTab === 'models' && (
            <ModelsManager
              models={models}
              onOpenCreateModel={() => setIsCreateModelOpen(true)}
              onDeleteModel={handleDeleteModel}
              onChatWithModel={handleChatWithModel}
            />
          )}

          {activeTab === 'chatbots' && (
            <ChatbotsManager
              chatbots={chatbots}
              onOpenCreateChatbot={() => setIsCreateChatbotOpen(true)}
              onDeleteChatbot={handleDeleteChatbot}
              onOpenChatWithBot={handleChatWithBot}
            />
          )}

          {activeTab === 'datasets' && (
            <DatasetsManager
              datasets={datasets}
              onSaveDataset={handleSaveDataset}
              onDeleteDataset={handleDeleteDataset}
            />
          )}

          {activeTab === 'playground' && (
            <InferencePlayground
              initialModel={playgroundInitialModel}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsManager
              onUserUpdated={(u) => {
                setCurrentUser(u);
                loadData();
              }}
              onSwitchAccount={(u) => {
                setCurrentUser(u);
                loadData();
              }}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Floating Copilot Button */}
      {!isCopilotOpen && (
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 p-3.5 px-4 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white font-bold text-xs shadow-2xl shadow-purple-500/40 border border-purple-400/40 hover:scale-105 active:scale-95 transition-all"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="hidden sm:inline">AI Copilot</span>
        </button>
      )}

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onModelCreated={handleSaveModel}
        onChatbotCreated={handleSaveChatbot}
        onDatasetCreated={handleSaveDataset}
      />

      {/* Create Model Modal */}
      <CreateModelModal
        isOpen={isCreateModelOpen}
        onClose={() => setIsCreateModelOpen(false)}
        onModelCreated={handleSaveModel}
      />

      {/* Create Chatbot Modal */}
      <CreateChatbotModal
        isOpen={isCreateChatbotOpen}
        onClose={() => setIsCreateChatbotOpen(false)}
        onChatbotCreated={handleSaveChatbot}
      />

      {/* Live Chatbot Modal */}
      {activeChatbotModal && (
        <ChatbotModal
          bot={activeChatbotModal}
          onClose={() => setActiveChatbotModal(null)}
        />
      )}

      {/* Memory Vault Modal */}
      <MemoryVaultModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onMemoriesUpdated={(mems) => setMemories(mems)}
      />

      {/* OpenRouter Key Setup Modal */}
      <OpenRouterModal
        isOpen={isOpenRouterModalOpen}
        onClose={() => setIsOpenRouterModalOpen(false)}
        onKeySaved={loadData}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DashboardApp />
    </ToastProvider>
  );
}
