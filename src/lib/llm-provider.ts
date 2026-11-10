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

// Ordered by OpenRouter's current free-model adoption ranking, with general
// editorial-capable text models only. Inkling is excluded because its free
// endpoint is scheduled to retire on 2026-11-04; specialized code/moderation,
// embedding and reranking models are not content generators.
export const OPENROUTER_FREE_MODEL_PRIORITY = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'dots-studio/dots-3-note-preview:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
] as const;

const OPENROUTER_FREE_CATALOG_TTL_MS = 5 * 60_000;
const OPENROUTER_FREE_CATALOG_TIMEOUT_MS = 3_500;
const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
const DEFAULT_GROQ_FALLBACK_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const DEFAULT_NVIDIA_FALLBACK_MODELS = [
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'deepseek-ai/deepseek-v4.1-flash',
  'z-ai/glm-5.3-flash',
];

let cachedProviders: LLMProvider[] | null = null;
let cachedOpenRouterFreeModels: { expiresAt: number; models: string[] } | null = null;
const groqNextAllowedAtByModel = new Map<string, number>();

export type GroqRequestPolicy = {
  maxTokens: number;
  minimumIntervalMs: number;
};

export function getGroqRequestPolicy(model: string, requestedMaxTokens: number): GroqRequestPolicy {
  const requested = Math.max(1, Math.floor(Number(requestedMaxTokens) || 1));
  if (model.startsWith('qwen/')) {
    return { maxTokens: Math.min(requested, 900), minimumIntervalMs: 60_000 };
  }
  if (model.startsWith('openai/gpt-oss')) {
    return { maxTokens: Math.min(requested, 1_300), minimumIntervalMs: 60_000 };
  }
  return { maxTokens: requested, minimumIntervalMs: 30_000 };
}

async function waitForGroqRequestSlot(model: string, deadline: number): Promise<boolean> {
  const policy = getGroqRequestPolicy(model, Number.MAX_SAFE_INTEGER);
  const nextAllowedAt = groqNextAllowedAtByModel.get(model) || 0;
  const waitMs = Math.max(0, nextAllowedAt - Date.now());
  if (Date.now() + waitMs > deadline - 5_000) return false;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  if (Date.now() >= deadline - 2_000) return false;
  groqNextAllowedAtByModel.set(model, Date.now() + policy.minimumIntervalMs);
  return true;
}

function isZeroPrice(value: string | number | undefined): boolean {
  return value !== undefined && Number(value) === 0;
}

/** Keeps only curated, currently listed text models with zero input and output pricing. */
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

  return OPENROUTER_FREE_MODEL_PRIORITY.filter((id) => available.has(id));
}

export function buildLLMProviderOrder(
  hasOpenRouter: boolean,
  hasGroq: boolean,
  hasNvidia: boolean,
): ProviderKind[] {
  return [
    ...(hasOpenRouter ? ['openrouter' as const] : []),
    ...(hasGroq ? ['groq' as const] : []),
    ...(hasNvidia ? ['nvidia' as const] : []),
  ];
}

async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  if (cachedOpenRouterFreeModels && cachedOpenRouterFreeModels.expiresAt > Date.now()) {
    return cachedOpenRouterFreeModels.models;
  }

  try {
    // Use the authenticated catalog: it reflects this API key's actual model
    // access, including account-level data-policy/guardrail restrictions.
    // The public catalog can list free models that this key is not allowed to call.
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: 'Bearer ' + apiKey },
      signal: AbortSignal.timeout(OPENROUTER_FREE_CATALOG_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('OpenRouter model catalog HTTP ' + response.status);

    const body = await response.json() as { data?: OpenRouterCatalogModel[] };
    const curated = rankOpenRouterFreeModels(Array.isArray(body.data) ? body.data : []);
    // This is a free-only router; it is used only when the curated catalog
    // temporarily fails to expose any of the known zero-priced chat models.
    const selected = curated.length ? curated : ['openrouter/free'];
    cachedOpenRouterFreeModels = {
      expiresAt: Date.now() + OPENROUTER_FREE_CATALOG_TTL_MS,
      models: selected,
    };
    console.log('[LLM] OpenRouter free catalog: ' + (curated.length ? curated.join(', ') : 'openrouter/free'));
    return selected;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn('[LLM] OpenRouter free catalog unavailable; using the free-only auto-router: ' + detail.slice(0, 180));
    return ['openrouter/free'];
  }
}

function uniqueModels(values: Array<string | undefined>): string[] {
  const models: string[] = [];
  for (const value of values) {
    const model = String(value || '').trim();
    if (model && !models.includes(model)) models.push(model);
  }
  return models;
}

function configuredProviders(): LLMProvider[] {
  if (cachedProviders) return cachedProviders;

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  const order = buildLLMProviderOrder(Boolean(openRouterKey), Boolean(groqKey), Boolean(nvidiaKey));
  const groqModels = uniqueModels([
    process.env.GROQ_MODEL,
    process.env.GROQ_FALLBACK_MODEL,
    DEFAULT_GROQ_MODEL,
    DEFAULT_GROQ_FALLBACK_MODEL,
  ]);
  const nvidiaModels = uniqueModels([
    DEFAULT_NVIDIA_MODEL,
    process.env.NVIDIA_MODEL,
    process.env.NVIDIA_FALLBACK_MODEL,
    ...DEFAULT_NVIDIA_FALLBACK_MODELS,
  ]);

  const providers: LLMProvider[] = [];
  for (const provider of order) {
    if (provider === 'openrouter' && openRouterKey) {
      providers.push({
        provider,
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
    } else if (provider === 'groq' && groqKey) {
      for (const model of groqModels) {
        providers.push({
          provider,
          model,
          client: new OpenAI({
            apiKey: groqKey,
            baseURL: 'https://api.groq.com/openai/v1',
            timeout: 45_000,
            maxRetries: 0,
          }),
        });
      }
    } else if (provider === 'nvidia' && nvidiaKey) {
      for (const model of nvidiaModels) {
        providers.push({
          provider,
          model,
          client: new OpenAI({
            apiKey: nvidiaKey,
            baseURL: 'https://integrate.api.nvidia.com/v1',
            timeout: 65_000,
            maxRetries: 0,
          }),
        });
      }
    }
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

function correctionPrompt(userPrompt: string): string {
  return [
    userPrompt,
    '',
    'CORREÇÃO OBRIGATÓRIA: a resposta anterior não passou pelo validador. Gere novamente do início, cumpra todos os campos, marcadores e limites solicitados, sem introdução, sem raciocínio interno e sem cercas de código. Retorne somente a saída final no formato solicitado.',
  ].join('\n');
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
  maxOpenRouterModels?: number;
  providerTimeouts?: Partial<Record<ProviderKind, number>>;
}): Promise<string> {
  const providers = configuredProviders();
  if (!providers.length) {
    throw new Error('[LLM] Nenhuma credencial de IA configurada. Configure OPENROUTER_API_KEY, GROQ_API_KEY ou NVIDIA_API_KEY.');
  }

  const deadline = Date.now() + (params.deadlineMs ?? 220_000);
  const groqConfigured = providers.some((provider) => provider.provider === 'groq');
  const nvidiaConfigured = providers.some((provider) => provider.provider === 'nvidia');
  const groqBudgetMs = params.providerTimeouts?.groq ?? params.timeoutMs ?? 15_000;
  const nvidiaBudgetMs = params.providerTimeouts?.nvidia ?? params.timeoutMs ?? 35_000;
  const maxOpenRouterModels = Math.max(1, Math.min(8, Math.floor(params.maxOpenRouterModels ?? 8)));
  const requestedAttempts = Math.max(1, Math.min(2, Math.floor(params.maxAttemptsPerModel ?? 1)));
  let lastFailure = 'nenhum provedor respondeu';

  for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
    const provider = providers[providerIndex];
    if (Date.now() >= deadline - 1_000) break;

    let models = [provider.model];
    if (provider.provider === 'openrouter') {
      const freeModels = await getOpenRouterFreeModels(process.env.OPENROUTER_API_KEY?.trim() || '');
      if (params.model) {
        if (!freeModels.includes(params.model)) {
          lastFailure = 'o modelo OpenRouter solicitado não está no catálogo gratuito validado';
          console.warn('[LLM] ' + lastFailure + '; nenhum modelo pago será chamado.');
          continue;
        }
        models = [params.model];
      } else {
        models = freeModels.slice(0, maxOpenRouterModels);
      }
    } else if (params.model && providerIndex === 0) {
      // Preserve explicit model selection for provider-isolated maintenance scripts.
      models = [params.model];
    }

    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
      const model = models[modelIndex];
      const remainingMs = deadline - Date.now();
      if (remainingMs < 2_500) break;

      const reserveForGroq = groqConfigured && provider.provider !== 'groq' ? groqBudgetMs : 0;
      const reserveForNvidia = nvidiaConfigured && provider.provider !== 'nvidia' ? nvidiaBudgetMs : 0;
      const safetyReserve = (reserveForGroq || reserveForNvidia) ? 1_000 : 500;
      const openRouterAttemptsLeft = models.length - modelIndex;
      const configuredTimeout = params.providerTimeouts?.[provider.provider] ?? params.timeoutMs ??
        (provider.provider === 'openrouter' ? 45_000 : provider.provider === 'groq' ? 15_000 : 35_000);
      const availableBeforeFallback = remainingMs - reserveForGroq - reserveForNvidia - safetyReserve;
      const allocatedTimeout = provider.provider === 'openrouter'
        ? Math.floor(availableBeforeFallback / openRouterAttemptsLeft)
        : provider.provider === 'groq'
          ? remainingMs - reserveForNvidia - safetyReserve
          : remainingMs - safetyReserve;
      const requestTimeoutMs = Math.floor(Math.min(configuredTimeout, allocatedTimeout));
      if (requestTimeoutMs < 2_000) {
        console.warn('[LLM] Tempo insuficiente para ' + provider.provider + '/' + model + '; preservando a janela do próximo fallback.');
        break;
      }

      for (let attempt = 0; attempt < requestedAttempts; attempt += 1) {
        if (provider.provider === 'groq' && !(await waitForGroqRequestSlot(model, deadline))) {
          lastFailure = 'Groq/' + model + ' sem janela de tokens disponível antes do limite desta geração';
          console.warn('[LLM] ' + lastFailure + '; tentando o próximo fallback.');
          break;
        }
        const requestRemainingMs = deadline - Date.now();
        const timeoutMs = Math.floor(Math.min(requestTimeoutMs, requestRemainingMs - safetyReserve));
        if (timeoutMs < 2_000) break;

        try {
          const groqPolicy = provider.provider === 'groq'
            ? getGroqRequestPolicy(model, params.maxTokens ?? 3_000)
            : null;
          const requestedOutputTokens = groqPolicy?.maxTokens ?? (params.maxTokens ?? 3_000);
          const createParams: Record<string, unknown> = {
            model,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: attempt === 0 ? params.userPrompt : correctionPrompt(params.userPrompt) },
            ],
            temperature: params.temperature ?? 0.6,
            max_tokens: requestedOutputTokens,
          };

          if (provider.provider === 'groq') {
            // Groq's GPT-OSS endpoint uses max_completion_tokens (max_tokens is deprecated).
            createParams.max_completion_tokens = requestedOutputTokens;
            delete createParams.max_tokens;
            if (params.responseFormat) {
              createParams.response_format = params.responseFormat;
              // GPT-OSS requires an explicit reasoning format when JSON mode is enabled.
              createParams.reasoning_format = 'hidden';
            }
            if (model.startsWith('openai/gpt-oss')) createParams.reasoning_effort = 'low';
          } else if (provider.provider === 'nvidia' && params.responseFormat) {
            createParams.response_format = params.responseFormat;
          }

          const requestOptions = {
            timeout: timeoutMs,
            signal: AbortSignal.timeout(timeoutMs),
            maxRetries: 0,
          };

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
            console.warn('[LLM] ' + lastFailure + '; tentando o próximo modelo/provedor.');
            break;
          }

          if (params.validateResponse && !params.validateResponse(content)) {
            lastFailure = provider.provider + '/' + servedModel + ' reprovado pelo validador de qualidade';
            console.warn('[LLM] ' + lastFailure + '; conteúdo recusado e fallback acionado.');
            if (attempt + 1 < requestedAttempts && deadline - Date.now() > safetyReserve + 2_000) continue;
            break;
          }

          const elapsedMs = Date.now() - startedAt;
          console.log('[LLM] Sucesso: ' + provider.provider + ' | modelo: ' + servedModel + ' | ' + elapsedMs + ' ms');
          return content;
        } catch (error: unknown) {
          const status = getHttpStatus(error);
          const detail = error instanceof Error ? error.message.slice(0, 180) : 'erro de rede não identificado';
          lastFailure = provider.provider + '/' + model + ' HTTP ' + (status || 'network/timeout');
          console.warn('[LLM] ' + lastFailure + ': ' + detail + '; tentando o próximo modelo/provedor.');
          if (status === 429 && deadline - Date.now() > safetyReserve + 500) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(250, deadline - Date.now() - safetyReserve)));
          }
          break;
        }
      }
    }
  }

  throw new Error('[LLM] Todos os modelos OpenRouter gratuitos, Groq e NVIDIA disponíveis falharam ou foram reprovados. Último resultado: ' + lastFailure);
}
