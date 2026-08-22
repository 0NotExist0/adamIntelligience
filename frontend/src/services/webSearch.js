import axios from 'axios';

// AI Studio Pro - Multi-Method Web Search & Deep Website Explorer Engine
// Methods implemented:
// 1. Backend Robust DuckDuckGo Lite & Wikipedia Scraper (/api/agent/web-search)
// 2. Client-side Multilingual Wikipedia REST API & Extracts
// 3. DuckDuckGo Instant Answers & Knowledge API
// 4. OpenAlex Academic & Technical Scholarly API
// 5. Deep Web Crawler / Page Scraper (Backend HTML Parser + Jina Reader + Wikipedia Extracts)
// 6. Rich DevTools Console Logging & Debugging

const searchLogsHistory = [];

/**
 * Log structured web search event to browser DevTools Console
 */
const logWebSearchToConsole = ({ query, method, durationMs, results, summary_text }) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    query,
    method,
    durationMs,
    resultsCount: results.length,
    results,
    summary_text
  };

  searchLogsHistory.unshift(logEntry);
  if (searchLogsHistory.length > 50) searchLogsHistory.pop();

  if (typeof window !== 'undefined' && window.console) {
    const headerStyle = 'color: #38bdf8; font-weight: bold; background: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #0284c7;';
    const tagStyle = 'color: #a855f7; font-weight: bold;';
    
    console.groupCollapsed(`%c🌐 [WEB FACT-CHECKING CONSOLE] Query: "${query}" (%c${results.length} fonti • ${durationMs}ms%c)`, headerStyle, tagStyle, headerStyle);
    console.log(`%cMetodo Utilizzato:%c ${method}`, 'font-weight: bold; color: #94a3b8;', 'color: #38bdf8;');
    console.log(`%cTempo Esecuzione:%c ${durationMs}ms`, 'font-weight: bold; color: #94a3b8;', 'color: #4ade80;');
    
    if (results && results.length > 0) {
      console.log('%cTabella Fonti Estratte:', 'font-weight: bold; color: #fbbf24;');
      console.table(
        results.map((r, i) => ({
          '#': i + 1,
          'Titolo': r.title || 'N/D',
          'Fonte': r.source || 'Web',
          'URL': r.url || '',
          'Snippet': (r.snippet || '').slice(0, 100) + '...'
        }))
      );
    } else {
      console.warn('⚠️ Nessun risultato trovato con questo metodo.');
    }

    console.log('%cTesto di Sintesi Iniettato nel Prompt AI:', 'font-weight: bold; color: #c084fc;');
    console.info(summary_text || 'Nessuna informazione aggiuntiva.');
    console.groupEnd();
  }
};

/**
 * Expose helper on window for developer testing in F12 Console
 */
if (typeof window !== 'undefined') {
  window.testWebSearch = async (query = 'pullman torino rivarolo orari') => {
    console.log(`%c[TEST WEB SEARCH] Avvio ricerca per: "${query}"...`, 'color: #38bdf8; font-weight: bold;');
    const res = await multiMethodWebSearch(query);
    console.log('[TEST WEB SEARCH] Risultato completato:', res);
    return res;
  };
  window.testScrapeUrl = async (url = 'https://it.wikipedia.org/wiki/Rivarolo_Canavese') => {
    console.log(`%c[TEST SCRAPER] Lettura URL: "${url}"...`, 'color: #38bdf8; font-weight: bold;');
    const res = await scrapeWebsiteContent(url);
    console.log('[TEST SCRAPER] Risultato completato:', res);
    return res;
  };
  window.getWebFactCheckLogs = () => searchLogsHistory;
}

/**
 * Deep Website Explorer & Scraper Engine
 * Reads and extracts full structured content from any URL
 * Uses Backend HTML Scraper + Jina Reader + Wikipedia Extract + DOM Parser
 */
export const scrapeWebsiteContent = async (url) => {
  if (!url || !url.trim() || !url.startsWith('http')) {
    return { success: false, error: 'URL vuoto o non valido' };
  }

  const cleanUrl = url.trim();
  const startTime = Date.now();
  console.groupCollapsed(`%c🌐 [DEEP WEBSITE EXPLORER] Lettura URL: ${cleanUrl}`, 'color: #38bdf8; font-weight: bold; background: #0c4a6e; padding: 4px 8px; border-radius: 4px;');

  // Method 1: Backend Scraper Endpoint
  try {
    const res = await axios.post('/api/agent/scrape-url', { url: cleanUrl, max_chars: 8000 }, { timeout: 8000 });
    if (res.data && res.data.success && res.data.content && res.data.content.length > 50) {
      const durationMs = Date.now() - startTime;
      console.log(`%cLettura completata tramite Backend Scraper (${durationMs}ms, ${res.data.word_count} parole):`, 'color: #4ade80;');
      console.groupEnd();
      return {
        success: true,
        method: 'Backend Deep HTML Scraper',
        url: cleanUrl,
        title: res.data.title || cleanUrl,
        content: res.data.content,
        wordCount: res.data.word_count || res.data.content.split(/\s+/).length,
        durationMs
      };
    }
  } catch (e) {
    // try fallback
  }

  // Method 2: Jina Reader API (free, returns clean Markdown for any webpage)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await axios.get(jinaUrl, { timeout: 9000 });
    if (res.data && typeof res.data === 'string' && res.data.length > 50) {
      const text = res.data.slice(0, 8000);
      const words = text.split(/\s+/).length;
      const durationMs = Date.now() - startTime;

      console.log(`%cLettura completata tramite Jina Reader (${durationMs}ms, ${words} parole):`, 'color: #4ade80;');
      console.groupEnd();

      return {
        success: true,
        method: 'Jina Deep Web Reader',
        url: cleanUrl,
        title: cleanUrl,
        content: text,
        wordCount: words,
        durationMs
      };
    }
  } catch (err) {
    // try fallback
  }

  // Method 3: Wikipedia API Extract if it's a wikipedia page
  if (cleanUrl.includes('wikipedia.org/wiki/')) {
    try {
      const title = decodeURIComponent(cleanUrl.split('/wiki/')[1]);
      const lang = cleanUrl.includes('it.wikipedia') ? 'it' : 'en';
      const wikiRes = await axios.get(
        `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${title}&format=json&origin=*`,
        { timeout: 5000 }
      );
      const pages = wikiRes.data?.query?.pages || {};
      const page = Object.values(pages)[0];
      if (page && page.extract) {
        const durationMs = Date.now() - startTime;
        console.log(`%cLettura completata tramite Wikipedia API (${durationMs}ms):`, 'color: #4ade80;');
        console.groupEnd();
        return {
          success: true,
          method: 'Wikipedia Direct Article Extract',
          url: cleanUrl,
          title: page.title,
          content: `### ${page.title}\n\n${page.extract}`,
          wordCount: page.extract.split(/\s+/).length,
          durationMs
        };
      }
    } catch (e) {
      // ignore
    }
  }

  console.warn('⚠️ Impossibile leggere il contenuto completo di questo URL.');
  console.groupEnd();
  return {
    success: false,
    url: cleanUrl,
    error: 'Impossibile estrarre il testo dal sito web (sito protetto o non raggiungibile).',
    durationMs: Date.now() - startTime
  };
};

/**
 * Method 1: Backend Scraper (FastAPI / Serverless DuckDuckGo HTML)
 */
async function searchViaBackend(query) {
  const startTime = Date.now();
  try {
    const res = await axios.post('/api/agent/web-search', { query, max_results: 6 }, { timeout: 9000 });
    if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
      const durationMs = Date.now() - startTime;
      return {
        success: true,
        method: 'DuckDuckGo Live Web Engine',
        durationMs,
        results: res.data.results,
        summary_text: res.data.summary_text
      };
    }
  } catch (e) {
    // backend offline or failed
  }
  return { success: false, results: [] };
}

/**
 * Method 2: Wikipedia REST API & Opensearch (Client-side Italian & English)
 */
async function searchViaWikipedia(query) {
  const startTime = Date.now();
  const cleanQ = encodeURIComponent(query.trim());
  const allResults = [];

  for (const lang of ['it', 'en']) {
    try {
      const wikiRes = await axios.get(
        `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${cleanQ}&limit=3&namespace=0&format=json&origin=*`,
        { timeout: 4500 }
      );
      if (wikiRes.data && wikiRes.data[1] && wikiRes.data[1].length > 0) {
        const titles = wikiRes.data[1];
        const snippets = wikiRes.data[2] || [];
        const urls = wikiRes.data[3] || [];
        titles.forEach((t, idx) => {
          if (snippets[idx] && snippets[idx].trim().length > 15) {
            allResults.push({
              title: t,
              snippet: snippets[idx],
              url: urls[idx] || `https://${lang}.wikipedia.org/wiki/${t}`,
              source: `Wikipedia (${lang.toUpperCase()})`
            });
          }
        });
      }
    } catch (e) {
      // continue to next language
    }
  }

  if (allResults.length > 0) {
    const durationMs = Date.now() - startTime;
    const summary_text = `### 🌐 RISULTATI VERIFICATI DA WIKIPEDIA:\n` +
      allResults.map((r, i) => `${i + 1}. **${r.title}**: ${r.snippet} [${r.url}]`).join('\n');
    return {
      success: true,
      method: 'Wikipedia Multilingual REST API',
      durationMs,
      results: allResults,
      summary_text
    };
  }

  return { success: false, results: [] };
}

/**
 * Method 3: DuckDuckGo Instant Answers API
 */
async function searchViaDuckDuckGoInstant(query) {
  const startTime = Date.now();
  const cleanQ = encodeURIComponent(query.trim());
  try {
    const ddgRes = await axios.get(
      `https://api.duckduckgo.com/?q=${cleanQ}&format=json&no_html=1&skip_disambig=1`,
      { timeout: 5000 }
    );
    const data = ddgRes.data;
    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${cleanQ}`,
        source: `DuckDuckGo Instant Answer (${data.AbstractSource || 'Web'})`
      });
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 3).forEach((item) => {
        if (item.Text && item.FirstURL) {
          results.push({
            title: item.Text.split(' - ')[0] || 'Argomento Correlato',
            snippet: item.Text,
            url: item.FirstURL,
            source: 'DuckDuckGo Knowledge'
          });
        }
      });
    }

    if (results.length > 0) {
      const durationMs = Date.now() - startTime;
      const summary_text = `### 🌐 RISULTATI DUCKDUCKGO INSTANT ANSWER:\n` +
        results.map((r, i) => `${i + 1}. **${r.title}**: ${r.snippet} [${r.url}]`).join('\n');
      return {
        success: true,
        method: 'DuckDuckGo Instant Knowledge API',
        durationMs,
        results,
        summary_text
      };
    }
  } catch (e) {
    // ignore
  }

  return { success: false, results: [] };
}

/**
 * Method 4: OpenAlex Scholarly Research API
 */
async function searchViaOpenAlex(query) {
  const startTime = Date.now();
  const cleanQ = encodeURIComponent(query.trim());
  try {
    const alexRes = await axios.get(
      `https://api.openalex.org/works?search=${cleanQ}&per-page=3&mailto=user@ai-studio.local`,
      { timeout: 5000 }
    );
    if (alexRes.data && alexRes.data.results && alexRes.data.results.length > 0) {
      const results = alexRes.data.results.map((w) => ({
        title: w.title || 'Paper Scientifico',
        snippet: `Autori: ${(w.authorships || []).map((a) => a.author?.display_name).slice(0, 3).join(', ')} (${w.publication_year || 'N/D'}). Citazioni: ${w.cited_by_count || 0}. DOI: ${w.doi || 'N/D'}`,
        url: w.doi || w.id || `https://openalex.org/${w.id}`,
        source: 'OpenAlex Scholarly Engine'
      }));

      const durationMs = Date.now() - startTime;
      const summary_text = `### 🔬 PUBBLICAZIONI & FONTI SCIENTIFICHE OPENALEX:\n` +
        results.map((r, i) => `${i + 1}. **${r.title}**: ${r.snippet} [${r.url}]`).join('\n');
      return {
        success: true,
        method: 'OpenAlex Scholarly API',
        durationMs,
        results,
        summary_text
      };
    }
  } catch (e) {
    // ignore
  }

  return { success: false, results: [] };
}

/**
 * Multi-Method Hybrid Orchestrator with Auto Deep Website Exploration
 */
export const multiMethodWebSearch = async (query) => {
  if (!query || !query.trim()) {
    return { query: '', results: [], summary_text: '', method: 'None', durationMs: 0 };
  }

  // Normalize query and clean common typos
  let cleanQuery = query.trim()
    .replace(/\bpulman\b/gi, 'pullman')
    .replace(/\brivrolo\b/gi, 'rivarolo')
    .replace(/\b(cerca su internet|cerca sul web|cerca|trova|dimmi|spiegami)\b/gi, '')
    .trim();

  if (!cleanQuery) cleanQuery = query.trim();

  const overallStart = Date.now();

  // Try Method 1: Backend Live Search Engine (DuckDuckGo HTML + Wikipedia)
  const backendAttempt = await searchViaBackend(cleanQuery);
  let baseResults = [];
  let usedMethod = '';

  if (backendAttempt.success && backendAttempt.results.length > 0) {
    baseResults = backendAttempt.results;
    usedMethod = backendAttempt.method;
  } else {
    // Fallback: Client-side Wikipedia + DDG Instant + OpenAlex
    const [wikiAttempt, ddgAttempt, openAlexAttempt] = await Promise.all([
      searchViaWikipedia(cleanQuery),
      searchViaDuckDuckGoInstant(cleanQuery),
      searchViaOpenAlex(cleanQuery)
    ]);

    const seenUrls = new Set();
    let clientMethods = [];

    for (const attempt of [wikiAttempt, ddgAttempt, openAlexAttempt]) {
      if (attempt.success && attempt.results.length > 0) {
        clientMethods.push(attempt.method);
        for (const r of attempt.results) {
          if (r.url && !seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            baseResults.push(r);
          }
        }
      }
    }
    usedMethod = clientMethods.join(' + ') || 'Web Search Client';
  }

  if (baseResults.length > 0) {
    // AUTO DEEP EXPLORATION: Scrape the top 1-2 most relevant pages to get full details!
    let deepSections = [];
    const topUrlsToScrape = baseResults
      .filter((r) => r.url && (r.url.startsWith('http://') || r.url.startsWith('https://')) && !r.url.endsWith('.pdf'))
      .slice(0, 2);

    if (topUrlsToScrape.length > 0) {
      try {
        const scrapePromises = topUrlsToScrape.map((item) => scrapeWebsiteContent(item.url));
        const scrapedDocs = await Promise.all(scrapePromises);
        scrapedDocs.forEach((doc, idx) => {
          if (doc && doc.success && doc.content && doc.content.length > 80) {
            const shortContent = doc.content.slice(0, 3000);
            deepSections.push(`### 📄 DETTAGLI ESTRATTI DALLA PAGINA (${topUrlsToScrape[idx].title} - ${doc.url}):\n${shortContent}`);
          }
        });
      } catch (e) {
        // ignore scrape errors
      }
    }

    let summary_text = `### 🌐 RISULTATI VERIFICATI DAL WEB (${usedMethod}):\n` +
      baseResults.slice(0, 6).map((r, i) => `${i + 1}. [${r.source || 'Web'}] **${r.title}**: ${r.snippet} (${r.url})`).join('\n');

    if (deepSections.length > 0) {
      summary_text += `\n\n=============================================================================\n` +
        `🔎 CONTENUTI INTEGRALI ESTRATTI PER FACT-CHECKING:\n` +
        deepSections.join('\n\n');
    }

    const durationMs = Date.now() - overallStart;

    logWebSearchToConsole({
      query: cleanQuery,
      method: usedMethod + (deepSections.length > 0 ? ' + Deep Page Crawler' : ''),
      durationMs,
      results: baseResults.slice(0, 6),
      summary_text
    });

    return {
      query: cleanQuery,
      success: true,
      method: usedMethod + (deepSections.length > 0 ? ' + Deep Page Crawler' : ''),
      durationMs,
      results: baseResults.slice(0, 6),
      results_count: baseResults.length,
      summary_text
    };
  }

  // Fallback: No results found
  const durationMs = Date.now() - overallStart;
  const emptySummary = `Ricerca Web per "${cleanQuery}": Nessun risultato trovato tramite i motori disponibili.`;
  logWebSearchToConsole({
    query: cleanQuery,
    method: 'Tutti i Metodi (Nessun Risultato)',
    durationMs,
    results: [],
    summary_text: emptySummary
  });

  return {
    query: cleanQuery,
    success: false,
    method: 'Nessun Risultato',
    durationMs,
    results: [],
    results_count: 0,
    summary_text: emptySummary
  };
};

export const getSearchLogsHistory = () => searchLogsHistory;
