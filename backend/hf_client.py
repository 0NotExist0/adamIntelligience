import os
import sys
import base64
from typing import Optional, List, Dict, Any
from huggingface_hub import HfApi
import httpx
from backend.browser_auth import load_session

HF_API_BASE = "https://huggingface.co/api"

class HFManager:
    def __init__(self, token: Optional[str] = None, cookie: Optional[str] = None):
        self.session = load_session()
        self.token = token or self.session.get("token")
        self.cookie = cookie or self.session.get("cookie")
        
        # Initialize HfApi client
        self.api = HfApi(token=self.token if self.token and self.token.startswith("hf_") else None)

    def get_auth_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": "HF-Studio-Modern-Dashboard/1.0"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if self.cookie:
            headers["Cookie"] = f"token={self.cookie}"
        return headers

    async def get_whoami(self) -> Dict[str, Any]:
        """Fetches profile info for current authenticated user."""
        headers = self.get_auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{HF_API_BASE}/whoami-v2", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "name": data.get("name"),
                    "fullname": data.get("fullname", data.get("name")),
                    "email": data.get("email"),
                    "avatarUrl": data.get("avatarUrl"),
                    "isPro": data.get("isPro", False),
                    "canPay": data.get("canPay", False),
                    "orgs": data.get("orgs", []),
                    "auth": data.get("auth", {})
                }
            else:
                raise Exception(f"Errore autenticazione ({resp.status_code}): {resp.text}")

    async def commit_files_direct(
        self,
        repo_id: str,
        files: List[Dict[str, Any]],
        repo_type: str = "model",
        commit_message: str = "Update files via HF Studio"
    ) -> bool:
        """Commits multiple files in a single atomic commit using the HF REST API."""
        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        
        file_entries = []
        for f in files:
            content = f.get("content", "")
            if isinstance(content, str):
                b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")
            elif isinstance(content, bytes):
                b64 = base64.b64encode(content).decode("utf-8")
            else:
                continue
            file_entries.append({
                "path": f["path"],
                "content": b64,
                "encoding": "base64"
            })

        type_path = f"{repo_type}s" if not repo_type.endswith("s") else repo_type
        commit_url = f"{HF_API_BASE}/{type_path}/{repo_id}/commit/main"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                commit_url,
                headers=headers,
                json={
                    "summary": commit_message,
                    "files": file_entries
                }
            )
            return resp.status_code in [200, 201]

    async def delete_repo_direct(self, repo_id: str, repo_type: str = "model") -> bool:
        """Deletes a repository cleanly using the REST API."""
        clean_name = repo_id.split("/")[-1] if "/" in repo_id else repo_id
        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                "DELETE",
                f"{HF_API_BASE}/repos/delete",
                headers=headers,
                json={"name": clean_name, "type": repo_type}
            )
            return resp.status_code == 200

    async def create_repo_universal(
        self,
        name: str,
        repo_type: str = "model",
        private: bool = False,
        license: str = "apache-2.0",
        tags: List[str] = None,
        sdk: Optional[str] = None,
        hardware: Optional[str] = None,
        readme_content: Optional[str] = None,
        model_id: Optional[str] = None,
        title: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a repo (Model, Dataset, or Space) supporting cookies & tokens.
        Handles SDK fallback (e.g. static spaces for non-pro accounts) to prevent 402 errors.
        Handles 409 conflict (repo already exists) smoothly by updating files in-place!
        """
        user_info = await self.get_whoami()
        username = user_info.get("name")

        if "/" in name:
            target_owner, repo_name = name.split("/", 1)
        else:
            target_owner = username
            repo_name = name

        full_repo_id = f"{target_owner}/{repo_name}"
        active_title = title or repo_name
        active_model = model_id or "meta-llama/Llama-3.2-3B-Instruct"

        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        payload = {
            "name": repo_name,
            "type": repo_type,
            "private": private
        }
        if target_owner != username:
            payload["organization"] = target_owner
        if repo_type == "space":
            payload["sdk"] = sdk or "static"
            if hardware and hardware != "cpu-basic":
                payload["hardware"] = hardware

        chosen_sdk = sdk or ("static" if repo_type == "space" else None)

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{HF_API_BASE}/repos/create", headers=headers, json=payload)
            
            # If 402 Payment Required for Gradio/Docker on free tier, fallback to static SDK (100% free)
            if resp.status_code == 402 and repo_type == "space" and payload.get("sdk") != "static":
                payload["sdk"] = "static"
                payload.pop("hardware", None)
                chosen_sdk = "static"
                resp = await client.post(f"{HF_API_BASE}/repos/create", headers=headers, json=payload)

            # Handle 409 Conflict (Repository already exists) gracefully
            if resp.status_code == 409:
                try:
                    res_data = resp.json()
                    repo_url = res_data.get("url", f"https://huggingface.co/{'spaces/' if repo_type == 'space' else ''}{full_repo_id}")
                except Exception:
                    repo_url = f"https://huggingface.co/{'spaces/' if repo_type == 'space' else ''}{full_repo_id}"
            elif resp.status_code not in [200, 201]:
                raise Exception(f"Impossibile creare il repository ({resp.status_code}): {resp.text}")
            else:
                res_data = resp.json()
                repo_url = res_data.get("url", f"https://huggingface.co/{'spaces/' if repo_type == 'space' else ''}{full_repo_id}")

        # Upload / Update files
        files_to_commit = []
        
        if readme_content:
            files_to_commit.append({"path": "README.md", "content": readme_content})
        elif repo_type == "model":
            default_readme = f"""---
license: {license}
tags:
{chr(10).join(f'- {t}' for t in (tags or ['pytorch']))}
---

# {repo_name}
Modello creato con la **Dashboard Moderna Hugging Face Studio**.
"""
            files_to_commit.append({"path": "README.md", "content": default_readme})
        elif repo_type == "dataset":
            default_readme = f"""---
license: {license}
---

# {repo_name}
Dataset creato con la **Dashboard Moderna Hugging Face Studio**.
"""
            files_to_commit.append({"path": "README.md", "content": default_readme})
        elif repo_type == "space":
            space_readme = f"""---
title: {active_title}
emoji: 🤖
colorFrom: purple
colorTo: indigo
sdk: {chosen_sdk}
pinned: false
---

# {active_title}
Chatbot AI interattivo basato su `{active_model}` creato con **Hugging Face Studio Dashboard**.
"""
            files_to_commit.append({"path": "README.md", "content": space_readme})
            
            if chosen_sdk == "static":
                files_to_commit.append({
                    "path": "index.html",
                    "content": self._generate_static_chatbot_html(active_title, active_model, system_prompt)
                })
            elif chosen_sdk == "gradio":
                gradio_app = f"""import os
import gradio as gr
from huggingface_hub import InferenceClient

MODEL_ID = "{active_model}"
client = InferenceClient(model=MODEL_ID, token=os.environ.get("HF_TOKEN"))

def respond(message, history, system_message, max_tokens, temperature):
    messages = [{{"role": "system", "content": system_message}}]
    for val in history:
        if val[0]:
            messages.append({{"role": "user", "content": val[0]}})
        if val[1]:
            messages.append({{"role": "assistant", "content": val[1]}})
    messages.append({{"role": "user", "content": message}})

    response = ""
    try:
        for chunk in client.chat_completion(messages, max_tokens=max_tokens, stream=True, temperature=temperature):
            token = chunk.choices[0].delta.content
            if token:
                response += token
                yield response
    except Exception as e:
        yield f"⚠️ Errore: {{str(e)}}"

demo = gr.ChatInterface(
    respond,
    additional_inputs=[
        gr.Textbox(value="{system_prompt or 'Sei un assistente AI utile.'}", label="System Prompt"),
        gr.Slider(minimum=1, maximum=2048, value=512, step=1, label="Max tokens"),
        gr.Slider(minimum=0.1, maximum=2.0, value=0.7, step=0.1, label="Temperature"),
    ],
    title="🤖 {active_title}"
)

if __name__ == "__main__":
    demo.launch()
"""
                files_to_commit.append({"path": "app.py", "content": gradio_app})
                files_to_commit.append({"path": "requirements.txt", "content": "gradio>=4.0.0\nhuggingface_hub>=0.23.0\n"})

        if files_to_commit:
            try:
                await self.commit_files_direct(
                    repo_id=full_repo_id,
                    files=files_to_commit,
                    repo_type=repo_type,
                    commit_message="Setup chatbot files via HF Studio"
                )
            except Exception:
                pass

        return {"repo_id": full_repo_id, "url": repo_url, "sdk": chosen_sdk}

    def _generate_static_chatbot_html(self, title: str, default_model: str, system_prompt: Optional[str] = None) -> str:
        """Generates a standalone, beautiful HTML5/JS Web Chatbot application."""
        active_sys_prompt = system_prompt or 'Sei un assistente AI amichevole, intelligente e molto chiaro. Rispondi in italiano.'
        escaped_sys = active_sys_prompt.replace('"', '\\"').replace('\n', ' ')
        return f"""<!DOCTYPE html>
<html lang="it" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - AI Chatbot</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      darkMode: 'class',
      theme: {{
        extend: {{
          colors: {{
            brand: {{ 500: '#8b5cf6', 600: '#7c3aed' }}
          }}
        }}
      }}
    }}
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    .no-scrollbar::-webkit-scrollbar {{ display: none; }}
    .no-scrollbar {{ -ms-overflow-style: none; scrollbar-width: none; }}
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center text-lg shadow-lg shadow-purple-500/20">
        🤖
      </div>
      <div>
        <h1 class="text-sm font-bold text-white">{title}</h1>
        <p class="text-[11px] text-purple-400 font-medium" id="activeModelLabel">{default_model}</p>
      </div>
    </div>

    <!-- Model Switcher -->
    <div class="flex items-center gap-2">
      <select id="modelSelect" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-500">
        <option value="{default_model}" selected>{default_model}</option>
        <option value="meta-llama/Llama-3.2-3B-Instruct">Llama 3.2 3B Instruct</option>
        <option value="meta-llama/Llama-3.3-70B-Instruct">Llama 3.3 70B Instruct</option>
        <option value="Qwen/Qwen2.5-Coder-32B-Instruct">Qwen 2.5 Coder 32B</option>
        <option value="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B">DeepSeek R1 Distill 32B</option>
        <option value="mistralai/Mistral-7B-Instruct-v0.3">Mistral 7B Instruct</option>
      </select>
    </div>
  </header>

  <!-- Chat Area -->
  <main class="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between overflow-hidden">
    <!-- Messages Container -->
    <div id="chatMessages" class="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
      <div class="flex gap-3 items-start">
        <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 max-w-[85%] leading-relaxed shadow-md">
          Ciao! Sono il tuo <strong>Chatbot AI ({title})</strong> pronto all'uso su Hugging Face. Chiedimi qualsiasi cosa o scrivi del codice!
        </div>
      </div>
    </div>

    <!-- Input Bar -->
    <form id="chatForm" class="pt-3 border-t border-slate-800/80">
      <div class="relative flex items-center">
        <textarea
          id="userInput"
          rows="1"
          placeholder="Scrivi un messaggio per il chatbot..."
          class="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-14 py-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none font-sans shadow-inner"
        ></textarea>
        <button
          type="submit"
          id="sendBtn"
          class="absolute right-2 p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white shadow-md shadow-purple-500/20 active:scale-95 transition-all"
        >
          <i class="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </form>
  </main>

  <script>
    const messages = [
      {{ role: 'system', content: "{escaped_sys}" }}
    ];

    const chatContainer = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const modelSelect = document.getElementById('modelSelect');
    const activeModelLabel = document.getElementById('activeModelLabel');

    modelSelect.addEventListener('change', (e) => {{
      activeModelLabel.textContent = e.target.value;
    }});

    function appendMessage(role, content) {{
      const isUser = role === 'user';
      const div = document.createElement('div');
      div.className = `flex gap-3 items-start ${{isUser ? 'justify-end' : 'justify-start'}}`;
      
      div.innerHTML = `
        ${{!isUser ? '<div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-sm shrink-0">🤖</div>' : ''}}
        <div class="${{isUser ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-200 border border-slate-800'}} rounded-2xl p-3.5 text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap shadow-md">
          ${{content}}
        </div>
      `;
      chatContainer.appendChild(div);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return div;
    }}

    chatForm.addEventListener('submit', async (e) => {{
      e.preventDefault();
      const text = userInput.value.trim();
      if (!text) return;

      appendMessage('user', text);
      messages.push({{ role: 'user', content: text }});
      userInput.value = '';

      const model = modelSelect.value;
      const loadingDiv = appendMessage('assistant', 'Sto elaborando la risposta...');

      try {{
        const res = await fetch(`https://router.huggingface.co/hf-inference/v1/chat/completions`, {{
          method: 'POST',
          headers: {{
            'Content-Type': 'application/json'
          }},
          body: JSON.stringify({{
            model: model,
            messages: messages,
            max_tokens: 512,
            temperature: 0.7
          }})
        }});

        if (res.ok) {{
          const data = await res.json();
          const reply = data.choices[0]?.message?.content || 'Nessuna risposta.';
          loadingDiv.querySelector('div:last-child').textContent = reply;
          messages.push({{ role: 'assistant', content: reply }});
        }} else {{
          loadingDiv.querySelector('div:last-child').textContent = '⚠️ Modello occupato o in caricamento. Riprova tra pochi istanti.';
        }}
      }} catch (err) {{
        loadingDiv.querySelector('div:last-child').textContent = '⚠️ Errore di connessione.';
      }}
    }});
  </script>
</body>
</html>"""

    # --- MODELS ---
    def list_user_models(self, username: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            models = self.api.list_models(author=username, limit=50)
            return [
                {
                    "id": m.id,
                    "name": m.id.split("/")[-1] if "/" in m.id else m.id,
                    "author": m.author or (m.id.split("/")[0] if "/" in m.id else username),
                    "private": m.private,
                    "downloads": m.downloads or 0,
                    "likes": m.likes or 0,
                    "lastModified": str(m.last_modified) if m.last_modified else None,
                    "pipeline_tag": m.pipeline_tag,
                    "tags": m.tags or []
                }
                for m in models
            ]
        except Exception:
            return []

    def search_models(self, query: str = "", task: Optional[str] = None, sort: str = "downloads", limit: int = 30) -> List[Dict[str, Any]]:
        try:
            kwargs = {"search": query, "limit": limit, "sort": sort}
            if task:
                kwargs["filter"] = task
            models = self.api.list_models(**kwargs)
            return [
                {
                    "id": m.id,
                    "name": m.id.split("/")[-1] if "/" in m.id else m.id,
                    "author": m.author or (m.id.split("/")[0] if "/" in m.id else ""),
                    "private": m.private,
                    "downloads": m.downloads or 0,
                    "likes": m.likes or 0,
                    "pipeline_tag": m.pipeline_tag,
                    "tags": (m.tags or [])[:5]
                }
                for m in models
            ]
        except Exception:
            return []

    # --- DATASETS ---
    def list_user_datasets(self, username: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            datasets = self.api.list_datasets(author=username, limit=50)
            return [
                {
                    "id": d.id,
                    "name": d.id.split("/")[-1] if "/" in d.id else d.id,
                    "author": d.author or (d.id.split("/")[0] if "/" in d.id else username),
                    "private": d.private,
                    "downloads": d.downloads or 0,
                    "likes": d.likes or 0,
                    "lastModified": str(d.last_modified) if d.last_modified else None,
                    "tags": d.tags or []
                }
                for d in datasets
            ]
        except Exception:
            return []

    def search_datasets(self, query: str = "", sort: str = "downloads", limit: int = 30) -> List[Dict[str, Any]]:
        try:
            datasets = self.api.list_datasets(search=query, limit=limit, sort=sort)
            return [
                {
                    "id": d.id,
                    "name": d.id.split("/")[-1] if "/" in d.id else d.id,
                    "author": d.author or (d.id.split("/")[0] if "/" in d.id else ""),
                    "private": d.private,
                    "downloads": d.downloads or 0,
                    "likes": d.likes or 0,
                    "tags": (d.tags or [])[:5]
                }
                for d in datasets
            ]
        except Exception:
            return []

    # --- SPACES ---
    def list_user_spaces(self, username: Optional[str] = None) -> List[Dict[str, Any]]:
        try:
            spaces = self.api.list_spaces(author=username, limit=50)
            return [
                {
                    "id": s.id,
                    "name": s.id.split("/")[-1] if "/" in s.id else s.id,
                    "author": s.author or (s.id.split("/")[0] if "/" in s.id else username),
                    "private": s.private,
                    "sdk": s.sdk,
                    "likes": s.likes or 0,
                    "lastModified": str(s.last_modified) if s.last_modified else None,
                    "stage": getattr(s, 'stage', 'RUNNING') or 'RUNNING'
                }
                for s in spaces
            ]
        except Exception:
            return []

    def restart_space(self, repo_id: str):
        try:
            return self.api.restart_space(repo_id=repo_id)
        except Exception:
            return None

    def pause_space(self, repo_id: str):
        try:
            return self.api.pause_space(repo_id=repo_id)
        except Exception:
            return None

    def get_space_runtime(self, repo_id: str) -> Dict[str, Any]:
        try:
            info = self.api.space_info(repo_id=repo_id)
            return {
                "id": info.id,
                "sdk": info.sdk,
                "stage": getattr(info, 'stage', 'RUNNING'),
                "hardware": getattr(info, 'hardware', 'cpu-basic')
            }
        except Exception:
            return {"id": repo_id, "sdk": "static", "stage": "RUNNING"}

    # --- REPO FILES ---
    def list_repo_files(self, repo_id: str, repo_type: str = "model") -> List[Dict[str, Any]]:
        try:
            files = self.api.list_repo_tree(repo_id=repo_id, repo_type=repo_type)
            result = []
            for f in files:
                result.append({
                    "path": f.path,
                    "type": "file" if getattr(f, 'size', None) is not None else "directory",
                    "size": getattr(f, 'size', 0) or 0
                })
            return result
        except Exception:
            return []

    async def get_raw_file_content(self, repo_id: str, path: str, repo_type: str = "model") -> str:
        headers = self.get_auth_headers()
        type_prefix = f"{repo_type}s/" if repo_type != "model" else ""
        url = f"https://huggingface.co/{type_prefix}{repo_id}/raw/main/{path}"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.text
            return f"Errore nel caricamento del file ({resp.status_code})"

    # --- INFERENCE CHAT ---
    async def run_chat_inference(
        self,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 512,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Runs chat inference using Hugging Face router API."""
        headers = self.get_auth_headers()
        headers["Content-Type"] = "application/json"
        
        endpoint = "https://router.huggingface.co/hf-inference/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"success": True, "content": content, "raw": data}
            else:
                return {"success": False, "error": resp.text, "status_code": resp.status_code}
