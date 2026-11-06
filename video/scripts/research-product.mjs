// Research module for the Meli list video pipeline.
// Queries Google SERP (via Gemini grounding) and YouTube (Data API v3) to
// build a research brief for a product. Result is cached in reviews.research.
import { pathToFileURL } from 'node:url';

const GEMINI_MODEL = process.env.GEMINI_RESEARCH_MODEL || 'gemini-2.5-flash';
const SERP_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

function getEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function safeJson(res, fallback) {
  if (!res) return fallback;
  if (typeof res.json === 'function') {
    return res.json();
  }
  return Promise.resolve(res);
}

function extractSerpText(serp) {
  const candidate = Array.isArray(serp?.candidates) ? serp.candidates[0] : null;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('\n').trim();
}

function extractYouTubeItems(youtube) {
  return Array.isArray(youtube?.items) ? youtube.items : [];
}

function buildBrief(title, category, serp, youtube) {
  const serpText = extractSerpText(serp);
  const items = extractYouTubeItems(youtube);
  const lines = [];
  lines.push(`Research brief: ${title} (${category})`);
  lines.push('');
  lines.push('Top SERP angles:');
  lines.push(serpText || '(no SERP findings)');
  lines.push('');
  lines.push('YouTube top videos:');
  if (items.length) {
    for (const item of items) {
      const snippet = item?.snippet || {};
      const videoTitle = String(snippet.title || '').trim();
      const channel = String(snippet.channelTitle || '').trim();
      const description = String(snippet.description || '').trim().replace(/\s+/g, ' ').slice(0, 160);
      lines.push(`- ${videoTitle}${channel ? ` (${channel})` : ''}${description ? ` — ${description}` : ''}`);
    }
  } else {
    lines.push('(no YouTube results)');
  }
  lines.push('');
  lines.push('Gaps: identify angles not covered by the top SERP/YouTube results above; differentiate with original comparisons, pros/cons, and buyer-focused guidance.');
  return lines.join('\n');
}

async function fetchSerp(title, category, apiKey) {
  const prompt = `Pesquise no Google (em português do Brasil) sobre "${title}" na categoria "${category}". Resuma os principais ângulos de review/compra, pontos fortes e fracos mais citados, comparações com concorrentes e lacunas de informação.`;
  const url = `${SERP_URL_BASE}${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (response && response.ok === false) {
    throw new Error(`Gemini SERP HTTP ${response.status}`);
  }
  const data = await safeJson(response, null);
  return data;
}

async function fetchYouTube(title, category, apiKey) {
  const query = `${title} ${category} review`.trim();
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '5',
    key: apiKey,
  });
  const url = `${YT_SEARCH_URL}?${params.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (response && response.ok === false) {
    throw new Error(`YouTube search HTTP ${response.status}`);
  }
  const data = await safeJson(response, null);
  return data;
}

export async function researchProduct({ title, category } = {}) {
  const productTitle = String(title || '').trim();
  const productCategory = String(category || '').trim();
  const googleKey = getEnv('GOOGLE_AI_API_KEY');
  const youtubeKey = getEnv('YOUTUBE_DATA_API_KEY');

  let serp = null;
  let youtube = null;

  const tasks = [];
  if (googleKey) {
    tasks.push(
      fetchSerp(productTitle, productCategory, googleKey)
        .then((data) => { serp = data; })
        .catch((err) => { serp = { error: String(err?.message || err) }; })
    );
  }
  if (youtubeKey) {
    tasks.push(
      fetchYouTube(productTitle, productCategory, youtubeKey)
        .then((data) => { youtube = data; })
        .catch((err) => { youtube = { error: String(err?.message || err) }; })
    );
  }
  await Promise.all(tasks);

  const brief = buildBrief(productTitle, productCategory, serp, youtube);
  return {
    serp,
    youtube,
    brief,
    fetched_at: new Date().toISOString(),
  };
}

export default researchProduct;

// CLI entry point
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }
  try {
    const parsed = inputData.trim() ? JSON.parse(inputData) : {};
    const result = await researchProduct(parsed);
    console.log(JSON.stringify(result));
  } catch (err) {
    console.error(`[research-product] Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
