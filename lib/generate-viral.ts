import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildViralPrompt, type ViralArticleInput } from '@/lib/prompt-viral';

export interface ViralArticleResult {
  data: any;
  provider: string;
}

async function callOpenRouterModel(
  prompt: string,
  modelId: string,
  modelName: string,
  temperature: number = 0.7,
  maxTokens: number = 8192
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  console.log(`[ViralArticle] Calling ${modelName} (${modelId})...`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.SITE_URL || 'https://www.vetor.blog',
      'X-Title': 'Vetor Blog',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${modelName} failed (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenRouter ${modelName} returned empty`);
  return content;
}

async function generateWithOpenRouter(prompt: string): Promise<{ data: any; provider: string }> {
  const models = [
    { id: 'xiaomi/mimo-v2.5', name: 'MiMo V2.5' },
    { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
  ];

  for (const m of models) {
    try {
      const text = await callOpenRouterModel(prompt, m.id, m.name, 0.7, 8192);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[ViralArticle] ${m.name} generation succeeded`);
      return { data: parsed, provider: m.name };
    } catch (err: any) {
      console.warn(`[ViralArticle] ${m.name} failed:`, err.message);
      continue;
    }
  }

  // Modelos fixos esgotados (ex.: removidos do tier free) → tenta Groq
  try {
    return await generateWithGroq(prompt);
  } catch (err: any) {
    console.warn('[ViralArticle] Groq fallback failed:', err.message);
  }

  // Último recurso: descobre dinamicamente os modelos :free atuais e tenta em rodízio
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    const dynamic = await getOpenRouterFreeModels(apiKey);
    for (const modelId of dynamic) {
      if (models.some((m) => m.id === modelId)) continue; // já tentados acima
      try {
        const text = await callOpenRouterModel(prompt, modelId, modelId, 0.7, 8192);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[ViralArticle] ${modelId} generation succeeded (dynamic)`);
        return { data: parsed, provider: modelId };
      } catch (err: any) {
        console.warn(`[ViralArticle] ${modelId} failed:`, String(err.message || err).slice(0, 120));
        continue;
      }
    }
  }

  throw new Error('Todos os modelos de IA estão temporariamente indisponíveis.');
}

// Groq (tier free generoso) — mesmo padrão do lib/video-script.ts
async function generateWithGroq(prompt: string): Promise<{ data: any; provider: string }> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || groqKey === 'your-groq-api-key') throw new Error('GROQ_API_KEY not set');
  const groqModels = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini', 'allam-2-7b'];
  for (const gModel of groqModels) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: gModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        console.warn(`[ViralArticle] Groq ${gModel}: ${res.status}`);
        continue;
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[ViralArticle] Groq ${gModel} generation succeeded`);
      return { data: parsed, provider: `Groq ${gModel}` };
    } catch (e: any) {
      console.warn(`[ViralArticle] Groq ${gModel} failed:`, String(e.message || e).slice(0, 120));
    }
  }
  throw new Error('Groq falhou em todos os modelos');
}

// Cache em memória da lista de modelos free (1h)
let cachedFreeModels: { list: string[]; at: number } | null = null;
const FALLBACK_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
];

async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedFreeModels && now - cachedFreeModels.at < 3600_000) return cachedFreeModels.list;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`models: ${res.status}`);
    const json = (await res.json()) as any;
    const all = Array.isArray(json?.data) ? json.data : [];
    const free = all
      .filter((m: any) => typeof m?.id === 'string' && m.id.endsWith(':free'))
      .filter((m: any) => String(m?.architecture?.modality || '').includes('text->text'))
      .map((m: any) => m.id as string);
    if (!free.length) throw new Error('nenhum modelo :free texto');
    const day = Math.floor(now / 86400000);
    const rotated = [...free.slice(day % free.length), ...free.slice(0, day % free.length)];
    cachedFreeModels = { list: rotated.slice(0, 12), at: now };
    console.log(`[ViralArticle] ${free.length} modelos :free encontrados, tentando até 12`);
    return cachedFreeModels.list;
  } catch (e: any) {
    console.warn('[ViralArticle] Falha ao listar modelos OpenRouter, usando lista fixa:', e.message);
    return FALLBACK_FREE_MODELS;
  }
}

export async function generateViralArticle(input: ViralArticleInput): Promise<ViralArticleResult> {
  const prompt = buildViralPrompt(input);

  let articleJson: any;
  let provider = 'Gemini';

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log('[ViralArticle] Gemini generating article...');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });

      const responseText = result.response.text();
      if (!responseText) throw new Error('Empty Gemini response');

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse JSON from Gemini');

      articleJson = JSON.parse(jsonMatch[0]);
      console.log('[ViralArticle] Gemini generation succeeded');
    } catch (geminiErr: any) {
      console.warn('[ViralArticle] Gemini failed:', geminiErr.message);
      console.log('[ViralArticle] Falling back to OpenRouter...');
      const fallback = await generateWithOpenRouter(prompt);
      articleJson = fallback.data;
      provider = fallback.provider;
    }
  } else {
    console.log('[ViralArticle] No GEMINI_API_KEY, using OpenRouter directly...');
    const fallback = await generateWithOpenRouter(prompt);
    articleJson = fallback.data;
    provider = fallback.provider;
  }

  return { data: articleJson, provider };
}
