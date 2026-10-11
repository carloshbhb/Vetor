import OpenAI from 'openai';

interface LLMProvider {
  client: OpenAI;
  model: string;
  provider: string;
}

const OPENROUTER_FREE_MODELS = [
  'xiaomi/mimo-v2.5',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash-vl:free',
  'z-ai/glm-5.2:free',
];

function createOpenRouterProvider(): LLMProvider | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 27000,
    maxRetries: 0,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
      'X-Title': 'Vetor Blog',
    },
  });

  const model = OPENROUTER_FREE_MODELS[0] || 'xiaomi/mimo-v2.5';
  return { client, model, provider: 'openrouter' };
}

function createGeminiProvider(): LLMProvider | null {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    timeout: 27000,
    maxRetries: 0,
  });

  return { client, model: 'gemini-2.5-flash', provider: 'gemini' };
}

function createGroqProvider(): LLMProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    timeout: 27000,
    maxRetries: 0,
  });

  return { client, model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', provider: 'groq' };
}

function createOpenAIProvider(): LLMProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey, timeout: 27000, maxRetries: 0 });

  return { client, model: 'gpt-4o', provider: 'openai' };
}

function createNvidiaProviders(): LLMProvider[] {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return [];

  // These model IDs are currently listed on NVIDIA's official NIM catalog.
  // Keep known-retired model IDs out of the first-line retry chain.
  const preferredModels = [
    'nvidia/nemotron-3.5-lightning-30b-a3b',
    'meta/muse-glimmer-30b',
  ];
  const configuredModel = process.env.NVIDIA_MODEL?.trim();
  const models = Array.from(new Set([
    ...preferredModels,
    ...(configuredModel && !preferredModels.includes(configuredModel) ? [configuredModel] : []),
  ]));

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 36000,
    maxRetries: 0,
  });

  return models.map((model) => ({ client, model, provider: 'nvidia' }));
}

// Prefer NVIDIA in production, then fall back to other configured providers.
const providerFactories = [
  createOpenAIProvider,
  createGeminiProvider,
  createOpenRouterProvider,
];

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const provider = configuredProviders()[0];
  if (provider) {
    cachedProvider = provider;
    console.log(`[LLM] Usando provedor: ${provider.provider} | Modelo: ${provider.model}`);
    return provider;
  }

  throw new Error(
    '[LLM] Nenhum provedor de IA configurado. Defina NVIDIA_API_KEY, OPENROUTER_API_KEY, GOOGLE_AI_API_KEY ou GROQ_API_KEY.'
  );
}

function configuredProviders(): LLMProvider[] {
  const groq = createGroqProvider();
  return [
    // Groq answered most consistently during the production checks. Try it
    // before slow NVIDIA timeouts and the currently rate/credit-limited fallbacks.
    ...(groq ? [groq] : []),
    ...createNvidiaProviders(),
    ...providerFactories.map((factory) => factory())
      .filter((provider): provider is LLMProvider => provider !== null),
  ];
}
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function chatCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
  model?: string;
}): Promise<string> {
  const providers = configuredProviders();
  if (!providers.length) {
    throw new Error('[LLM] Nenhum provedor configurado. Defina NVIDIA_API_KEY, OPENROUTER_API_KEY, GOOGLE_AI_API_KEY ou GROQ_API_KEY.');
  }

  // Leave time to persist and validate the output inside Vercel's 60-second runtime.
  const deadline = Date.now() + 56000;
  let lastError: unknown = null;

  for (const provider of providers) {
    if (deadline - Date.now() < 5000) break;

    try {
      const createParams: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        temperature: number;
        max_tokens: number;
        response_format?: { type: 'json_object' };
      } = {
        model: params.model || provider.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.6,
        max_tokens: params.maxTokens ?? 3000,
      };
      if (params.responseFormat && provider.provider !== 'gemini') {
        createParams.response_format = params.responseFormat;
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs < 5000) break;
      const requestOptions = {
        timeout: Math.min(
          provider.provider === 'groq' ? 18000 :
          provider.model.includes('nemotron-3.5-lightning') ? 20000 :
          provider.provider === 'nvidia' ? 7000 : 9000,
          remainingMs - 2000
        ),
        maxRetries: 0,
      };

      let content = '';
      if (provider.provider === 'nvidia' && createParams.model === 'nvidia/nemotron-3.5-lightning-30b-a3b') {
        // NVIDIA's official NIM example streams Nemotron responses. Streaming
        // avoids waiting for a long reasoning pass before receiving article text.
        const stream = await provider.client.chat.completions.create({
          ...(createParams as any),
          stream: true,
          // The OpenAI JavaScript SDK sends unrecognized request parameters
          // directly in the JSON body; do not wrap NVIDIA's field in Python-style extra_body.
          chat_template_kwargs: { enable_thinking: false },
        } as any, requestOptions) as any;
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') content += delta;
        }
      } else {
        const response = await provider.client.chat.completions.create(createParams, requestOptions);
        content = response.choices[0]?.message?.content || '';
      }

      if (!content.trim()) {
        throw new Error(`[LLM] ${provider.provider}/${createParams.model} returned an empty response`);
      }
      console.log(`[LLM] Success: ${provider.provider} | model: ${createParams.model}`);
      return content;
    } catch (error: unknown) {
      lastError = error;
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status) : 0;
      const detail = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
      console.warn(`[LLM] ${provider.provider}/${provider.model} failed (status ${status || 'timeout/network'}): ${detail}; trying next configured provider.`);
      // Do not spend the function's entire runtime retrying one slow/rate-limited model.
      if (status === 429 && deadline - Date.now() > 19000) {
        await wait(750);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown error');
  throw new Error(`[LLM] All configured providers failed within the generation budget. Last error: ${message}`);
}
