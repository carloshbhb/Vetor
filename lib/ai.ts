import { getCachedResponse, setCachedResponse } from '@/lib/agentCache';

let lastRequestTime = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(error: any): number | null {
  if (error && typeof error === 'object') {
    if (typeof error.retryDelay === 'number') return error.retryDelay;
    if (typeof error.retryAfter === 'number') return error.retryAfter * 1000;

    const status = error.status || error.statusCode || error.response?.status;
    if (status === 429) {
      const headers = error.headers || error.response?.headers;
      if (headers) {
        let retryAfterHeader: string | null = null;
        if (typeof headers.get === 'function') {
          retryAfterHeader = headers.get('retry-after');
        } else if (headers['retry-after']) {
          retryAfterHeader = headers['retry-after'];
        }
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed * 1000;
        }
      }
    }
  }
  return null;
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
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B' },
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
    'HTTP-Referer': process.env.SITE_URL || 'https://vetor.blog',
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
