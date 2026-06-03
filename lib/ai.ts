import { getCachedResponse, setCachedResponse } from '@/lib/agentCache';

let lastRequestTime = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceConcurrencyDelay(minDelayMs = 2000) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < minDelayMs) {
    const waitTime = minDelayMs - timeSinceLast;
    await sleep(waitTime);
  }
  lastRequestTime = Date.now();
}

interface OpenRouterModel {
  id: string;
  name: string;
}

const FREE_MODELS: OpenRouterModel[] = [
  { id: 'deepseek/deepseek-v4-flash:free', name: 'DeepSeek V4 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B' },
  { id: 'openrouter/free', name: 'OpenRouter Auto' },
];

async function callOpenRouter(
  prompt: string,
  model: string,
  responseJson: boolean,
  temperature: number,
  maxOutputTokens: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.SITE_URL || 'https://www.vetor.blog',
    'X-Title': 'Vetor Blog',
  };

  const messages = [{ role: 'user', content: prompt }];
  if (responseJson && !prompt.toLowerCase().includes('json')) {
    messages[0].content += '\n\nResponse must be a valid JSON object.';
  }

  const requestBody: Record<string, any> = {
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  };

  if (responseJson) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`OpenRouter ${model} failed (${response.status}): ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenRouter ${model} returned empty content`);
  }

  return content;
}

async function callOpenRouterCascade(
  prompt: string,
  responseJson: boolean,
  temperature: number,
  maxOutputTokens: number,
  models: OpenRouterModel[] = FREE_MODELS
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }

  let lastError: Error | null = null;

  for (const m of models) {
    try {
      console.log(`[AI OpenRouter] Trying ${m.name} (${m.id})...`);
      const result = await callOpenRouter(prompt, m.id, responseJson, temperature, maxOutputTokens);
      console.log(`[AI OpenRouter] ${m.name} succeeded.`);
      return result;
    } catch (err: any) {
      lastError = err;
      const is429 = err.status === 429 || err.message?.includes('429');
      if (is429) {
        console.warn(`[AI OpenRouter] ${m.name} rate-limited (429). Trying next model...`);
        continue;
      }
      console.warn(`[AI OpenRouter] ${m.name} failed: ${err.message}. Trying next model...`);
      continue;
    }
  }

  throw new Error(`All OpenRouter free models failed. Last error: ${lastError?.message}`);
}

interface GenerateTextOptions {
  prompt: string;
  responseJson?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  useSearchGrounding?: boolean;
  minConcurrencyDelayMs?: number;
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const cached = getCachedResponse(options.prompt);
  if (cached) {
    console.log('[AI Cache] Returning cached response');
    return cached;
  }

  const {
    prompt,
    responseJson = false,
    temperature = 0.7,
    maxOutputTokens = 8192,
    minConcurrencyDelayMs = 2000,
  } = options;

  await enforceConcurrencyDelay(minConcurrencyDelayMs);

  // Try Gemini first only if GEMINI_API_KEY is set
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      console.log('[AI Client] Requesting Gemini (gemini-2.0-flash)...');
      const generationConfig: Record<string, any> = { temperature };
      if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens;
      if (responseJson) generationConfig.responseMimeType = 'application/json';

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const responseText = result.response.text();
      if (responseText) {
        setCachedResponse(options.prompt, responseText);
        return responseText;
      }
    } catch (error: any) {
      console.warn('[AI Client] Gemini failed, falling back to OpenRouter:', error.message);
    }
  }

  // Primary: OpenRouter free models cascade
  console.log('[AI Client] Using OpenRouter free models cascade...');
  try {
    const result = await callOpenRouterCascade(prompt, responseJson, temperature, maxOutputTokens);
    setCachedResponse(options.prompt, result);
    return result;
  } catch (fallbackError: any) {
    console.error('[AI Client] All providers failed.', fallbackError);
    throw new Error(`AI generation failed: ${fallbackError.message}`);
  }
}

/**
 * Generate text with a specific OpenRouter model (no cascade).
 * Used by the autonomous agent to generate different sections with different models.
 */
export async function generateTextWithModel(
  prompt: string,
  modelId: string,
  options: { responseJson?: boolean; temperature?: number; maxOutputTokens?: number } = {}
): Promise<string> {
  const { responseJson = false, temperature = 0.7, maxOutputTokens = 4096 } = options;
  await enforceConcurrencyDelay(1500);

  const cached = getCachedResponse(prompt);
  if (cached) {
    console.log(`[AI Cache] Returning cached response for model ${modelId}`);
    return cached;
  }

  console.log(`[AI Client] Generating with specific model: ${modelId}`);
  try {
    const result = await callOpenRouter(prompt, modelId, responseJson, temperature, maxOutputTokens);
    setCachedResponse(prompt, result);
    return result;
  } catch (err: any) {
    // If specific model fails, try cascade as fallback
    console.warn(`[AI Client] Model ${modelId} failed: ${err.message}. Trying cascade...`);
    const result = await callOpenRouterCascade(prompt, responseJson, temperature, maxOutputTokens);
    setCachedResponse(prompt, result);
    return result;
  }
}

/**
 * Returns the list of available free models for rotating across section calls.
 */
export function getFreeModels(): OpenRouterModel[] {
  return [...FREE_MODELS];
}
