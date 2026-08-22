import os
import httpx
from typing import List, Dict, Any, Optional
from backend.browser_auth import load_session, save_session

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"

POPULAR_OPENROUTER_MODELS = [
    {
        "id": "google/gemini-2.0-flash-exp:free",
        "name": "Google Gemini 2.0 Flash (FREE)",
        "tag": "Gratuito • Velocità Estrema",
        "desc": "Il nuovissimo modello Google ultra rapido con finestra di contesto enorme da 1M token.",
        "badge": "Ultra Fast",
        "color": "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
    },
    {
        "id": "deepseek/deepseek-r1:free",
        "name": "DeepSeek R1 (FREE)",
        "tag": "Gratuito • Ragionamento Deep",
        "desc": "Il modello di ragionamento matematico e deduttivo che compete con OpenAI o1.",
        "badge": "Top Reasoning",
        "color": "border-blue-500/40 text-blue-300 bg-blue-500/10"
    },
    {
        "id": "qwen/qwen-2.5-coder-32b-instruct:free",
        "name": "Qwen 2.5 Coder 32B (FREE)",
        "tag": "Gratuito • Coding & Script",
        "desc": "Specializzato in generazione codice, programmazione Python/JS e automazione.",
        "badge": "Dev & Code",
        "color": "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
    },
    {
        "id": "mistralai/mistral-7b-instruct:free",
        "name": "Mistral 7B Instruct (FREE)",
        "tag": "Gratuito • Versatile",
        "desc": "Leggero, rapido e conciso per task quotidiani e risposte sintetiche.",
        "badge": "Free Classic",
        "color": "border-amber-500/40 text-amber-300 bg-amber-500/10"
    },
    {
        "id": "meta-llama/llama-3.1-8b-instruct:free",
        "name": "Meta Llama 3.1 8B Instruct (FREE)",
        "tag": "Gratuito • Meta Open Source",
        "desc": "Modello rapido e compatto di Meta per compiti generali.",
        "badge": "100% FREE",
        "color": "border-purple-500/40 text-purple-300 bg-purple-500/10"
    },
    {
        "id": "anthropic/claude-3.5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "tag": "Stato dell'Arte per Scrittura & Codice",
        "desc": "Il modello di riferimento mondiale per intelligenza e comprensione sfumature.",
        "badge": "PRO Anthropic",
        "color": "border-orange-500/40 text-orange-300 bg-orange-500/10"
    },
    {
        "id": "openai/gpt-4o",
        "name": "OpenAI GPT-4o",
        "tag": "Multimodale Flagship",
        "desc": "Il modello di punta di OpenAI per compiti complessi e multilingua.",
        "badge": "PRO OpenAI",
        "color": "border-teal-500/40 text-teal-300 bg-teal-500/10"
    },
    {
        "id": "openai/gpt-4o-mini",
        "name": "OpenAI GPT-4o Mini",
        "tag": "Economico & Veloce",
        "desc": "Versione snella ed economica di GPT-4o con eccellenti capacità.",
        "badge": "PRO Budget",
        "color": "border-teal-500/30 text-teal-200 bg-teal-500/5"
    }
]

class OpenRouterManager:
    def __init__(self, api_key: Optional[str] = None):
        self.session = load_session()
        # Look for openrouter_api_key in session or environment or passed arg
        self.api_key = (
            api_key or 
            self.session.get("openrouter_api_key") or 
            os.environ.get("OPENROUTER_API_KEY") or 
            ""
        ).strip()

    def get_api_key(self) -> str:
        return self.api_key

    def set_api_key(self, key: str):
        self.api_key = key.strip()
        self.session["openrouter_api_key"] = self.api_key
        save_session(self.session)

    def get_auth_headers(self) -> Dict[str, str]:
        headers = {
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "HF Studio & OpenRouter Dashboard",
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "openrouter/free",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> Dict[str, Any]:
        """
        Sends chat completion to OpenRouter API.
        Works with free models even without an API key or with user's key for all models.
        """
        headers = self.get_auth_headers()
        
        # If user has no API key and model is not a :free model, warn them or default to a free model
        active_model = model
        if not active_model or "llama-3.3-70b-instruct:free" in active_model:
            # Fallback to free router equivalent
            active_model = "openrouter/free"

        payload = {
            "model": active_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                resp = await client.post(
                    f"{OPENROUTER_API_BASE}/chat/completions",
                    headers=headers,
                    json=payload
                )

                if resp.status_code == 200:
                    data = resp.json()
                    choice = data.get("choices", [{}])[0]
                    content = choice.get("message", {}).get("content", "")
                    return {
                        "success": True,
                        "content": content,
                        "model": data.get("model", active_model),
                        "usage": data.get("usage", {})
                    }
                else:
                    err_json = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                    err_msg = err_json.get("error", {}).get("message") or resp.text
                    
                    # Auto fallback to Gemini 2.0 Flash if unavailable for free
                    if "unavailable for free" in err_msg.lower() or "use this slug instead" in err_msg.lower():
                        fallback_payload = {**payload, "model": "google/gemini-2.0-flash-exp:free"}
                        f_resp = await client.post(f"{OPENROUTER_API_BASE}/chat/completions", headers=headers, json=fallback_payload)
                        if f_resp.status_code == 200:
                            f_data = f_resp.json()
                            return {
                                "success": True,
                                "content": f_data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                                "model": "google/gemini-2.0-flash-exp:free",
                                "usage": f_data.get("usage", {})
                            }

                    return {
                        "success": False,
                        "error": f"OpenRouter Error ({resp.status_code}): {err_msg}",
                        "status_code": resp.status_code
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Errore di connessione a OpenRouter: {str(e)}"
                }

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetches all models from OpenRouter or returns popular list."""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{OPENROUTER_API_BASE}/models", headers=self.get_auth_headers())
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    formatted = []
                    for m in data[:80]:
                        is_free = ":free" in m.get("id", "") or (float(m.get("pricing", {}).get("prompt", 0)) == 0)
                        formatted.append({
                            "id": m.get("id"),
                            "name": m.get("name") + (" (FREE)" if is_free and "FREE" not in m.get("name") else ""),
                            "desc": m.get("description", "")[:120],
                            "context_length": m.get("context_length", 4096),
                            "is_free": is_free,
                            "pricing": m.get("pricing", {})
                        })
                    return formatted
        except Exception:
            pass
        return POPULAR_OPENROUTER_MODELS
