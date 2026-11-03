import OpenAI from 'openai';

type ProviderKind = 'openrouter' | 'groq' | 'nvidia';

interface LLMProvider {
  client: OpenAI;
  model: string;
  provider: ProviderKind;
}

type OpenRouterCatalogModel = {
  id?: string;
  pricing?: { prompt?: string | number; completion?: string | number };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
};

const OPENROUTER_FREE_MODEL_PRIORITY = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'thinkingmachines/inkling:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3.5-lightning:free',
] as const;

const OPENROUTER_FREE_CATALOG_TTL_MS = 5 * 60_000;
const OPENROUTER_FREE_CATALOG_TIMEOUT_MS = 3_500;
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';

let cachedProviders: LLMProvider[] | null = null;
let cachedOpenRouterFreeModels: { expiresAt: number; models: string[] } | null = null;

function isZeroPrice(value: string | number | undefined): boolean {
  return value !== undefined && Number(value) === 0;
}

/** Keeps only vetted, currently listed text models with zero prompt and completion pricing. */
export function rankOpenRouterFreeModels(catalog: OpenRouterCatalogModel[]): string[] {
  const available = new Set(
    catalog
      .filter((model) => {
        const id = String(model.id || '');
        const input = model.architecture?.input_modalities || [];
        const output = model.architecture?.output_modalities || [];
        return id.endsWith(':free') &&
          OPENROUTER_FREE_MODEL_PRIORITY.includes(id as (typeof OPENROUTER_FREE_MODEL_PRIORITY)[number]) &&
          isZeroPrice(model.pricing?.prompt) &&
          isZeroPrice(model.pricing?.completion) &&
          input.includes('text') &&
          output.includes('text');
      })
      .map((model) => String(model.id))
  );

  return OPENROUTER_FREE_MODEL_PRIORITY.filter((id) => available.has(id)).slice(0, 6);
}

async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  if (cachedOpenRouterFreeModels && cachedOpenRouterFreeModels.expiresAt > Date.now()) {
    return cachedOpenRouterFreeModels.models;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: 'Bearer ' + apiKey },
      signal: AbortSignal.timeout(OPENROUTER_FREE_CATALOG_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('OpenRouter model catalog HTTP ' + response.status);

    const body = await response.json() as { data?: OpenRouterCatalogModel[] };
    const models = rankOpenRouterFreeModels(Array.isArray(body.data) ? body.data : []);
    // The free auto-router is the safe last resort if the curated free catalog is
    // temporarily unavailable or its IDs change; it cannot select a paid model.
    const selected = models.length ? models : ['openrouter/free'];
    cachedOpenRouterFreeModels = {
      expiresAt: Date.now() + OPENROUTER_FREE_CATALOG_TTL_MS,
      models: selected,
    };
    console.log('[LLM] OpenRouter free catalog: ' + (models.length ? models.join(', ') : 'fallback openrouter/free'));
    return selected;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('[LLM] OpenRouter free catalog unavailable; using free auto-router: ' + detail.slice(0, 180));
    return ['openrouter/free'];
  }
}

function configuredProviders(): LLMProvider[] {
  if (cachedProviders) return cachedProviders;

  const providers: LLMProvider[] = [];
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();

  if (openRouterKey) {
    providers.push({
      provider: 'openrouter',
      model: OPENROUTER_FREE_MODEL_PRIORITY[0],
      client: new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://www.vetor.blog',
          'X-Title': 'Vetor.blog',
        },
        timeout: 60_000,
        maxRetries: 0,
      }),
    });
  }

  if (groqKey) {
    providers.push({
      provider: 'groq',
      model: DEFAULT_GROQ_MODEL,
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
        timeout: 45_000,
        maxRetries: 0,
      }),
    });
  }

  if (nvidiaKey) {
    providers.push({
      provider: 'nvidia',
      model: DEFAULT_NVIDIA_MODEL,
      client: new OpenAI({
        apiKey: nvidiaKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
        timeout: 65_000,
        maxRetries: 0,
      }),
    });
  }

  cachedProviders = providers;
  return providers;
}

export function getLLMProvider(): LLMProvider {
  const provider = configuredProviders()[0];
  if (!provider) {
    throw new Error('[LLM] Nenhuma credencial de IA configurada. Configure OPENROUTER_API_KEY, GROQ_API_KEY ou NVIDIA_API_KEY.');
  }
  return provider;
}

function getHttpStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return Number((error as { status?: unknown }).status) || 0;
  }
  return 0;
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => part && typeof part === 'object' && 'text' in part ? String((part as { text?: unknown }).text || '') : '')
      .join('');
  }
  return '';
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
  maxAttemptsPerModel?: number;
  providerTimeouts?: Partial<Record<ProviderKind, number>>;
}): Promise<string> {
  const providers = configuredProviders();
  if (!providers.length) {
    throw new Error('[LLM] Nenhuma credencial de IA configurada. Configure OPENROUTER_API_KEY, GROQ_API_KEY ou NVIDIA_API_KEY.');
  }

  const deadline = Date.now() + (params.deadlineMs ?? 220_000);
  let lastFailure = 'nenhum provedor respondeu';

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const requestedModel = index === 0 && params.model ? params.model : provider.model;
    const remainingMs = deadline - Date.now();
    if (remainingMs < 5_000) break;

    const providerDefaultTimeout = provider.provider === 'openrouter' ? 45_000
      : provider.provider === 'groq' ? 40_000 : 60_000;
    const providerTimeout = params.providerTimeouts?.[provider.provider] ?? params.timeoutMs ?? providerDefaultTimeout;
    const requestTimeoutMs = Math.max(1_000, Math.min(providerTimeout, remainingMs - 2_000));
    const requestOptions = {
      timeout: requestTimeoutMs,
      signal: AbortSignal.timeout(requestTimeoutMs),
      maxRetries: 0,
    };

    try {
      let model = requestedModel;
      const createParams: Record<string, unknown> = {
        model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.6,
        max_tokens: params.maxTokens ?? 3_000,
      };

      if (provider.provider === 'openrouter') {
        const freeModels = params.model ? [params.model] : await getOpenRouterFreeModels(
          process.env.OPENROUTER_API_KEY?.trim() || ''
        );
        model = freeModels[0] || 'openrouter/free';
        createParams.model = model;
        // OpenRouter's ordered models array retries other free candidates on
        // provider/rate-limit errors inside this single API request. It does not
        // judge quality; the validator below still decides whether to accept text.
        if (freeModels.length > 1) createParams.extra_body = { models: freeModels };
        // Keep the request portable across the free catalog. JSON is enforced by
        // the existing content validators, not by model-specific response_format.
      } else if (provider.provider === 'groq') {
        if (params.responseFormat) createParams.response_format = params.responseFormat;
        if (model === DEFAULT_GROQ_MODEL) createParams.reasoning_effort = 'low';
      } else {
        if (params.responseFormat) createParams.response_format = params.responseFormat;
      }

      const startedAt = Date.now();
      let content = '';
      let servedModel = model;

      if (provider.provider === 'nvidia' && model.includes('nemotron-3.5-lightning')) {
        const stream = await provider.client.chat.completions.create({
          ...createParams,
          stream: true,
          chat_template_kwargs: { enable_thinking: false, force_nonempty_content: true },
        } as any, requestOptions) as any;

        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') content += delta;
        }
      } else {
        const response = await provider.client.chat.completions.create(createParams as any, requestOptions);
        content = extractText(response.choices[0]?.message?.content);
        servedModel = response.model || model;
      }

      if (!content.trim()) {
        lastFailure = provider.provider + '/' + servedModel + ' retornou conteúdo vazio';
        console.warn('[LLM] ' + lastFailure + '; tentando o próximo provedor.');
        continue;
      }

      if (params.validateResponse && !params.validateResponse(content)) {
        lastFailure = provider.provider + '/' + servedModel + ' reprovado pelo validador de qualidade';
        console.warn('[LLM] ' + lastFailure + '; conteúdo recusado e fallback acionado.');
        continue;
      }

      const elapsedMs = Date.now() - startedAt;
      console.log('[LLM] Sucesso: ' + provider.provider + ' | modelo: ' + servedModel + ' | ' + elapsedMs + ' ms');
      return content;
    } catch (error: unknown) {
      const status = getHttpStatus(error);
      const detail = error instanceof Error ? error.message.slice(0, 220) : 'erro de rede não identificado';
      lastFailure = provider.provider + '/' + model + ' HTTP ' + (status || 'network/timeout');
      console.warn('[LLM] ' + lastFailure + ': ' + detail + '; tentando o próximo provedor.');
      if (status === 429 && deadline - Date.now() > 1_000) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now())));
      }
    }
  }

  throw new Error('[LLM] Todos os provedores disponíveis falharam ou foram reprovados. Último resultado: ' + lastFailure);
}
