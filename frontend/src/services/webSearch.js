import axios from 'axios';

// AI Studio Pro - Multi-Method Web Search & Fact-Checking Engine
// Methods implemented:
// 1. Backend Search Engine (DuckDuckGo Lite & Wikipedia scraper)
// 2. Client-side Multilingual Wikipedia REST API
// 3. DuckDuckGo Instant Answers API
// 4. OpenAlex Academic & Technical Scholarly API
// 5. Rich DevTools Console Logging & Debugging

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
  window.testWebSearch = async (query = 'ultime notizie AI 2026') => {
    console.log(`%c[TEST WEB SEARCH] Avvio ricerca per: "${query}"...`, 'color: #38bdf8; font-weight: bold;');
    const res = await multiMethodWebSearch(query);
    console.log('[TEST WEB SEARCH] Risultato completato:', res);
    return res;
  };
  window.getWebFactCheckLogs = () => searchLogsHistory;
}

/**
 * Method 1: Backend Scraper (FastAPI / Serverless)
 */
async function searchViaBackend(query) {
  const startTime = Date.now();
  try {
    const res = await axios.post('/api/agent/web-search', { query, max_results: 4 }, { timeout: 7000 });
    if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
      const durationMs = Date.now() - startTime;
      return {
        success: true,
        method: 'Backend Hybrid (DuckDuckGo + Wikipedia)',
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
 * Method 4: OpenAlex Scholarly Research API (for scientific, technical, and academic terms)
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
 * Multi-Method Hybrid Orchestrator
 * Tests all available methods in cascade or combines results for maximum accuracy
 */
export const multiMethodWebSearch = async (query) => {
  if (!query || !query.trim()) {
    return { query: '', results: [], summary_text: '', method: 'None', durationMs: 0 };
  }

  const cleanQuery = query.trim();
  const overallStart = Date.now();

  // Try Method 1: Backend Hybrid Scraper
  const backendAttempt = await searchViaBackend(cleanQuery);
  if (backendAttempt.success && backendAttempt.results.length > 0) {
    logWebSearchToConsole({
      query: cleanQuery,
      method: backendAttempt.method,
      durationMs: backendAttempt.durationMs,
      results: backendAttempt.results,
      summary_text: backendAttempt.summary_text
    });
    return {
      query: cleanQuery,
      ...backendAttempt
    };
  }

  // Try Method 2 & Method 3 & Method 4 in parallel on client
  const [wikiAttempt, ddgAttempt, openAlexAttempt] = await Promise.all([
    searchViaWikipedia(cleanQuery),
    searchViaDuckDuckGoInstant(cleanQuery),
    searchViaOpenAlex(cleanQuery)
  ]);

  const combinedResults = [];
  const seenUrls = new Set();
  let usedMethods = [];

  for (const attempt of [wikiAttempt, ddgAttempt, openAlexAttempt]) {
    if (attempt.success && attempt.results.length > 0) {
      usedMethods.push(attempt.method);
      for (const r of attempt.results) {
        if (r.url && !seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          combinedResults.push(r);
        }
      }
    }
  }

  const durationMs = Date.now() - overallStart;

  if (combinedResults.length > 0) {
    const summary_text = `### 🌐 RISULTATI VERIFICATI MULTI-FONTE (${usedMethods.join(' + ')}):\n` +
      combinedResults.slice(0, 5).map((r, i) => `${i + 1}. [${r.source}] **${r.title}**: ${r.snippet} (${r.url})`).join('\n');

    logWebSearchToConsole({
      query: cleanQuery,
      method: usedMethods.join(' + '),
      durationMs,
      results: combinedResults.slice(0, 5),
      summary_text
    });

    return {
      query: cleanQuery,
      success: true,
      method: usedMethods.join(' + '),
      durationMs,
      results: combinedResults.slice(0, 5),
      results_count: combinedResults.length,
      summary_text
    };
  }

  // Fallback: No results found across all methods
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
