import os
import sys
import subprocess
import json
import re
import asyncio
from typing import List, Dict, Any, Optional
from backend.openrouter_client import OpenRouterManager

WORKSPACE_AGENT_SYSTEM_PROMPT = """Sei un Agente AI di Ingegneria del Software Autonomo ("Workspace Coding Agent").
Il tuo obiettivo è operare DIRETTAMENTE sulla CARTELLA DI LAVORO target specificata dall'utente per completare qualsiasi richiesta di analisi, programmazione, debug, refactoring, creazione file o esecuzione comandi da terminale.

=============================================================================
📁 [CARTELLA DI LAVORO TARGET]:
{target_folder}

=============================================================================
🛠️ [TOOL A DISPOSIZIONE PER OPERARE SULLA CARTELLA]:
Puoi invocare uno o più tool rispondendo ESCLUSIVAMENTE con uno o più blocchi tool nel formato:

1. Elencare i file e cartelle:
<|tool_call_start|>[list_files(subpath="")]<|tool_call_end|>

2. Leggere il contenuto completo di un file:
<|tool_call_start|>[read_file(path="percorso/del/file.ext")]<|tool_call_end|>

3. Scrivere o creare un nuovo file con il codice specificato:
<|tool_call_start|>[write_file(path="percorso/del/file.ext", content="...tuo codice completo...")]<|tool_call_end|>

4. Modificare una porzione di codice in un file (replace):
<|tool_call_start|>[edit_file(path="percorso/del/file.ext", target="vecchio_codice", replacement="nuovo_codice")]<|tool_call_end|>

5. Cercare testo/pattern in tutti i file della cartella (grep):
<|tool_call_start|>[search_code(query="parola_o_funzione")]<|tool_call_end|>

6. Eseguire un comando da terminale/shell nella cartella di lavoro:
<|tool_call_start|>[run_command(command="npm run build")]<|tool_call_end|>

7. Eliminare un file:
<|tool_call_start|>[delete_file(path="percorso/del/file.ext")]<|tool_call_end|>

=============================================================================
🎯 [LINEE GUIDA PER IL RAGIONAMENTO]:
- Prima di modificare un file o creare nuovo codice, leggi i file pertinenti con [read_file(...)] o elenca la struttura con [list_files(...)].
- Quando scrivi o modifichi file, assicurati che il codice sia completo, privo di errori di sintassi e conforme allo stack tecnologico del progetto.
- Se opportuno, puoi eseguire comandi da terminale (es. test, linter, build) con [run_command(...)] per verificare che tutto funzioni.
- Formula spiegazioni chiare e dettagliate in italiano prima e dopo ogni operazione.
"""

def sanitize_path(base_folder: str, relative_path: str) -> str:
    """Safely resolves path within base folder or allows normalized absolute path."""
    clean_base = os.path.abspath(base_folder)
    if not relative_path:
        return clean_base
    
    if os.path.isabs(relative_path):
        clean_target = os.path.abspath(relative_path)
        if clean_target.startswith(clean_base):
            return clean_target
        return clean_target
    
    clean_target = os.path.abspath(os.path.join(clean_base, relative_path))
    return clean_target

def get_directory_tree(folder_path: str, max_depth: int = 4, current_depth: int = 0) -> List[Dict[str, Any]]:
    """Returns a hierarchical file and directory tree structure."""
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        return []
    
    if current_depth > max_depth:
        return []
    
    ignored_names = {
        ".git", "node_modules", "__pycache__", ".next", ".nuxt", "dist", 
        "build", ".venv", "venv", ".idea", ".vscode", ".DS_Store"
    }
    
    items = []
    try:
        entries = sorted(os.scandir(folder_path), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            if entry.name in ignored_names:
                continue
            
            item_info = {
                "name": entry.name,
                "path": os.path.abspath(entry.path),
                "relative_path": os.path.relpath(entry.path, folder_path).replace("\\", "/"),
                "is_dir": entry.is_dir(),
            }
            
            if entry.is_dir():
                item_info["children"] = get_directory_tree(entry.path, max_depth, current_depth + 1)
            else:
                try:
                    stat = entry.stat()
                    item_info["size"] = stat.st_size
                    item_info["modified"] = stat.st_mtime
                    _, ext = os.path.splitext(entry.name)
                    item_info["extension"] = ext.lstrip(".").lower()
                except Exception:
                    item_info["size"] = 0
            
            items.append(item_info)
    except PermissionError:
        pass
    except Exception as e:
        print(f"Error scanning {folder_path}: {e}")
        
    return items

def list_flat_files(folder_path: str, subpath: str = "", max_files: int = 150) -> List[Dict[str, Any]]:
    """Lists files in directory recursively up to max_files."""
    target = sanitize_path(folder_path, subpath)
    if not os.path.exists(target):
        return []
    
    ignored_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
    results = []
    
    for root, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, folder_path)
            try:
                size = os.path.getsize(full_path)
            except Exception:
                size = 0
            results.append({
                "name": f,
                "relative_path": rel_path.replace("\\", "/"),
                "size_bytes": size
            })
            if len(results) >= max_files:
                break
        if len(results) >= max_files:
            break
            
    return results

def read_file_content(folder_path: str, relative_path: str, max_chars: int = 50000) -> Dict[str, Any]:
    """Reads content of a file."""
    full_path = sanitize_path(folder_path, relative_path)
    if not os.path.exists(full_path):
        return {"success": False, "error": f"File non trovato: {relative_path}"}
    if os.path.isdir(full_path):
        return {"success": False, "error": f"Il percorso specificato è una cartella, non un file: {relative_path}"}
    
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(max_chars)
        return {
            "success": True,
            "path": relative_path,
            "full_path": full_path,
            "content": content,
            "size_bytes": os.path.getsize(full_path),
            "is_truncated": os.path.getsize(full_path) > max_chars
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def write_file_content(folder_path: str, relative_path: str, content: str) -> Dict[str, Any]:
    """Writes content to a file, creating parent directories if needed."""
    full_path = sanitize_path(folder_path, relative_path)
    try:
        parent_dir = os.path.dirname(full_path)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)
            
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {
            "success": True,
            "path": relative_path,
            "full_path": full_path,
            "size_bytes": len(content.encode("utf-8")),
            "message": f"File '{relative_path}' salvato con successo."
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def edit_file_content(folder_path: str, relative_path: str, target: str, replacement: str) -> Dict[str, Any]:
    """Replaces a targeted block of content in a file."""
    read_res = read_file_content(folder_path, relative_path)
    if not read_res.get("success"):
        return read_res
    
    original = read_res.get("content", "")
    if target not in original:
        return {
            "success": False,
            "error": f"Il blocco di codice target non è stato trovato esattamente in '{relative_path}'."
        }
    
    updated = original.replace(target, replacement, 1)
    return write_file_content(folder_path, relative_path, updated)

def search_code_in_workspace(folder_path: str, query: str, max_matches: int = 50) -> List[Dict[str, Any]]:
    """Performs full text search across files in the workspace."""
    if not os.path.exists(folder_path):
        return []
    
    ignored_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
    matches = []
    
    for root, dirs, files in os.walk(folder_path):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for f in files:
            if f.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.exe', '.pyc', '.wasm')):
                continue
            
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, folder_path).replace("\\", "/")
            
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as file_obj:
                    for line_num, line in enumerate(file_obj, 1):
                        if query.lower() in line.lower():
                            matches.append({
                                "file": rel_path,
                                "line_number": line_num,
                                "line_content": line.strip()
                            })
                            if len(matches) >= max_matches:
                                return matches
            except Exception:
                continue
                
    return matches

def execute_workspace_command(folder_path: str, command: str, timeout_seconds: int = 30) -> Dict[str, Any]:
    """Runs a shell command inside the workspace directory."""
    if not os.path.exists(folder_path):
        return {"success": False, "error": f"Cartella non trovata: {folder_path}"}
    
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=folder_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
            encoding="utf-8",
            errors="replace"
        )
        return {
            "success": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout or "",
            "stderr": proc.stderr or "",
            "command": command,
            "cwd": folder_path
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"Comando terminato per timeout ({timeout_seconds}s).",
            "command": command
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "command": command
        }

def delete_workspace_file(folder_path: str, relative_path: str) -> Dict[str, Any]:
    """Deletes a file in the workspace."""
    full_path = sanitize_path(folder_path, relative_path)
    if not os.path.exists(full_path):
        return {"success": False, "error": f"File non trovato: {relative_path}"}
    try:
        if os.path.isdir(full_path):
            import shutil
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return {"success": True, "message": f"'{relative_path}' eliminato con successo."}
    except Exception as e:
        return {"success": False, "error": str(e)}

class WorkspaceAgentRunner:
    def __init__(self, openrouter_manager: Optional[OpenRouterManager] = None):
        self.or_manager = openrouter_manager or OpenRouterManager()

    def parse_tool_calls(self, text: str) -> List[Dict[str, Any]]:
        """Parses tool calls from model output."""
        calls = []
        if not text:
            return calls
        
        # Pattern 1: <|tool_call_start|>[tool_name(...)]<|tool_call_end|>
        pattern = r"<\|tool_call_start\|>\[?(\w+)\s*\(([\s\S]*?)\)\]?<\|tool_call_end\|>"
        for match in re.finditer(pattern, text):
            name = match.group(1).lower().strip()
            raw_args = match.group(2).strip()
            calls.append({"name": name, "raw_args": raw_args, "raw_match": match.group(0)})
        
        # Pattern 2: [tool_name(path="...")]
        if not calls:
            pattern2 = r"\[(list_files|read_file|write_file|edit_file|search_code|run_command|delete_file)\s*\(([\s\S]*?)\)\]"
            for match in re.finditer(pattern2, text):
                name = match.group(1).lower().strip()
                raw_args = match.group(2).strip()
                calls.append({"name": name, "raw_args": raw_args, "raw_match": match.group(0)})
                
        return calls

    def execute_tool(self, folder_path: str, tool_name: str, raw_args: str) -> Dict[str, Any]:
        """Executes a single tool and returns output."""
        try:
            if tool_name == "list_files":
                m = re.search(r'subpath\s*=\s*["\']([^"\']*)["\']', raw_args)
                subpath = m.group(1) if m else ""
                files = list_flat_files(folder_path, subpath)
                formatted = "\n".join([f"- {f['relative_path']} ({f['size_bytes']} bytes)" for f in files])
                return {
                    "tool": "list_files",
                    "output": formatted if formatted else "Nessun file trovato.",
                    "data": files
                }
            
            elif tool_name == "read_file":
                m = re.search(r'path\s*=\s*["\']([^"\']+)["\']', raw_args)
                path = m.group(1) if m else raw_args.strip("\"'")
                res = read_file_content(folder_path, path)
                if res.get("success"):
                    return {
                        "tool": "read_file",
                        "path": path,
                        "output": f"=== CONTENUTO DI {path} ===\n{res['content']}",
                        "content": res["content"]
                    }
                return {"tool": "read_file", "path": path, "output": f"Errore: {res.get('error')}"}

            elif tool_name == "write_file":
                p_match = re.search(r'path\s*=\s*["\']([^"\']+)["\']', raw_args)
                c_match = re.search(r'content\s*=\s*(?:"""([\s\S]*?)"""|\'\'\'([\s\S]*?)\'\'\'|"([\s\S]*?)"|\'([\s\S]*?)\')', raw_args)
                
                path = p_match.group(1) if p_match else ""
                content = ""
                if c_match:
                    content = c_match.group(1) or c_match.group(2) or c_match.group(3) or c_match.group(4) or ""
                else:
                    parts = raw_args.split("content=", 1)
                    if len(parts) > 1:
                        content = parts[1].strip().strip('\'"')
                
                res = write_file_content(folder_path, path, content)
                return {
                    "tool": "write_file",
                    "path": path,
                    "output": res.get("message") if res.get("success") else f"Errore scrittura: {res.get('error')}",
                    "success": res.get("success", False)
                }

            elif tool_name == "edit_file":
                p_match = re.search(r'path\s*=\s*["\']([^"\']+)["\']', raw_args)
                path = p_match.group(1) if p_match else ""
                t_match = re.search(r'target\s*=\s*(?:"""([\s\S]*?)"""|"([\s\S]*?)")', raw_args)
                r_match = re.search(r'replacement\s*=\s*(?:"""([\s\S]*?)"""|"([\s\S]*?)")', raw_args)
                target = t_match.group(1) or t_match.group(2) if t_match else ""
                replacement = r_match.group(1) or r_match.group(2) if r_match else ""
                
                res = edit_file_content(folder_path, path, target, replacement)
                return {
                    "tool": "edit_file",
                    "path": path,
                    "output": res.get("message") if res.get("success") else f"Errore modifica: {res.get('error')}",
                    "success": res.get("success", False)
                }

            elif tool_name == "search_code":
                m = re.search(r'query\s*=\s*["\']([^"\']+)["\']', raw_args)
                query = m.group(1) if m else raw_args.strip("\"'")
                matches = search_code_in_workspace(folder_path, query)
                formatted = "\n".join([f"- {m['file']}:{m['line_number']} -> {m['line_content']}" for m in matches])
                return {
                    "tool": "search_code",
                    "query": query,
                    "output": formatted if formatted else f"Nessuna corrispondenza per '{query}'.",
                    "matches": matches
                }

            elif tool_name == "run_command":
                m = re.search(r'command\s*=\s*["\']([^"\']+)["\']', raw_args)
                cmd = m.group(1) if m else raw_args.strip("\"'")
                res = execute_workspace_command(folder_path, cmd)
                out = f"[ESECUZIONE]: {cmd}\n[CODICE USCITA]: {res.get('returncode')}\n"
                if res.get("stdout"):
                    out += f"[STDOUT]:\n{res['stdout']}\n"
                if res.get("stderr"):
                    out += f"[STDERR]:\n{res['stderr']}\n"
                if res.get("error"):
                    out += f"[ERRORE]:\n{res['error']}\n"
                return {
                    "tool": "run_command",
                    "command": cmd,
                    "output": out,
                    "stdout": res.get("stdout", ""),
                    "stderr": res.get("stderr", ""),
                    "success": res.get("success", False)
                }

            elif tool_name == "delete_file":
                m = re.search(r'path\s*=\s*["\']([^"\']+)["\']', raw_args)
                path = m.group(1) if m else raw_args.strip("\"'")
                res = delete_workspace_file(folder_path, path)
                return {
                    "tool": "delete_file",
                    "path": path,
                    "output": res.get("message") if res.get("success") else f"Errore: {res.get('error')}"
                }
            
            else:
                return {"tool": tool_name, "output": f"Tool '{tool_name}' non riconosciuto."}
        except Exception as e:
            return {"tool": tool_name, "output": f"Eccezione durante l'esecuzione del tool: {str(e)}"}

    async def run_task(
        self,
        folder_path: str,
        task_prompt: str,
        messages: Optional[List[Dict[str, str]]] = None,
        model: str = "openrouter/free",
        max_iterations: int = 5
    ) -> Dict[str, Any]:
        """Runs the autonomous workspace agent multi-step loop."""
        clean_folder = os.path.abspath(folder_path.strip().strip('"').strip("'"))
        if not os.path.exists(clean_folder):
            try:
                os.makedirs(clean_folder, exist_ok=True)
            except Exception as e:
                return {"success": False, "error": f"La cartella specificata non esiste e non può essere creata: {e}"}
        
        system_prompt = WORKSPACE_AGENT_SYSTEM_PROMPT.format(target_folder=clean_folder)
        conversation = [{"role": "system", "content": system_prompt}]
        
        if messages:
            conversation.extend([m for m in messages if m.get("role") != "system"])
        if not conversation or conversation[-1].get("content") != task_prompt:
            conversation.append({"role": "user", "content": task_prompt})

        steps_executed = []
        iteration = 0
        final_answer = ""

        while iteration < max_iterations:
            iteration += 1
            
            llm_res = await self.or_manager.chat(
                messages=conversation,
                model=model,
                temperature=0.1,
                max_tokens=4096
            )
            
            if not llm_res.get("success"):
                return {
                    "success": False,
                    "error": llm_res.get("error"),
                    "steps": steps_executed,
                    "folder": clean_folder
                }
            
            response_content = llm_res.get("content", "")
            tool_calls = self.parse_tool_calls(response_content)
            
            if not tool_calls:
                final_answer = response_content
                break
            
            tool_observations = []
            for call in tool_calls:
                tool_res = self.execute_tool(clean_folder, call["name"], call["raw_args"])
                steps_executed.append({
                    "iteration": iteration,
                    "tool": call["name"],
                    "args": call["raw_args"],
                    "result": tool_res
                })
                tool_observations.append(f"[RISULTATO TOOL {call['name']}]:\n{tool_res['output']}")
            
            conversation.append({"role": "assistant", "content": response_content})
            conversation.append({
                "role": "user",
                "content": f"Ecco i risultati delle operazioni sulla cartella:\n\n" + "\n\n".join(tool_observations) + "\n\nProsegui con il prossimo step oppure formula la risposta finale se hai completato la task."
            })

        cleaned_text = final_answer or response_content
        cleaned_text = re.sub(r"<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>", "", cleaned_text).strip()
        cleaned_text = re.sub(r"\[(list_files|read_file|write_file|edit_file|search_code|run_command|delete_file)\s*\([\s\S]*?\)\]", "", cleaned_text).strip()

        return {
            "success": True,
            "content": cleaned_text,
            "folder": clean_folder,
            "steps": steps_executed,
            "steps_count": len(steps_executed),
            "model": model,
            "iterations": iteration
        }

def open_native_folder_dialog(initial_dir: Optional[str] = None) -> Optional[str]:
    """Opens a native OS folder picker dialog in an isolated process so it appears on top and doesn't block server."""
    start_dir = os.path.abspath(initial_dir) if (initial_dir and os.path.exists(initial_dir)) else os.path.expanduser("~")
    
    # On Windows: try PowerShell FolderBrowserDialog with top-most form in STA thread
    if sys.platform.startswith("win"):
        start_esc = start_dir.replace("'", "''")
        ps_script = f"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Seleziona la cartella di lavoro su cui far operare l''Agente AI'
$dialog.SelectedPath = '{start_esc}'
$dialog.ShowNewFolderButton = $true

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.Opacity = 0
$form.ShowInTaskbar = $false
$form.StartPosition = 'CenterScreen'
$form.Show()
$form.BringToFront()
$form.Activate()

$result = $dialog.ShowDialog($form)
$form.Dispose()

if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Write-Output $dialog.SelectedPath
}}
"""
        try:
            res = subprocess.run(
                ["powershell", "-NoProfile", "-STA", "-Command", ps_script],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=180
            )
            out_path = res.stdout.strip()
            if out_path and os.path.exists(out_path):
                return os.path.abspath(out_path)
        except Exception as e:
            print(f"PowerShell dialog error: {e}")

    # Fallback to isolated Python Tkinter subprocess
    tk_code = f"""
import tkinter as tk
from tkinter import filedialog
import os, sys

try:
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    root.lift()
    root.focus_force()
    res = filedialog.askdirectory(initialdir={repr(start_dir)}, title="Seleziona la cartella di lavoro")
    root.destroy()
    if res:
        print(os.path.abspath(res))
except Exception as e:
    sys.exit(1)
"""
    try:
        res = subprocess.run(
            [sys.executable, "-c", tk_code],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180
        )
        out_path = res.stdout.strip()
        if out_path and os.path.exists(out_path):
            return os.path.abspath(out_path)
    except Exception as e:
        print(f"Tkinter fallback dialog error: {e}")
        
    return None

def list_system_drives_and_subdirs(target_path: Optional[str] = None) -> Dict[str, Any]:
    """Lists drives and subdirectories to browse local PC filesystem easily in UI."""
    drives = []
    if sys.platform.startswith("win"):
        import string
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                drives.append(drive)
    else:
        drives.append("/")

    user_home = os.path.expanduser("~")
    onedrive = os.path.join(user_home, "OneDrive")
    
    # Check OneDrive Desktop / Documents vs standard
    desktop = os.path.join(onedrive, "Desktop") if os.path.exists(os.path.join(onedrive, "Desktop")) else os.path.join(user_home, "Desktop")
    documents = os.path.join(onedrive, "Documents") if os.path.exists(os.path.join(onedrive, "Documents")) else os.path.join(user_home, "Documents")
    downloads = os.path.join(user_home, "Downloads")
    
    clean_target = target_path.strip().strip('"').strip("'") if target_path else ""
    current = os.path.abspath(clean_target) if (clean_target and os.path.exists(clean_target)) else (desktop if os.path.exists(desktop) else user_home)
    parent = os.path.dirname(current) if os.path.dirname(current) != current else None

    subdirs = []
    try:
        if os.path.exists(current) and os.path.isdir(current):
            for entry in os.scandir(current):
                try:
                    if entry.is_dir(follow_symlinks=False) and not entry.name.startswith(('$Recycle.Bin', 'System Volume Information')):
                        subdirs.append({
                            "name": entry.name,
                            "path": os.path.abspath(entry.path)
                        })
                except Exception:
                    pass
        subdirs.sort(key=lambda s: s["name"].lower())
    except Exception as e:
        print(f"Error scanning directory {current}: {e}")

    quick_locs = [
        {"label": "Desktop", "path": desktop if os.path.exists(desktop) else user_home},
        {"label": "Documenti", "path": documents if os.path.exists(documents) else user_home},
        {"label": "Download", "path": downloads if os.path.exists(downloads) else user_home},
        {"label": "Home Utente", "path": user_home},
    ]
    if os.path.exists(onedrive):
        quick_locs.insert(1, {"label": "OneDrive", "path": onedrive})

    return {
        "connected": True,
        "current": current,
        "parent": parent,
        "drives": drives,
        "quick_locations": quick_locs,
        "subdirectories": subdirs[:150]
    }

