import json
import re
from typing import List, Dict, Any, Optional
from backend.openrouter_client import OpenRouterManager
from backend.web_search import WebSearchEngine
from backend.browser_auth import load_session

META_ANALYZER_PROMPT = """Sei un Meta-Agente AI specializzato nell'analisi preliminare dei prompt e nell'ottimizzazione degli iperparametri di inferenza.
Il tuo compito è analizzare il prompt dell'utente e determinare con precisione chirurgica:
1. "task_type": Tipologia ("code", "math_logic", "factual_query", "creative_writing", "system_config", "general_qa")
2. "temperature": Valore float ottimale da 0.0 a 1.0:
   - 0.0 - 0.2: per codice, matematica, formule, query fattuali rigide, traduzioni esatte (massima determinazione e precisione).
   - 0.3 - 0.6: per spiegazioni tecniche, sintesi, consigli strutturati.
   - 0.7 - 0.9: per brainstorming, scrittura creativa, storytelling.
3. "max_tokens": Numero intero di token sufficienti ma non sprecati (es. 300 per risposta breve, 1200 per spiegazione media, 2500 per codice completo/saggio).
4. "needs_web_search": true se la domanda richiede fatti recenti, dati esterni verificabili, notizie o confronto oggettivo sul web, altrimenti false.
5. "search_query": Stringa con parole chiave pulite per il motore di ricerca (oppure stringa vuota).
6. "reasoning_strategy": Breve frase (1 riga) sulla strategia logica da seguire per una risposta priva di dubbi.

Rispondi ESCLUSIVAMENTE con un blocco JSON valido con questa struttura:
```json
{
  "task_type": "...",
  "temperature": 0.2,
  "max_tokens": 1200,
  "needs_web_search": true,
  "search_query": "...",
  "reasoning_strategy": "..."
}
```
"""

class AgentPipeline:
    def __init__(self, openrouter_manager: Optional[OpenRouterManager] = None, search_engine: Optional[WebSearchEngine] = None):
        self.or_manager = openrouter_manager or OpenRouterManager()
        self.search_engine = search_engine or WebSearchEngine()

    async def analyze_prompt(self, prompt: str, base_model: str = "google/gemini-2.0-flash-exp:free") -> Dict[str, Any]:
        """
        Meta-modello che analizza il prompt inserito e imposta temperatura e token necessari.
        """
        # Fast rule-based heuristics fallback
        lower_p = prompt.lower()
        is_code = any(k in lower_p for k in ["codice", "script", "python", "javascript", "react", "html", "css", "sql", "funzione", "bug", "regex"])
        is_math = any(k in lower_p for k in ["calcola", "matematica", "quanto fa", "formula", "percentuale", "algoritmo"])
        is_creative = any(k in lower_p for k in ["inventa", "racconta", "storia", "poesia", "creativo", "favola", "sceneggiatura"])
        is_factual = any(k in lower_p for k in ["chi è", "cosa è", "quando", "dove", "notizie", "chi ha vinto", "versione", "prezzo", "meteo", "anno"])

        fallback_temp = 0.2 if (is_code or is_math or is_factual) else (0.8 if is_creative else 0.5)
        fallback_tokens = 2048 if (is_code or "dettagliat" in lower_p) else (512 if len(prompt) < 40 else 1024)
        fallback_web = is_factual or any(k in lower_p for k in ["ultim", "oggi", "2026", "2025", "2024", "attual", "news", "cerca", "trova"])
        
        fallback_meta = {
            "task_type": "code" if is_code else ("math_logic" if is_math else ("creative_writing" if is_creative else ("factual_query" if is_factual else "general_qa"))),
            "temperature": fallback_temp,
            "max_tokens": fallback_tokens,
            "needs_web_search": fallback_web,
            "search_query": prompt[:80],
            "reasoning_strategy": "Analisi logica step-by-step con validazione delle fonti e priorità ai vincoli salvati."
        }

        # Try fast LLM meta-analysis
        try:
            res = await self.or_manager.chat(
                messages=[
                    {"role": "system", "content": META_ANALYZER_PROMPT},
                    {"role": "user", "content": f"Prompt da analizzare: \"{prompt}\""}
                ],
                model="google/gemini-2.0-flash-exp:free",
                temperature=0.1,
                max_tokens=300
            )

            if res.get("success"):
                content = res.get("content", "")
                json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
                json_str = json_match.group(1).strip() if json_match else content.strip()
                parsed = json.loads(json_str)

                return {
                    "task_type": str(parsed.get("task_type", fallback_meta["task_type"])),
                    "temperature": float(parsed.get("temperature", fallback_temp)),
                    "max_tokens": int(parsed.get("max_tokens", fallback_tokens)),
                    "needs_web_search": bool(parsed.get("needs_web_search", fallback_web)),
                    "search_query": str(parsed.get("search_query", prompt[:80])).strip(),
                    "reasoning_strategy": str(parsed.get("reasoning_strategy", fallback_meta["reasoning_strategy"]))
                }
        except Exception:
            pass

        return fallback_meta

    async def run(
        self,
        prompt: str,
        messages: Optional[List[Dict[str, str]]] = None,
        model: str = "meta-llama/llama-3.3-70b-instruct:free",
        saved_memories: Optional[List[Dict[str, Any]]] = None,
        force_web_search: bool = False
    ) -> Dict[str, Any]:
        """
        Esegue l'intera pipeline dell'Agente:
        1. Meta-Analisi prompt -> calcolo dinamico Temperatura e Max Tokens.
        2. Caricamento memoria salvata (Priorità 1 Assoluta).
        3. Fact-checking sul Web in tempo reale (Priorità 2).
        4. Conciliazione dei conflitti con priorità alle memorie salvate.
        5. Generazione risposta affidabile e priva di dubbi.
        """
        # 1. Meta-Analisi del prompt
        meta = await self.analyze_prompt(prompt)
        temp = meta["temperature"]
        tokens = meta["max_tokens"]
        should_search = force_web_search or meta.get("needs_web_search", False)

        # 2. Memory Vault Grounding (Priorità 1)
        memories = saved_memories or []
        memory_lines = []
        for idx, m in enumerate(memories, 1):
            txt = m.get("text") if isinstance(m, dict) else str(m)
            cat = m.get("category", "Generale") if isinstance(m, dict) else "Regola"
            memory_lines.append(f"{idx}. [{cat}] {txt}")
        
        memory_block = "\n".join(memory_lines) if memory_lines else "Nessun dato salvato in memoria."

        # 3. Web Search (Priorità 2)
        web_data = {"results": [], "summary_text": ""}
        if should_search:
            q = meta.get("search_query") or prompt
            web_data = await self.search_engine.search(q, max_results=4)

        # 4. Strict Hierarchy System Prompt
        strict_system_prompt = f"""Sei un Agente AI di Massima Precisione e Ragionamento Avanzato.
Il tuo obiettivo assoluto è fornire una risposta esatta, chiara, verificata e PRIVA DI DUBBI.

=============================================================================
🏛️ [GERARCHIA DELLE FONTI E PRIORITÀ ASSOLUTA DELLE INFORMAZIONI]:
1. 🥇 PRIORITÀ 1 (ASSOLUTA - LEGGE): INFORMAZIONI E REGOLE SALVATE NELLA MEMORIA UTENTE/VAULT.
   Tutti i fatti, le regole e le preferenze elencate di seguito hanno priorità gerarchica assoluta.
   Se un'informazione sul web o nei tuoi dati pregressi contraddice quanto salvato in memoria, DEVI SEMPRE APPLICARE E DARE RAGIONE ALLA MEMORIA SALVATA.

   [INFORMAZIONI SALVATE IN MEMORIA - PRIORITÀ 1]:
{memory_block}

2. 🥈 PRIORITÀ 2: VERIFICA WEB IN TEMPO REALE.
   Utilizza le seguenti informazioni verificate dal Web per garantire dati aggiornati ed esatti (fatti, eventi, link, specifiche), a patto che NON violino la Priorità 1:

{web_data.get("summary_text") if web_data.get("results") else "Nessuna ricerca web attiva per questa richiesta."}

3. 🥉 PRIORITÀ 3: CONOSCENZA INTERNA DEL MODELLO.
   Utilizzata per sintesi, logica e spiegazione coerente.

=============================================================================
🎯 [LINEE GUIDA PER LA RISPOSTA]:
- Strategia di ragionamento calibrata: {meta.get("reasoning_strategy")}
- Sii sicuro, trasparente ed esaustivo.
- Cita le fonti web pertinenti con i relativi link se disponibili e rilevanti.
- Se l'informazione fornita rispetta una regola salvata nel Vault, assicurati di mantenerla coerente al 100%.
"""

        # Assemble full conversation messages
        conversation_history = messages or [{"role": "user", "content": prompt}]
        
        final_messages = [
            {"role": "system", "content": strict_system_prompt}
        ] + [m for m in conversation_history if m.get("role") != "system"]

        # 5. Generazione risposta con i parametri calibrati
        gen_res = await self.or_manager.chat(
            messages=final_messages,
            model=model,
            temperature=temp,
            max_tokens=tokens
        )

        if not gen_res.get("success"):
            return {
                "success": False,
                "error": gen_res.get("error"),
                "meta": meta,
                "web_sources": web_data.get("results", []),
                "memory_applied_count": len(memories)
            }

        return {
            "success": True,
            "content": gen_res.get("content", ""),
            "meta": meta,
            "calibrated_temperature": temp,
            "calibrated_max_tokens": tokens,
            "task_type": meta.get("task_type"),
            "reasoning_strategy": meta.get("reasoning_strategy"),
            "web_sources": web_data.get("results", []),
            "web_search_performed": bool(web_data.get("results")),
            "memory_applied_count": len(memories),
            "model_used": gen_res.get("model", model),
            "usage": gen_res.get("usage", {})
        }
