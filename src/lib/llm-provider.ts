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
  });

  return { client, model: 'gemini-2.5-flash', provider: 'gemini' };
}

function createGroqProvider(): LLMProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  return { client, model: 'groq/compound', provider: 'groq' };
}

function createOpenAIProvider(): LLMProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  return { client, model: 'gpt-4o', provider: 'openai' };
}

const providerFactories = [
  createOpenRouterProvider,
  createGeminiProvider,
  createGroqProvider,
  createOpenAIProvider,
];

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  for (const factory of providerFactories) {
    const provider = factory();
    if (provider) {
      cachedProvider = provider;
      console.log(`[LLM] Usando provedor: ${provider.provider} | Modelo: ${provider.model}`);
      return provider;
    }
  }

  throw new Error(
    '[LLM] Nenhum provedor de IA configurado. Defina OPENROUTER_API_KEY, GOOGLE_AI_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY.'
  );
}

export async function chatCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
}): Promise<string> {
  const provider = getLLMProvider();
  const { client, model } = provider;

  const createParams: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature: number;
    max_tokens: number;
    response_format?: { type: 'json_object' };
  } = {
    model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    temperature: params.temperature ?? 0.8,
    max_tokens: params.maxTokens ?? 4000,
  };

  if (params.responseFormat && provider.provider !== 'gemini') {
    createParams.response_format = params.responseFormat;
  }

  const response = await client.chat.completions.create(createParams);
  if ('choices' in response) {
    return response.choices[0].message.content || '';
  }
  return '';
}
