import os
import json
import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Studio Pro Vercel Serverless API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# --- Models ---
class AgentAnalyzeRequest(BaseModel):
    prompt: str

class AgentSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class AgentChatRequest(BaseModel):
    prompt: str
    messages: Optional[List[Dict[str, str]]] = None
    model: str = "openrouter/free"
    saved_memories: Optional[List[Dict[str, Any]]] = None
    force_web_search: bool = False

class InferenceChatRequest(BaseModel):
    model: str = "openrouter/free"
    messages: List[Dict[str, str]]
    max_tokens: int = 1024
    temperature: float = 0.7

class SaveKeyRequest(BaseModel):
    api_key: str

class ScrapeUrlRequest(BaseModel):
    url: str
    max_chars: Optional[int] = 8000

# In-memory storage for serverless session
_OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# --- Helper Functions ---
async def search_duckduckgo_lite(query: str, max_results: int = 8) -> List[Dict[str, str]]:
    url = "https://html.duckduckgo.com/html/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://html.duckduckgo.com/"
    }
    data = {"q": query, "b": ""}
    results = []
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.post(url, headers=headers, data=data)
            if resp.status_code == 200:
                html = resp.text
                blocks = re.findall(r'(<div[^>]*class="[^"]*results_links[^"]*"[\s\S]*?)(?=<div[^>]*class="[^"]*results_links[^"]*"|<div[^>]*class="nav-link"|$)', html)
                for b in blocks[:max_results]:
                    t_m = re.search(r'<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', b)
                    s_m = re.search(r'<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)</a>', b)
                    if t_m:
                        raw_url = t_m.group(1)
                        raw_title = t_m.group(2)
                        title = re.sub(r'<[^>]+>', '', raw_title).strip()
                        snippet = re.sub(r'<[^>]+>', '', s_m.group(1)).strip() if s_m else ''
                        if 'uddg=' in raw_url:
                            m = re.search(r'uddg=([^&]+)', raw_url)
                            if m:
                                raw_url = urllib.parse.unquote(m.group(1))
                        if title and raw_url:
                            results.append({
                                "title": title,
                                "snippet": snippet,
                                "url": raw_url,
                                "source": "DuckDuckGo Web"
                            })
    except Exception as e:
        pass
    return results

async def search_wikipedia(query: str, max_results: int = 2) -> List[Dict[str, str]]:
    results = []
    clean_q = urllib.parse.quote(query)
    for lang in ["it", "en"]:
        url = f"https://{lang}.wikipedia.org/w/api.php?action=opensearch&search={clean_q}&limit={max_results}&namespace=0&format=json"
        headers = {"User-Agent": USER_AGENT}
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if len(data) >= 4 and len(data[1]) > 0:
                        titles, snippets, urls = data[1], data[2], data[3]
                        for i in range(len(titles)):
                            if i < len(snippets) and snippets[i]:
                                results.append({
                                    "title": titles[i],
                                    "snippet": snippets[i],
                                    "url": urls[i] if i < len(urls) else f"https://{lang}.wikipedia.org/wiki/{titles[i]}",
                                    "source": f"Wikipedia ({lang.upper()})"
                                })
        except Exception:
            pass
        if len(results) >= max_results:
            break
    return results

async def scrape_web_page(url: str, max_chars: int = 8000) -> Dict[str, Any]:
    if not url or not url.startswith("http"):
        return {"success": False, "error": "URL non valido", "url": url}
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                html = resp.text
                # Remove scripts, styles, etc.
                clean_html = re.sub(r'<(script|style|noscript|nav|header|footer|svg)[\s\S]*?</\1>', '', html, flags=re.IGNORECASE)
                title_m = re.search(r'<title[^>]*>([\s\S]*?)</title>', clean_html, re.IGNORECASE)
                title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else url

                # Extract text
                text = re.sub(r'<[^>]+>', ' ', clean_html)
                text = re.sub(r'\s+', ' ', text).strip()
                extracted = text[:max_chars]
                return {
                    "success": True,
                    "url": url,
                    "title": title,
                    "content": extracted,
                    "word_count": len(extracted.split()),
                    "method": "Backend HTML Scraper"
                }
    except Exception as e:
        return {"success": False, "error": str(e), "url": url}
    return {"success": False, "error": "Impossibile scaricare la pagina", "url": url}

async def perform_web_search(query: str, max_results: int = 6) -> Dict[str, Any]:
    if not query or not query.strip():
        return {"query": query, "results": [], "summary_text": "Nessuna ricerca richiesta."}
    
    clean_query = query.strip()
    ddg = await search_duckduckgo_lite(clean_query, max_results=max_results)
    wiki = await search_wikipedia(clean_query, max_results=2)
    
    all_results = []
    seen = set()
    for item in ddg + wiki:
        u = item.get("url", "")
        if u and u not in seen:
            seen.add(u)
            all_results.append(item)

    if not all_results:
        summary_text = f"Ricerca Web per '{clean_query}': Nessun risultato rilevante reperito."
    else:
        lines = [f"### 🌐 RISULTATI VERIFICATI DAL WEB (Query: '{clean_query}'):"]
        for idx, r in enumerate(all_results[:max_results], 1):
            lines.append(f"{idx}. **{r['title']}** [{r.get('source', 'Web')}]")
            if r.get("snippet"):
                lines.append(f"   *Estratto*: {r['snippet']}")
            if r.get("url"):
                lines.append(f"   *Link*: {r['url']}")
        summary_text = "\n".join(lines)

    return {
        "query": clean_query,
        "results_count": len(all_results),
        "results": all_results[:max_results],
        "summary_text": summary_text
    }

async def call_openrouter(
    messages: List[Dict[str, str]], 
    model: str, 
    temperature: float = 0.7, 
    max_tokens: int = 1024,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    active_key = (api_key or _OPENROUTER_API_KEY).strip()
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aistudio.vercel.app",
        "X-Title": "AI Studio Pro Vercel"
    }
    if active_key:
        headers["Authorization"] = f"Bearer {active_key}"
    else:
        return {
            "success": False,
            "error": "Chiave API OpenRouter mancante! Inserisci la tua chiave API (gratuita su openrouter.ai/keys) nelle Impostazioni o nella barra superiore."
        }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(f"{OPENROUTER_API_BASE}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"success": True, "content": content, "model": data.get("model", target_model), "usage": data.get("usage", {})}
            else:
                err_text = resp.text
                if any(err_kw in err_text.lower() for err_kw in ["unavailable for free", "use this slug instead", "no endpoints found", "not found"]):
                    fallback_payload = {**payload, "model": "openrouter/free"}
                    f_resp = await client.post(f"{OPENROUTER_API_BASE}/chat/completions", headers=headers, json=fallback_payload)
                    if f_resp.status_code == 200:
                        f_data = f_resp.json()
                        return {
                            "success": True,
                            "content": f_data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                            "model": "openrouter/free",
                            "usage": f_data.get("usage", {})
                        }
                return {"success": False, "error": f"OpenRouter Error ({resp.status_code}): {err_text}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

# --- API Endpoints ---
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "platform": "Vercel Serverless"}

@app.get("/api/auth/status")
async def auth_status():
    return {"authenticated": True, "auth_type": "google_ready"}

@app.get("/api/openrouter/status")
async def openrouter_status():
    return {"configured": bool(_OPENROUTER_API_KEY), "api_key_masked": f"{_OPENROUTER_API_KEY[:6]}..." if _OPENROUTER_API_KEY else ""}

@app.post("/api/openrouter/save-key")
async def save_openrouter_key(req: SaveKeyRequest):
    global _OPENROUTER_API_KEY
    _OPENROUTER_API_KEY = req.api_key.strip()
    return {"success": True}

@app.post("/api/agent/web-search")
async def agent_web_search(req: AgentSearchRequest):
    return await perform_web_search(req.query, max_results=req.max_results)

@app.post("/api/agent/scrape-url")
async def agent_scrape_url(req: ScrapeUrlRequest):
    return await scrape_web_page(req.url, max_chars=req.max_chars or 8000)

@app.post("/api/agent/analyze-prompt")
async def agent_analyze_prompt(req: AgentAnalyzeRequest):
    p = req.prompt.lower()
    is_code = any(k in p for k in ["codice", "script", "python", "javascript", "react", "html", "css", "sql", "funzione", "regex"])
    is_math = any(k in p for k in ["calcola", "quanto fa", "formula", "matematica", "percentuale"])
    is_creative = any(k in p for k in ["inventa", "racconta", "storia", "poesia", "creativo"])
    is_factual = any(k in p for k in ["chi è", "cosa è", "quando", "dove", "notizie", "ultim", "2026", "2025", "aggiornat"])
    
    temp = 0.1 if (is_code or is_math) else (0.85 if is_creative else (0.2 if is_factual else 0.5))
    tokens = 8192
    needs_web = is_factual or any(k in p for k in ["news", "ultim", "oggi", "prezzo", "versione"])
    
    return {
        "task_type": "code" if is_code else ("math_logic" if is_math else ("creative_writing" if is_creative else "factual_query")),
        "temperature": temp,
        "max_tokens": tokens,
        "needs_web_search": needs_web,
        "search_query": req.prompt[:80],
        "reasoning_strategy": "Analisi logica step-by-step con validazione e priorità alla memoria locale."
    }

@app.post("/api/inference/chat")
@app.post("/api/openrouter/chat")
async def inference_chat(req: InferenceChatRequest):
    return await call_openrouter(messages=req.messages, model=req.model, temperature=req.temperature, max_tokens=req.max_tokens)

@app.post("/api/agent/chat")
async def agent_chat(req: AgentChatRequest):
    # 1. Analyze prompt
    analysis = await agent_analyze_prompt(AgentAnalyzeRequest(prompt=req.prompt))
    temp = analysis["temperature"]
    tokens = analysis["max_tokens"]
    
    # 2. Web search if needed
    web_res = {"results": [], "summary_text": ""}
    if req.force_web_search or analysis["needs_web_search"]:
        web_res = await perform_web_search(analysis["search_query"] or req.prompt, max_results=4)
        
    # 3. Format memory context (Priority 1)
    memories = req.saved_memories or []
    mem_lines = [f"{i+1}. [{m.get('category', 'Regola')}] {m.get('text', '')}" for i, m in enumerate(memories)]
    mem_block = "\n".join(mem_lines) if mem_lines else "Nessun dato salvato."
    
    # 4. Strict Hierarchy System Prompt
    system_prompt = f"""Sei un Agente AI di Massima Precisione.
GERARCHIA DELLE FONTI:
1. PRIORITÀ 1 (ASSOLUTA): INFORMAZIONI SALVATE NEL VAULT UTENTE:
{mem_block}
(Qualsiasi informazione salvata sopra sovrascrive qualsiasi dato contrario trovato sul web o nei modelli).

2. PRIORITÀ 2: VERIFICA WEB IN TEMPO REALE:
{web_res.get('summary_text', 'Nessuna ricerca attiva.')}

Fornisci una risposta esatta, chiara, verificata e priva di dubbi."""

    history = req.messages or [{"role": "user", "content": req.prompt}]
    full_messages = [{"role": "system", "content": system_prompt}] + [m for m in history if m.get("role") != "system"]
    
    gen = await call_openrouter(messages=full_messages, model=req.model, temperature=temp, max_tokens=tokens)
    
    return {
        "success": gen.get("success", False),
        "content": gen.get("content", ""),
        "error": gen.get("error"),
        "meta": analysis,
        "calibrated_temperature": temp,
        "calibrated_max_tokens": tokens,
        "web_sources": web_res.get("results", []),
        "web_search_performed": bool(web_res.get("results")),
        "memory_applied_count": len(memories)
    }

# --- WORKSPACE SERVERLESS STUB / STORAGE ---
_WORKSPACE_SESSIONS = []

class WorkspaceSetFolderRequest(BaseModel):
    folder_path: str

class WorkspaceSaveFileRequest(BaseModel):
    folder_path: str
    relative_path: str
    content: str

class WorkspaceRunCommandRequest(BaseModel):
    folder_path: str
    command: str

class WorkspaceSaveSessionRequest(BaseModel):
    id: str
    title: str
    folder_path: Optional[str] = ""
    messages: List[Dict[str, Any]]
    model: Optional[str] = ""
    timestamp: Optional[int] = None

class WorkspaceDeleteFileRequest(BaseModel):
    folder_path: str
    relative_path: str

class WorkspaceAgentTaskRequest(BaseModel):
    folder_path: str
    task_prompt: str
    messages: Optional[List[Dict[str, Any]]] = None
    model: str = "openrouter/free"
    max_iterations: Optional[int] = 5
    api_key: Optional[str] = None

class WorkspaceBrowseNativeRequest(BaseModel):
    initial_dir: Optional[str] = None

@app.get("/api/workspace/info")
async def serverless_workspace_info():
    return {
        "current_project_dir": "/workspace",
        "default_folder": "/workspace",
        "user_home": "/home",
        "desktop_dir": "/home/Desktop",
        "platform": "serverless"
    }

@app.post("/api/workspace/browse-native")
async def serverless_browse_native(req: WorkspaceBrowseNativeRequest):
    return {"cancelled": True, "folder_path": None}

@app.get("/api/workspace/browse-dirs")
async def serverless_browse_dirs(target_path: Optional[str] = None):
    return {
        "connected": True,
        "current": target_path or "/workspace",
        "parent": None,
        "drives": ["/"],
        "quick_locations": [{"label": "Workspace", "path": "/workspace"}],
        "subdirectories": []
    }

@app.post("/api/workspace/set-folder")
async def serverless_set_folder(req: WorkspaceSetFolderRequest):
    return {"success": True, "folder_path": req.folder_path, "folder_name": req.folder_path.split("/")[-1] or req.folder_path}

@app.get("/api/workspace/tree")
async def serverless_get_tree(folder_path: str = ""):
    return {"folder_path": folder_path, "tree": []}

@app.get("/api/workspace/file-content")
async def serverless_file_content(folder_path: str, relative_path: str):
    return {"success": True, "path": relative_path, "content": "// File in ambiente serverless"}

@app.post("/api/workspace/save-file")
async def serverless_save_file(req: WorkspaceSaveFileRequest):
    return {"success": True, "path": req.relative_path, "message": "File salvato"}

@app.post("/api/workspace/delete-file")
async def serverless_delete_file(req: WorkspaceDeleteFileRequest):
    return {"success": True, "path": req.relative_path, "message": "File eliminato"}

@app.post("/api/workspace/run-command")
async def serverless_run_command(req: WorkspaceRunCommandRequest):
    return {"success": True, "stdout": f"Comando '{req.command}' simulato in ambiente cloud", "stderr": "", "returncode": 0}

@app.post("/api/workspace/agent-task")
async def serverless_agent_task(req: WorkspaceAgentTaskRequest):
    sys_prompt = f"""Sei un Agente AI di Ingegneria del Software Autonomo ("Workspace Coding Agent").
Il tuo obiettivo è operare DIRETTAMENTE sui file della cartella di lavoro ({req.folder_path}) dell'utente.

TOOL A DISPOSIZIONE:
1. [list_files()] -> Elenca i file
2. [read_file(path="nome_file.ext")] -> Legge il contenuto
3. [write_file(path="nome_file.ext", content="...")] -> Crea o sovrascrive un file direttamente sul disco del PC dell'utente
4. [edit_file(path="nome_file.ext", target="vecchio", replacement="nuovo")] -> Modifica una parte del file
5. [delete_file(path="nome_file.ext")] -> Elimina un file
6. [ask_user(question="...")] -> Se non sai come andare avanti, mancano requisiti, la richiesta è ambigua o ci sono decisioni architetturali/tecniche da prendere, FERMATI ed usa questo tool per porre domande chiare all'utente.

🛑 REGOLA FONDAMENTALE DI AUTONOMIA E CHIARIMENTO:
Se mancano informazioni, requisiti o file necessari per proseguire, NON FARE SUPPOSIZIONI AZZARDATE E NON INVENTARE.
FERMATI IMMEDIATAMENTE ed usa [ask_user(question="...")] o formula chiaramente le domande e le opzioni consigliate per l'utente.

Rispondi usando i blocchi tool nel formato [tool_name(...)] o <|tool_call_start|>[tool_name(...)]<|tool_call_end|>. Formula spiegazioni chiare in italiano."""

    conv = [{"role": "system", "content": sys_prompt}]
    if req.messages:
        conv.extend([m for m in req.messages if m.get("role") != "system"])
    if not conv or conv[-1].get("content") != req.task_prompt:
        conv.append({"role": "user", "content": req.task_prompt})
    
    llm_res = await call_openrouter(
        messages=conv,
        model=req.model or "openrouter/free",
        temperature=0.2,
        max_tokens=4096,
        api_key=req.api_key
    )
    
    content = llm_res.get("content", "")
    tool_matches = re.findall(r"\[(write_file|read_file|edit_file|delete_file|list_files|ask_user)\s*\(([\s\S]*?)\)\]", content)
    steps = []
    for idx, (tname, targs) in enumerate(tool_matches, start=1):
        steps.append({
            "iteration": idx,
            "tool": tname,
            "args": targs,
            "result": {"output": f"Tool {tname} completato"}
        })

    cleaned = re.sub(r"<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>", "", content).strip()
    cleaned = re.sub(r"\[(list_files|read_file|write_file|edit_file|delete_file|ask_user)\s*\([\s\S]*?\)\]", "", cleaned).strip()

    return {
        "success": llm_res.get("success", False),
        "content": cleaned or content,
        "error": llm_res.get("error"),
        "folder": req.folder_path,
        "steps": steps,
        "steps_count": len(steps),
        "model": req.model,
        "iterations": 1
    }

@app.get("/api/workspace/sessions")
async def serverless_list_sessions():
    return {"sessions": _WORKSPACE_SESSIONS}

@app.post("/api/workspace/sessions/save")
async def serverless_save_session(req: WorkspaceSaveSessionRequest):
    global _WORKSPACE_SESSIONS
    existing = next((i for i, s in enumerate(_WORKSPACE_SESSIONS) if s.get("id") == req.id), None)
    sess = {
        "id": req.id,
        "title": req.title,
        "folder_path": req.folder_path,
        "messages": req.messages,
        "model": req.model,
        "timestamp": req.timestamp or 0
    }
    if existing is not None:
        _WORKSPACE_SESSIONS[existing] = sess
    else:
        _WORKSPACE_SESSIONS.insert(0, sess)
    return {"success": True, "session": sess}

@app.delete("/api/workspace/sessions/{session_id}")
async def serverless_delete_session(session_id: str):
    global _WORKSPACE_SESSIONS
    _WORKSPACE_SESSIONS = [s for s in _WORKSPACE_SESSIONS if s.get("id") != session_id]
    return {"success": True, "deleted_id": session_id}

