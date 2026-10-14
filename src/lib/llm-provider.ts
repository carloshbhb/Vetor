import OpenAI from 'openai';

interface LLMProvider {
  client: OpenAI;
  model: string;
  provider: 'nvidia';
}

const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const DEFAULT_NVIDIA_FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b';

function createNvidiaProviders(): LLMProvider[] {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) return [];

  const primaryModel = process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
  const fallbackModel = process.env.NVIDIA_FALLBACK_MODEL?.trim() || DEFAULT_NVIDIA_FALLBACK_MODEL;
  // Only use a third model when one is explicitly configured; do not assume a model
  // ID is live on NVIDIA NIM when it has already returned HTTP 410.
  const backupModel = process.env.NVIDIA_FALLBACK_MODEL_2?.trim();
  const models = Array.from(new Set([primaryModel, fallbackModel, backupModel].filter((model): model is string => !!model)));

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 215000, // Allow the full NVIDIA fallback budget to complete.
    maxRetries: 0,
  });

  return models.map((model) => ({ client, model, provider: 'nvidia' }));
}

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const provider = configuredProviders()[0];
  if (provider) {
    cachedProvider = provider;
    console.log(`[LLM] Provedor exclusivo: NVIDIA | Modelo: ${provider.model}`);
    return provider;
  }

  throw new Error(
    '[LLM] NVIDIA_API_KEY ausente. Configure uma chave NVIDIA válida; provedores externos não são utilizados.'
  );
}

function configuredProviders(): LLMProvider[] {
  return createNvidiaProviders();
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
  validateResponse?: (content: string) => boolean;
  timeoutMs?: number;
  deadlineMs?: number;
}): Promise<string> {
  const providers = configuredProviders();
  if (!providers.length) {
    throw new Error('[LLM] NVIDIA_API_KEY ausente. Configure uma chave NVIDIA válida; provedores externos não são utilizados.');
  }

  const deadline = Date.now() + (params.deadlineMs ?? 220000);
  let lastError: unknown = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    if (deadline - Date.now() < 8000) break;

    // Honor an explicitly requested model for the first attempt; keep fallback NVIDIA-only.
    const model = index === 0 && params.model ? params.model : provider.model;
    try {
      const createParams: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        temperature: number;
        max_tokens: number;
        response_format?: { type: 'json_object' };
        reasoning_effort?: 'none' | 'high' | 'max';
      } = {
        model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.6,
        max_tokens: params.maxTokens ?? 3000,
      };
      if (params.responseFormat) createParams.response_format = params.responseFormat;
      const remainingMs = deadline - Date.now();
      if (remainingMs < 8000) break;
      const requestOptions = {
        timeout: Math.min(
          params.timeoutMs ?? (model.includes('nemotron-3.5-lightning') ? 70000 : 65000),
          remainingMs - 7000
        ),
        maxRetries: 0,
      };

      let content = '';
      if (model.includes('nemotron-3.5-lightning')) {
        const stream = await provider.client.chat.completions.create({
          ...(createParams as any),
          stream: true,
          chat_template_kwargs: { enable_thinking: false },
        } as any, requestOptions) as any;
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') content += delta;
        }
      } else {
        const response = await provider.client.chat.completions.create(createParams as any, requestOptions);
        content = response.choices[0]?.message?.content || '';
      }

      if (!content.trim()) {
        throw new Error(`[LLM] NVIDIA/${model} retornou resposta vazia`);
      }
      if (params.validateResponse && !params.validateResponse(content)) {
        throw new Error(`[LLM] NVIDIA/${model} retornou JSON incompleto; validado como resposta inutilizável, tentando o próximo modelo.`);
      }
      console.log(`[LLM] Sucesso: NVIDIA | modelo: ${model}`);
      return content;
    } catch (error: unknown) {
      lastError = error;
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: unknown }).status) : 0;
      const detail = error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400);
      const failureKind = detail.includes('JSON incompleto') ? 'quality' : (status || 'timeout/network');
      console.warn(`[LLM] NVIDIA/${model} falhou (status ${failureKind}): ${detail}; tentando outro modelo NVIDIA.`);
      if (status === 429 && deadline - Date.now() > 15000) await wait(750);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? 'nenhum modelo respondeu');
  throw new Error(`[LLM] Todos os modelos NVIDIA configurados falharam dentro do tempo disponível. Último erro: ${message}`);
}
