import json
import re
from typing import List, Dict, Any, Optional
from backend.hf_client import HFManager
from backend.openrouter_client import OpenRouterManager

SYSTEM_PROMPT = """Sei l'Assistente AI Copilot Ufficiale della Dashboard OpenRouter & Hugging Face Studio.
Sei un esperto di Machine Learning, OpenRouter, LLM (DeepSeek R1, Llama 3.3, Claude 3.5 Sonnet, GPT-4o, Qwen), Hugging Face Hub, Transformers, Datasets e Spaces.
Comunichi in modo chiaro, professionale ed entusiasta in Italiano (o nella lingua usata dall'utente).

Hai a disposizione delle AZIONI SPECIALI per eseguire operazioni automatiche:
1. Se l'utente vuole CREARE un modello, dataset o space, puoi eseguire l'azione rispondendo con un blocco JSON speciale:
```action
{
  "action": "create_model",
  "name": "nome-modello",
  "private": false,
  "license": "apache-2.0",
  "tags": ["pytorch", "transformers"]
}
```
oppure per un dataset:
```action
{
  "action": "create_dataset",
  "name": "nome-dataset",
  "private": false
}
```
oppure per uno space/chatbot:
```action
{
  "action": "create_space",
  "name": "nome-space",
  "sdk": "static",
  "private": false
}
```
oppure per cercare:
```action
{
  "action": "search_hub",
  "query": "text-to-image",
  "type": "model"
}
```

Aggiungi SEMPRE una spiegazione testuale prima o dopo il blocco azione, spiegando cosa stai facendo e fornendo consigli pratici!
"""

class CopilotEngine:
    def __init__(self, hf_manager: Optional[HFManager] = None, openrouter_manager: Optional[OpenRouterManager] = None):
        self.hf_manager = hf_manager or HFManager()
        self.or_manager = openrouter_manager or OpenRouterManager()

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """
        Processes conversation with selected AI model on OpenRouter (with HF fallback),
        detects actions, executes them automatically, and returns result.
        """
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        # 1. If model is an OpenRouter model or user has OpenRouter configured, call OpenRouter
        if "/" in model and (self.or_manager.get_api_key() or ":free" in model or "openai" in model or "anthropic" in model or "google" in model or "deepseek" in model):
            res = await self.or_manager.chat(
                messages=full_messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
        else:
            # Fallback to HF Inference
            res = await self.hf_manager.run_chat_inference(
                model=model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=temperature
            )

        if not res.get("success"):
            return {
                "success": False,
                "content": f"⚠️ Errore con il modello {model}: {res.get('error')}.\n\n👉 *Consiglio: Puoi inserire la tua chiave API di OpenRouter nella sezione 'Token & Sessione' per sbloccare tutti i modelli senza limiti.*",
                "action_executed": None
            }

        reply_content = res.get("content", "")
        action_result = None

        # Check for action blocks
        action_match = re.search(r"```action\s*([\s\S]*?)\s*```", reply_content)
        if action_match:
            try:
                action_data = json.loads(action_match.group(1).strip())
                action_type = action_data.get("action")

                if action_type == "create_model":
                    create_res = await self.hf_manager.create_repo_universal(
                        name=action_data.get("name"),
                        repo_type="model",
                        private=action_data.get("private", False),
                        license=action_data.get("license", "apache-2.0"),
                        tags=action_data.get("tags", ["pytorch"])
                    )
                    action_result = {
                        "type": "create_model",
                        "status": "success",
                        "data": create_res,
                        "message": f"✅ Modello '{create_res['repo_id']}' creato con successo!"
                    }
                    reply_content += f"\n\n🎉 **Azione Eseguita Automaticamente**: Ho creato per te il modello [`{create_res['repo_id']}`]({create_res['url']})!"

                elif action_type == "create_dataset":
                    create_res = await self.hf_manager.create_repo_universal(
                        name=action_data.get("name"),
                        repo_type="dataset",
                        private=action_data.get("private", False)
                    )
                    action_result = {
                        "type": "create_dataset",
                        "status": "success",
                        "data": create_res,
                        "message": f"✅ Dataset '{create_res['repo_id']}' creato con successo!"
                    }
                    reply_content += f"\n\n🎉 **Azione Eseguita Automaticamente**: Ho creato per te il dataset [`{create_res['repo_id']}`]({create_res['url']})!"

                elif action_type == "create_space":
                    create_res = await self.hf_manager.create_repo_universal(
                        name=action_data.get("name"),
                        repo_type="space",
                        sdk=action_data.get("sdk", "static"),
                        private=action_data.get("private", False)
                    )
                    action_result = {
                        "type": "create_space",
                        "status": "success",
                        "data": create_res,
                        "message": f"✅ Space Chatbot '{create_res['repo_id']}' creato con successo!"
                    }
                    reply_content += f"\n\n🚀 **Azione Eseguita Automaticamente**: Ho creato il tuo Chatbot Space [`{create_res['repo_id']}`]({create_res['url']})!"

                elif action_type == "search_hub":
                    q = action_data.get("query", "")
                    search_type = action_data.get("type", "model")
                    if search_type == "dataset":
                        items = self.hf_manager.search_datasets(query=q, limit=5)
                    else:
                        items = self.hf_manager.search_models(query=q, limit=5)
                    
                    summary = "\n".join([f"- **{i['id']}** (⭐ {i.get('likes', 0)} likes, 📥 {i.get('downloads', 0)} downloads)" for i in items])
                    reply_content += f"\n\n🔍 **Risultati Ricerca per '{q}'**:\n{summary}"
                    action_result = {"type": "search_hub", "status": "success", "data": items}

            except Exception as e:
                reply_content += f"\n\n⚠️ *Nota sull'azione automatica: {str(e)}*"
                action_result = {"status": "error", "error": str(e)}

        clean_content = re.sub(r"```action[\s\S]*?```", "", reply_content).strip()

        return {
            "success": True,
            "content": clean_content if clean_content else reply_content,
            "action_executed": action_result
        }
