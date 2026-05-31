import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedResponse, setCachedResponse } from '@/lib/agentCache';

let lastRequestTime = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks for a retry-after or retryDelay value in the error metadata or headers
 */
function getRetryDelay(error: any): number | null {
  if (error && typeof error === 'object') {
    // 1. Check custom properties
    if (typeof error.retryDelay === 'number') {
      return error.retryDelay;
    }
    if (typeof error.retryAfter === 'number') {
      return error.retryAfter * 1000;
    }
    
    // 2. Check HTTP status and headers if available
    const status = error.status || error.statusCode || error.response?.status;
    if (status === 429) {
      const headers = error.headers || error.response?.headers;
      if (headers) {
        // Headers might be a Headers object or a plain object
        let retryAfterHeader: string | null = null;
        if (typeof headers.get === 'function') {
          retryAfterHeader = headers.get('retry-after');
        } else if (headers['retry-after']) {
          retryAfterHeader = headers['retry-after'];
        }
        
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed * 1000; // retry-after is usually in seconds
          }
        }
      }
    }
  }
  return null;
}

/**
 * Enforces a minimum delay between sequential requests to protect rate limits (RPM)
 */
async function enforceConcurrencyDelay(minDelayMs = 3000) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < minDelayMs) {
    const waitTime = minDelayMs - timeSinceLast;
    console.log(`[AI Rate Limiter] Enforcing concurrency delay of ${waitTime}ms to respect RPM`);
    await sleep(waitTime);
  }
  lastRequestTime = Date.now();
}

/**
 * Contingency fallback request using OpenAI, OpenRouter, or Groq
 */
async function callOpenAIFallback(
  prompt: string,
  responseJson = false,
  temperature = 0.7,
  maxOutputTokens = 8192
): Promise<string> {
  const openAIKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  let apiKey = openAIKey || openRouterKey || groqKey;
  let apiUrl = '';
  let model = 'gpt-4o-mini';

  if (openRouterKey) {
    apiKey = openRouterKey;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    model = 'anthropic/claude-3-haiku';
  } else if (groqKey) {
    apiKey = groqKey;
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    model = 'llama-3.3-70b-versatile';
  } else if (openAIKey) {
    apiUrl = 'https://api.openai.com/v1/chat/completions';
    model = 'gpt-4o-mini';
  }
  
  // Developer override options
  if (process.env.FALLBACK_API_KEY) apiKey = process.env.FALLBACK_API_KEY;
  if (process.env.FALLBACK_API_URL) apiUrl = process.env.FALLBACK_API_URL;
  if (process.env.FALLBACK_MODEL) model = process.env.FALLBACK_MODEL;
  
  if (!apiKey) {
    throw new Error('Fallback API key (OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, or FALLBACK_API_KEY) is not set.');
  }
  
  console.log(`[AI Fallback] Initiating fallback request to ${model} at ${apiUrl}`);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  if (openRouterKey || apiUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = process.env.SITE_URL || 'https://vetor.blog';
    headers['X-Title'] = 'Vetor Blog';
  }
  
  const messages = [{ role: 'user', content: prompt }];
  if (responseJson && !prompt.toLowerCase().includes('json')) {
    messages[0].content += '\n\nResponse must be a valid JSON object.';
  }
  
  const requestBody: any = {
    model: model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  };
  
  if (responseJson) {
    requestBody.response_format = { type: 'json_object' };
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallback API call failed (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Fallback API returned empty choices content');
  }
  
  return content;
}

interface GenerateTextOptions {
  prompt: string;
  responseJson?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  useSearchGrounding?: boolean;
  minConcurrencyDelayMs?: number;
}

/**
 * High-resiliency wrapper for text generation. 
 * Features: Rate limiter protection, 429 Retry logic (Exponential Backoff with Jitter), and Automatic Provider Fallback.
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  // Check cache first
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
    useSearchGrounding = false,
    minConcurrencyDelayMs = 3000,
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AI Client] GEMINI_API_KEY is not defined. Bypassing Gemini and triggering fallback.');
    return callOpenAIFallback(prompt, responseJson, temperature, maxOutputTokens);
  }

  // 1. Concurrency limit to prevent overwhelming Free Tier RPM
  await enforceConcurrencyDelay(minConcurrencyDelayMs);

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = 'gemini-2.0-flash';
  
  const modelConfig: any = { model: modelName };
  if (useSearchGrounding) {
    modelConfig.tools = [{ googleSearchRetrieval: {} }];
  }
  
  const model = genAI.getGenerativeModel(modelConfig);
  const maxAttempts = 5;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AI Client] Requesting Gemini (${modelName})${useSearchGrounding ? ' with Google Search Grounding' : ''}. Attempt ${attempt}/${maxAttempts}`);
      
      const generationConfig: any = {
        temperature,
      };
      
      if (maxOutputTokens) {
        generationConfig.maxOutputTokens = maxOutputTokens;
      }
      
      if (responseJson) {
        generationConfig.responseMimeType = 'application/json';
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error('Gemini API returned an empty response text.');
      }

        // Cache successful Gemini response
        setCachedResponse(options.prompt, responseText);
        return responseText;
    } catch (error: any) {
      lastError = error;
      
      // Determine if error is 429 (Rate Limit)
      const is429 = error.status === 429 || 
                    error.statusCode === 429 ||
                    error.response?.status === 429 ||
                    error.message?.includes('429') || 
                    error.message?.includes('RESOURCE_EXHAUSTED');

      if (!is429 || attempt === maxAttempts) {
        console.error(`[AI Client] Non-429 error or maximum retry attempts reached on attempt ${attempt}:`, error);
        break;
      }

      // 429 handling: backoff
      let delay = getRetryDelay(error);
      if (delay === null) {
        // Fallback delay calculation: 2s, 4s, 8s, 16s... + jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = (Math.random() - 0.5) * 1000; // +/- 500ms
        delay = Math.max(1000, baseDelay + jitter);
      }

      console.warn(`[AI Client] Gemini API returned 429 (Rate Limit). Retrying in ${(delay / 1000).toFixed(1)}s (Attempt ${attempt}/${maxAttempts})...`);
      await sleep(delay);
    }
  }

  // 2. If Gemini fails completely, fall back to secondary provider
  console.warn('[AI Client] Gemini API calls failed persistently. Initiating backup fallback provider...');
  try {
    return await callOpenAIFallback(prompt, responseJson, temperature, maxOutputTokens);
  } catch (fallbackError: any) {
    console.error('[AI Client] Both primary and fallback AI providers failed.', fallbackError);
    throw new Error(`AI generation failed. Gemini: ${lastError?.message || 'Unknown error'} | Fallback: ${fallbackError.message}`);
  }
}
