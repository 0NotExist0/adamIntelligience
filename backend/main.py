import os
import sys
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.browser_auth import BrowserAuthManager, save_session, load_session, clear_session
from backend.hf_client import HFManager
from backend.copilot import CopilotEngine

app = FastAPI(
    title="Hugging Face Modern Dashboard API",
    description="Backend per gestire modelli, dataset, spaces e inferenza su Hugging Face",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

browser_auth_mgr = BrowserAuthManager()

# --- Request Models ---
class TokenLoginRequest(BaseModel):
    token: str

class CookieLoginRequest(BaseModel):
    cookie: str

class CredentialsLoginRequest(BaseModel):
    username_or_email: str
    password: str

class CreateModelRequest(BaseModel):
    repo_id: str
    private: bool = False
    license: str = "apache-2.0"
    tags: List[str] = []
    readme_content: Optional[str] = None

class CreateDatasetRequest(BaseModel):
    repo_id: str
    private: bool = False
    readme_content: Optional[str] = None

class CreateSpaceRequest(BaseModel):
    repo_id: str
    sdk: str = "gradio"
    hardware: str = "cpu-basic"
    private: bool = False

class CreateChatbotSpaceRequest(BaseModel):
    name: str
    model_id: str = "meta-llama/Llama-3.2-3B-Instruct"
    system_prompt: str = "Sei un assistente AI amichevole, intelligente ed esperto."
    title: Optional[str] = None
    sdk: str = "gradio"
    private: bool = False

class InferenceChatRequest(BaseModel):
    model: str = "meta-llama/Llama-3.2-1B-Instruct"
    messages: List[Dict[str, str]]
    max_tokens: int = 512
    temperature: float = 0.7

class CopilotChatRequest(BaseModel):
    model: str = "Qwen/Qwen2.5-Coder-32B-Instruct"
    messages: List[Dict[str, str]]
    max_tokens: int = 1024
    temperature: float = 0.7

# --- AUTH ROUTES ---
@app.get("/api/auth/status")
async def get_auth_status():
    session = load_session()
    if not session:
        return {"authenticated": False, "user": None}
    
    try:
        manager = HFManager(token=session.get("token"), cookie=session.get("cookie"))
        user = await manager.get_whoami()
        return {"authenticated": True, "user": user, "auth_type": session.get("auth_type", "token")}
    except Exception as e:
        return {"authenticated": False, "user": None, "error": str(e)}

@app.post("/api/auth/login-credentials")
async def login_with_credentials(req: CredentialsLoginRequest):
    username_or_email = req.username_or_email.strip()
    password = req.password
    if not username_or_email or not password:
        raise HTTPException(status_code=400, detail="Inserisci sia l'email/username che la password.")
    
    result = await browser_auth_mgr.login_with_email_password(username_or_email, password)
    if not result.get("success"):
        raise HTTPException(status_code=401, detail=result.get("error", "Credenziali non valide."))
    return result

@app.post("/api/auth/login-token")
async def login_with_token(req: TokenLoginRequest):
    token = req.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token non valido o vuoto.")
    
    try:
        manager = HFManager(token=token)
        user = await manager.get_whoami()
        session_data = {
            "auth_type": "token",
            "token": token,
            "cookie": None,
            "user": user
        }
        save_session(session_data)
        return {"success": True, "user": user, "auth_type": "token"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token non valido: {str(e)}")

@app.post("/api/auth/login-cookie")
async def login_with_cookie(req: CookieLoginRequest):
    cookie = req.cookie.strip()
    if not cookie:
        raise HTTPException(status_code=400, detail="Cookie non valido o vuoto.")
    
    try:
        manager = HFManager(cookie=cookie)
        user = await manager.get_whoami()
        session_data = {
            "auth_type": "cookie",
            "token": None,
            "cookie": cookie,
            "user": user
        }
        save_session(session_data)
        return {"success": True, "user": user, "auth_type": "cookie"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Cookie di sessione non valido o scaduto: {str(e)}")

@app.post("/api/auth/browser-login")
async def trigger_browser_login():
    if browser_auth_mgr.is_logging_in:
        return {"success": False, "status": "already_running", "message": "Finestra browser già in esecuzione..."}
    
    result = await browser_auth_mgr.launch_browser_login()
    return result

@app.post("/api/auth/logout")
async def logout():
    clear_session()
    return {"success": True, "message": "Disconnesso con successo."}

# --- DASHBOARD & METRICS ---
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    session = load_session()
    if not session:
        return {
            "authenticated": False,
            "stats": {"models": 0, "datasets": 0, "spaces": 0, "total_downloads": 0, "total_likes": 0}
        }
    
    manager = HFManager()
    user = await manager.get_whoami()
    username = user.get("name")
    
    models = manager.list_user_models(username=username)
    datasets = manager.list_user_datasets(username=username)
    spaces = manager.list_user_spaces(username=username)
    
    total_downloads = sum(m.get("downloads", 0) for m in models) + sum(d.get("downloads", 0) for d in datasets)
    total_likes = sum(m.get("likes", 0) for m in models) + sum(d.get("likes", 0) for d in datasets) + sum(s.get("likes", 0) for s in spaces)
    
    return {
        "authenticated": True,
        "user": user,
        "stats": {
            "models_count": len(models),
            "datasets_count": len(datasets),
            "spaces_count": len(spaces),
            "total_downloads": total_downloads,
            "total_likes": total_likes,
        },
        "recent_models": models[:4],
        "recent_spaces": spaces[:4],
        "recent_datasets": datasets[:4]
    }

# --- MODELS ---
@app.get("/api/models")
async def get_user_models():
    manager = HFManager()
    user = await manager.get_whoami()
    return manager.list_user_models(username=user.get("name"))

@app.get("/api/hub/models/search")
async def search_hub_models(q: str = "", task: Optional[str] = None, sort: str = "downloads", limit: int = 30):
    manager = HFManager()
    return manager.search_models(query=q, task=task, sort=sort, limit=limit)

@app.post("/api/models/create")
async def create_new_model(req: CreateModelRequest):
    manager = HFManager()
    try:
        res = await manager.create_repo_universal(
            name=req.repo_id,
            repo_type="model",
            private=req.private,
            license=req.license,
            tags=req.tags,
            readme_content=req.readme_content
        )
        return {"success": True, "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/repos/{repo_type}/{repo_owner}/{repo_name}/files")
async def list_repo_files(repo_type: str, repo_owner: str, repo_name: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        files = manager.list_repo_files(repo_id=repo_id, repo_type=repo_type)
        return files
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/repos/{repo_type}/{repo_owner}/{repo_name}/raw-file")
async def get_repo_raw_file(repo_type: str, repo_owner: str, repo_name: str, path: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        content = await manager.get_raw_file_content(repo_id=repo_id, path=path, repo_type=repo_type)
        return {"path": path, "content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/repos/{repo_type}/{repo_owner}/{repo_name}/upload")
async def upload_file_to_repo(
    repo_type: str,
    repo_owner: str,
    repo_name: str,
    file: UploadFile = File(...),
    path_in_repo: Optional[str] = Form(None),
    commit_message: Optional[str] = Form("Upload file via HF Modern Dashboard")
):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    content = await file.read()
    target_path = path_in_repo if path_in_repo else file.filename
    try:
        success = await manager.commit_files_direct(
            repo_id=repo_id,
            files=[{"path": target_path, "content": content}],
            repo_type=repo_type,
            commit_message=commit_message
        )
        if not success:
            raise Exception("Impossibile caricare il file su Hugging Face")
        return {"success": True, "path": target_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/repos/{repo_type}/{repo_owner}/{repo_name}/delete-file")
async def delete_repo_file(repo_type: str, repo_owner: str, repo_name: str, path: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        manager.delete_file_from_repo(repo_id=repo_id, path_in_repo=path, repo_type=repo_type)
        return {"success": True, "path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/repos/{repo_type}/{repo_owner}/{repo_name}")
async def delete_entire_repo(repo_type: str, repo_owner: str, repo_name: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        success = await manager.delete_repo_direct(repo_id=repo_id, repo_type=repo_type)
        if not success:
            raise Exception("Impossibile eliminare il repository")
        return {"success": True, "repo_id": repo_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- DATASETS ---
@app.get("/api/datasets")
async def get_user_datasets():
    manager = HFManager()
    user = await manager.get_whoami()
    return manager.list_user_datasets(username=user.get("name"))

@app.get("/api/hub/datasets/search")
async def search_hub_datasets(q: str = "", sort: str = "downloads", limit: int = 30):
    manager = HFManager()
    return manager.search_datasets(query=q, sort=sort, limit=limit)

@app.post("/api/datasets/create")
async def create_new_dataset(req: CreateDatasetRequest):
    manager = HFManager()
    try:
        res = await manager.create_repo_universal(
            name=req.repo_id,
            repo_type="dataset",
            private=req.private,
            readme_content=req.readme_content
        )
        return {"success": True, "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- SPACES ---
@app.get("/api/spaces")
async def get_user_spaces():
    manager = HFManager()
    user = await manager.get_whoami()
    return manager.list_user_spaces(username=user.get("name"))

@app.post("/api/spaces/create")
async def create_new_space(req: CreateSpaceRequest):
    manager = HFManager()
    try:
        res = await manager.create_repo_universal(
            name=req.repo_id,
            repo_type="space",
            sdk=req.sdk,
            hardware=req.hardware,
            private=req.private
        )
        return {"success": True, "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/spaces/create-chatbot")
async def create_chatbot_space(req: CreateChatbotSpaceRequest):
    manager = HFManager()
    clean_name = req.name.strip().replace(" ", "-")
    title = req.title or clean_name
    model_id = req.model_id.strip()
    
    try:
        res = await manager.create_repo_universal(
            name=clean_name,
            repo_type="space",
            sdk=req.sdk or "static",
            private=req.private,
            model_id=model_id,
            title=title,
            system_prompt=req.system_prompt
        )
        full_repo_id = res["repo_id"]
        active_sdk = res.get("sdk", req.sdk)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    embed_url = f"https://{full_repo_id.replace('/', '-')}.hf.space"
    return {
        "success": True,
        "repo_id": full_repo_id,
        "space_url": f"https://huggingface.co/spaces/{full_repo_id}",
        "embed_url": embed_url,
        "model_id": model_id,
        "title": title,
        "sdk": active_sdk
    }

@app.post("/api/spaces/{repo_owner}/{repo_name}/restart")
async def restart_space_endpoint(repo_owner: str, repo_name: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        manager.restart_space(repo_id=repo_id)
        return {"success": True, "repo_id": repo_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/spaces/{repo_owner}/{repo_name}/pause")
async def pause_space_endpoint(repo_owner: str, repo_name: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        manager.pause_space(repo_id=repo_id)
        return {"success": True, "repo_id": repo_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/spaces/{repo_owner}/{repo_name}/runtime")
async def get_space_runtime_endpoint(repo_owner: str, repo_name: str):
    manager = HFManager()
    repo_id = f"{repo_owner}/{repo_name}"
    try:
        return manager.get_space_runtime(repo_id=repo_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from backend.browser_auth import BrowserAuthManager, save_session, load_session, clear_session
from backend.hf_client import HFManager
from backend.openrouter_client import OpenRouterManager, POPULAR_OPENROUTER_MODELS
from backend.copilot import CopilotEngine

class SaveOpenRouterKeyRequest(BaseModel):
    api_key: str

# --- OPENROUTER ROUTES ---
@app.get("/api/openrouter/status")
async def get_openrouter_status():
    orm = OpenRouterManager()
    key = orm.get_api_key()
    masked = f"{key[:7]}...{key[-4:]}" if len(key) > 12 else ("Configurata" if key else "")
    return {
        "configured": bool(key),
        "api_key_masked": masked
    }

@app.post("/api/openrouter/save-key")
async def save_openrouter_key(req: SaveOpenRouterKeyRequest):
    orm = OpenRouterManager()
    orm.set_api_key(req.api_key)
    return {"success": True, "message": "Chiave API OpenRouter salvata con successo!"}

@app.get("/api/openrouter/models")
async def get_openrouter_models():
    orm = OpenRouterManager()
    return await orm.list_models()

@app.post("/api/openrouter/chat")
async def openrouter_chat(req: InferenceChatRequest):
    orm = OpenRouterManager()
    return await orm.chat(
        messages=req.messages,
        model=req.model,
        temperature=req.temperature,
        max_tokens=req.max_tokens
    )

# --- INFERENCE PLAYGROUND ---
@app.post("/api/inference/chat")
async def chat_inference(req: InferenceChatRequest):
    orm = OpenRouterManager()
    
    # If model is an OpenRouter model or user has OpenRouter key, try OpenRouter first
    is_openrouter_model = (
        ":free" in req.model or 
        req.model.startswith("openai/") or 
        req.model.startswith("anthropic/") or 
        req.model.startswith("google/") or 
        req.model.startswith("deepseek/") or
        req.model.startswith("qwen/") or
        req.model.startswith("mistralai/") or
        orm.get_api_key()
    )
    
    if is_openrouter_model:
        res = await orm.chat(
            messages=req.messages,
            model=req.model,
            max_tokens=req.max_tokens,
            temperature=req.temperature
        )
        if res.get("success"):
            return res

    # Fallback to HF Inference
    manager = HFManager()
    result = await manager.run_chat_inference(
        model=req.model,
        messages=req.messages,
        max_tokens=req.max_tokens,
        temperature=req.temperature
    )
    return result

# --- COPILOT AI ASSISTANT ---
@app.post("/api/copilot/chat")
async def copilot_chat(req: CopilotChatRequest):
    manager = HFManager()
    orm = OpenRouterManager()
    copilot = CopilotEngine(hf_manager=manager, openrouter_manager=orm)
    result = await copilot.chat(
        messages=req.messages,
        model=req.model,
        temperature=req.temperature,
        max_tokens=req.max_tokens
    )
    return result

from backend.web_search import WebSearchEngine
from backend.agent_pipeline import AgentPipeline

class AgentAnalyzeRequest(BaseModel):
    prompt: str

class AgentSearchRequest(BaseModel):
    query: str
    max_results: int = 5

class AgentChatRequest(BaseModel):
    prompt: str
    messages: Optional[List[Dict[str, str]]] = None
    model: str = "meta-llama/llama-3.3-70b-instruct:free"
    saved_memories: Optional[List[Dict[str, Any]]] = None
    force_web_search: bool = False

# --- AGENT AI ROUTES (DYNAMIC CALIBRATION, WEB SEARCH & MEMORY HIERARCHY) ---
@app.post("/api/agent/analyze-prompt")
async def agent_analyze_prompt(req: AgentAnalyzeRequest):
    pipeline = AgentPipeline()
    return await pipeline.analyze_prompt(req.prompt)

@app.post("/api/agent/web-search")
async def agent_web_search(req: AgentSearchRequest):
    search_engine = WebSearchEngine()
    return await search_engine.search(req.query, max_results=req.max_results)

@app.post("/api/agent/chat")
async def agent_chat(req: AgentChatRequest):
    pipeline = AgentPipeline()
    return await pipeline.run(
        prompt=req.prompt,
        messages=req.messages,
        model=req.model,
        saved_memories=req.saved_memories,
        force_web_search=req.force_web_search
    )

# --- SERVE FRONTEND STATIC FILES ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_candidate = os.path.join(dist_path, full_path)
        if os.path.isfile(file_candidate):
            return FileResponse(file_candidate)
        return FileResponse(os.path.join(dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
