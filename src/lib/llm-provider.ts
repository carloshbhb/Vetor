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
  'nvidia/nemotron-3.5-lightning:free',
  'dots-studio/dots-3-note-preview:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'xingchen-agi/xing4.0-29b-a4b:free',
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

function configuredProviders(): LLMProvider[] {
  if (cachedProviders) return cachedProviders;

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  const order = buildLLMProviderOrder(Boolean(openRouterKey), Boolean(groqKey), Boolean(nvidiaKey));

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
      providers.push({
        provider,
        model: DEFAULT_GROQ_MODEL,
        client: new OpenAI({
          apiKey: groqKey,
          baseURL: 'https://api.groq.com/openai/v1',
          timeout: 45_000,
          maxRetries: 0,
        }),
      });
    } else if (provider === 'nvidia' && nvidiaKey) {
      providers.push({
        provider,
        model: DEFAULT_NVIDIA_MODEL,
        client: new OpenAI({
          apiKey: nvidiaKey,
          baseURL: 'https://integrate.api.nvidia.com/v1',
          timeout: 65_000,
          maxRetries: 0,
        }),
      });
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

  for (const provider of providers) {
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
    } else if (params.model) {
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
        const requestRemainingMs = deadline - Date.now();
        const timeoutMs = Math.floor(Math.min(requestTimeoutMs, requestRemainingMs - safetyReserve));
        if (timeoutMs < 2_000) break;

        try {
          const createParams: Record<string, unknown> = {
            model,
            messages: [
              { role: 'system', content: params.systemPrompt },
              { role: 'user', content: attempt === 0 ? params.userPrompt : correctionPrompt(params.userPrompt) },
            ],
            temperature: params.temperature ?? 0.6,
            max_tokens: params.maxTokens ?? 3_000,
          };

          if (provider.provider !== 'openrouter' && params.responseFormat) {
            createParams.response_format = params.responseFormat;
          }
          if (provider.provider === 'groq' && model === DEFAULT_GROQ_MODEL) {
            createParams.reasoning_effort = 'low';
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
