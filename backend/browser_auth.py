import asyncio
import json
import os
import re
from typing import Optional, Dict, Any
import httpx

SESSION_FILE = os.path.join(os.path.dirname(__file__), "session.json")

class BrowserAuthManager:
    def __init__(self):
        self.is_logging_in = False
        self.current_status = "idle"
        self.error_message = None

    async def login_with_email_password(self, username_or_email: str, password: str) -> Dict[str, Any]:
        """
        Authenticates directly to Hugging Face using email/username and password in headless mode.
        Captures the session token and fetches the user profile.
        """
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return {
                "success": False,
                "error": "Playwright non è installato."
            }

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
                )
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                )
                page = await context.new_page()

                await page.goto("https://huggingface.co/login", wait_until="domcontentloaded", timeout=30000)

                # Wait for form inputs
                await page.wait_for_selector('input[name="username"]', timeout=15000)
                await page.fill('input[name="username"]', username_or_email.strip())
                await page.fill('input[name="password"]', password)

                # Click Login submit
                await page.click('button[type="submit"]')

                # Wait for cookies or navigation or error message
                auth_cookie = None
                user_info = None

                for _ in range(20):
                    await asyncio.sleep(0.7)
                    cookies = await context.cookies("https://huggingface.co")
                    cookie_dict = {c["name"]: c["value"] for c in cookies}

                    hf_token = cookie_dict.get("token") or cookie_dict.get("hf_token")
                    if hf_token:
                        auth_cookie = hf_token
                        break

                    # Check if error message displayed on page
                    try:
                        content = await page.content()
                        if "Invalid username or password" in content or "Invalid credentials" in content:
                            await browser.close()
                            return {"success": False, "error": "Username, email o password non corretti."}
                        if "Two-factor authentication" in content:
                            await browser.close()
                            return {"success": False, "error": "L'account ha il 2FA attivo. Usa il tuo Access Token Hugging Face per accedere."}
                    except Exception:
                        pass

                await browser.close()

                if auth_cookie:
                    # Validate with whoami
                    async with httpx.AsyncClient() as client:
                        headers = {
                            "Cookie": f"token={auth_cookie}",
                            "User-Agent": "HF-Modern-Dashboard/1.0"
                        }
                        resp = await client.get("https://huggingface.co/api/whoami-v2", headers=headers)
                        if resp.status_code == 200:
                            user_info = resp.json()
                            session_data = {
                                "auth_type": "credentials",
                                "cookie": auth_cookie,
                                "token": auth_cookie,
                                "user": user_info
                            }
                            save_session(session_data)
                            return {"success": True, "user": user_info, "cookie": auth_cookie}

                return {"success": False, "error": "Accesso non riuscito. Controlla le credenziali o usa il Token API."}

        except Exception as e:
            return {"success": False, "error": f"Errore durante l'accesso: {str(e)}"}

    async def launch_browser_login(self, timeout_seconds: int = 180) -> Dict[str, Any]:
        """
        Launches an interactive Chromium browser window on the host desktop.
        """
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return {
                "success": False,
                "error": "Playwright non è installato."
            }

        self.is_logging_in = True
        self.current_status = "opening_browser"
        self.error_message = None

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=False,
                    args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
                )
                context = await browser.new_context(
                    viewport=None,
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )
                page = await context.new_page()
                
                self.current_status = "waiting_for_user_login"
                await page.goto("https://huggingface.co/login", wait_until="domcontentloaded")

                start_time = asyncio.get_event_loop().time()
                auth_cookie = None
                user_info = None

                while (asyncio.get_event_loop().time() - start_time) < timeout_seconds:
                    cookies = await context.cookies("https://huggingface.co")
                    cookie_dict = {c["name"]: c["value"] for c in cookies}
                    
                    hf_token_cookie = cookie_dict.get("token") or cookie_dict.get("hf_token")
                    
                    if hf_token_cookie:
                        async with httpx.AsyncClient() as client:
                            headers = {
                                "Cookie": f"token={hf_token_cookie}",
                                "User-Agent": "HF-Modern-Dashboard/1.0"
                            }
                            resp = await client.get("https://huggingface.co/api/whoami-v2", headers=headers)
                            if resp.status_code == 200:
                                user_info = resp.json()
                                auth_cookie = hf_token_cookie
                                break

                    await asyncio.sleep(1.5)

                await browser.close()

                if auth_cookie and user_info:
                    session_data = {
                        "auth_type": "cookie_browser",
                        "cookie": auth_cookie,
                        "token": auth_cookie,
                        "user": user_info
                    }
                    save_session(session_data)
                    self.current_status = "success"
                    return {"success": True, "user": user_info, "cookie": auth_cookie}
                else:
                    self.current_status = "failed"
                    return {"success": False, "error": "Login non completato o finestra chiusa."}

        except Exception as e:
            self.current_status = "error"
            self.error_message = str(e)
            return {"success": False, "error": f"Errore browser: {str(e)}"}
        finally:
            self.is_logging_in = False


def save_session(data: Dict[str, Any]):
    try:
        with open(SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Errore nel salvataggio sessione: {e}")

def load_session() -> Optional[Dict[str, Any]]:
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def clear_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception:
            pass
