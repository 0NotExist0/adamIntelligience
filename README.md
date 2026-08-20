# ⚡ AI Studio Pro (OpenRouter & Google Drive Hub)

Una moderna e potente Web Application per creare, testare e gestire modelli di Intelligenza Artificiale basati su **OpenRouter**, esportarli direttamente su **Google Drive** e pubblicare la piattaforma su **Vercel** via **GitHub**.

---

## 🌟 Caratteristiche Principali

- **🤖 100+ Modelli AI OpenRouter**:
  - `Meta Llama 3.3 70B Instruct` (100% FREE)
  - `DeepSeek R1 Reasoning` (100% FREE)
  - `Google Gemini 2.0 Flash` (100% FREE)
  - `Qwen 2.5 Coder 32B` (100% FREE)
  - `Mistral 7B Instruct` (100% FREE)
  - `Claude 3.5 Sonnet` & `OpenAI GPT-4o`
- **💾 Google Drive Vault**:
  - Salva configurazioni di modelli, istruzioni di sistema e pesi direttamente nella tua cartella di Google Drive.
  - Esportazione istantanea in formato standard JSON.
  - Backup completo in 1 click dell'intero archivio.
- **💬 Chatbot AI Studio**:
  - Crea assistenti personalizzati con avatar, personalità dedicata e modello OpenRouter.
  - Chat interattiva in tempo reale ed esportazione storico su Drive.
- **📊 Dataset di Training**:
  - Generatore automatico di dataset sintetici per fine-tuning alimentato da LLM.
  - Esportazione in formato `JSONL`, `CSV` e `JSON`.
- **✨ AI Copilot Integrato**:
  - Assistente incorporato per creare modelli, chatbot e generare dataset tramite prompt naturali.

---

## 🚀 Guida al Deploy su Vercel via GitHub

### 1. Inizializza e Carica su GitHub
Apri il terminale nella cartella del progetto ed esegui:

```bash
git init
git add .
git commit -m "feat: initial release of AI Studio Pro"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/TUO_REPO.git
git push -u origin main
```

### 2. Importa su Vercel (1-Click)
1. Vai su [vercel.com](https://vercel.com/new) ed effettua l'accesso con GitHub.
2. Clicca su **"Add New Project"** e seleziona il repository appena caricato.
3. Vercel rileverà automaticamente la configurazione con `vercel.json`!
4. Clicca su **Deploy**: in 30 secondi il tuo sito sarà online con dominio HTTPS globale!

---

## 💻 Sviluppo Locale

```bash
# Installa le dipendenze del frontend
cd frontend
npm install

# Avvia il server di sviluppo
npm run dev
```

---

## 🔑 Configurazione OpenRouter

1. Ottieni una chiave API gratuita da [openrouter.ai/keys](https://openrouter.ai/keys).
2. Inseriscila nella sezione **"Impostazioni & Chiavi"** o cliccando su **"OpenRouter"** nella barra in alto.
3. Sei pronto a usare tutti i modelli senza alcuna limitazione!
