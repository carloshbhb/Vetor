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

  throw new Error('Todos os modelos de IA estão temporariamente indisponíveis.');
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
