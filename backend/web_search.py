import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

class WebSearchEngine:
    """
    Motore di ricerca Web leggero e asincrono senza dipendenze a pagamento.
    Interroga DuckDuckGo e Wikipedia per reperire fonti e informazioni aggiornate.
    """
    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    async def search_duckduckgo_lite(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """Esegue una ricerca web tramite DuckDuckGo Lite / HTML."""
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://html.duckduckgo.com/"
        }
        data = {"q": query, "b": ""}
        results = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.post(url, headers=headers, data=data)
                if resp.status_code == 200:
                    html = resp.text
                    blocks = re.findall(
                        r'<div class="result results_links results_links_deep web-result ">([\s\S]*?)</div>\s*</div>',
                        html
                    )
                    
                    for block in blocks[:max_results]:
                        # Snippet
                        snippet_match = re.search(r'<a class="result__snippet"[^>]*>([\s\S]*?)</a>', block)
                        if not snippet_match:
                            snippet_match = re.search(r'<div class="result__snippet">([\s\S]*?)</div>', block)
                        
                        raw_url = ""
                        title = ""
                        snippet = ""
                        
                        # Extract title from title class
                        t_m = re.search(r'<h2 class="result__title">[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>', block)
                        if t_m:
                            raw_url = t_m.group(1)
                            title = re.sub(r'<[^>]+>', '', t_m.group(2)).strip()
                        
                        if snippet_match:
                            snippet = re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip()

                        # Decode duckduckgo redirect url if present
                        if "uddg=" in raw_url:
                            m = re.search(r'uddg=([^&]+)', raw_url)
                            if m:
                                raw_url = urllib.parse.unquote(m.group(1))

                        if title and (snippet or raw_url):
                            results.append({
                                "title": title,
                                "snippet": snippet,
                                "url": raw_url,
                                "source": "DuckDuckGo Web"
                            })

        except Exception:
            pass

        return results

    async def search_wikipedia(self, query: str, max_results: int = 2) -> List[Dict[str, str]]:
        """Esegue una ricerca enciclopedica su Wikipedia API (in italiano o inglese)."""
        results = []
        clean_q = urllib.parse.quote(query)
        
        for lang in ["it", "en"]:
            url = f"https://{lang}.wikipedia.org/w/api.php?action=opensearch&search={clean_q}&limit={max_results}&namespace=0&format=json"
            headers = {"User-Agent": USER_AGENT}
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        # format: [query, [titles], [descriptions], [urls]]
                        if len(data) >= 4 and len(data[1]) > 0:
                            titles = data[1]
                            snippets = data[2]
                            urls = data[3]
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

    async def search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Esegue ricerca aggregata (DuckDuckGo + Wikipedia) e restituisce un compendio pronto per il prompt.
        """
        if not query or not query.strip():
            return {"query": query, "results": [], "summary_text": "Nessuna ricerca richiesta."}

        clean_query = query.strip()
        ddg_results = await self.search_duckduckgo_lite(clean_query, max_results=max_results)
        wiki_results = await self.search_wikipedia(clean_query, max_results=2)

        # Merge and deduplicate
        all_results = []
        seen_urls = set()

        for item in ddg_results + wiki_results:
            url = item.get("url", "")
            if url and url in seen_urls:
                continue
            seen_urls.add(url)
            all_results.append(item)

        # Build clean summary text for LLM injection
        if not all_results:
            summary_text = f"Ricerca Web per '{clean_query}': Nessun risultato testuale rilevante reperito in tempo reale."
        else:
            lines = [f"### 🌐 RISULTATI VERIFICATI DAL WEB (Query: '{clean_query}'):"]
            for idx, r in enumerate(all_results[:max_results], 1):
                lines.append(f"{idx}. **{r['title']}** [{r.get('source', 'Web')}]")
                if r.get('snippet'):
                    lines.append(f"   *Estratto*: {r['snippet']}")
                if r.get('url'):
                    lines.append(f"   *Link Fonte*: {r['url']}")
            summary_text = "\n".join(lines)

        return {
            "query": clean_query,
            "results_count": len(all_results),
            "results": all_results[:max_results],
            "summary_text": summary_text
        }
