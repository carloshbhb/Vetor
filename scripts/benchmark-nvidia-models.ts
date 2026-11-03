import { config } from 'dotenv';
import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';

config({ path: '.env.local' });

const API_KEY = process.env.NVIDIA_API_KEY?.trim();
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_TOKENS = 2_400;

// IDs copied from the currently selected NVIDIA NIM catalog for this benchmark.
const MODELS = [
  'mistralai/mistral-large-4-1t-a52b',
  'nvidia/nemotron-3.5-super-vl-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/nemotron-3.5-bolt-e4b',
  'minimaxai/minimax-m3.1-flash',
  'deepseek-ai/deepseek-v4.1-flash',
  'z-ai/glm-5-3-flash',
] as const;

const systemPrompt = [
  'Você é editor técnico e especialista em reviews SEO para o site brasileiro Vetor.blog.',
  'Escreva em português brasileiro natural, sem inventar testes realizados, preços atuais, fontes, citações ou especificações além dos fatos fornecidos.',
  'Diferencie claramente fatos fornecidos de recomendações editoriais. Não alegue experiência prática real.',
  'Use parágrafos curtos, subtítulos claros e análise útil para quem está decidindo comprar.',
].join(' ');

const userPrompt = `Crie uma amostra editorial comparável para avaliar modelos de IA. Produto: Samsung Galaxy Fit3.
Fatos confirmados que você pode usar: tela AMOLED de 1,6 polegada; autonomia anunciada de até 13 dias, variável conforme o uso; resistência à água de 5 ATM; monitoramento de SpO2; não possui GPS integrado.
Não invente preço, medições próprias, testes práticos, avaliações de compradores nem especificações adicionais.
Entregue um mini-review de aproximadamente 450 a 600 palavras com: (1) título SEO, (2) meta description de até 155 caracteres, (3) resumo da proposta, (4) tela e uso diário, (5) bateria e limitações, (6) para quem vale a pena, (7) três prós e dois contras, (8) veredito equilibrado. Use Markdown.
Esta é apenas uma avaliação offline: não publique nem tente salvar o texto em qualquer serviço.`;

type ModelResult = {
  model: string;
  status: 'success' | 'empty_response' | 'failed';
  elapsedMs: number;
  httpStatus?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  wordCount?: number;
  qualityChecks?: Record<string, boolean>;
  output?: string;
  error?: string;
};

function evaluate(output: string) {
  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
  const checks = {
    sufficientLength: wordCount >= 350,
    productSpecific: /galaxy fit3/i.test(output) && /amoled|tela/i.test(output) && /bateria|autonomia/i.test(output) && /gps/i.test(output),
    structuredSections: (output.match(/(^|\n)\s{0,3}(?:#{1,6}\s|\*\*[^*\n]{3,}\*\*)/gim) || []).length >= 3,
    includesProsAndCons: /pr[oó]s|vantagens/i.test(output) && /contras|limita[cç][oõ]es/i.test(output),
    includesVerdict: /veredito|vale a pena/i.test(output),
    metadataPresent: /meta[- ]?description|meta descri[cç][aã]o|descri[cç][aã]o meta/i.test(output),
    avoidsUnsupportedTestClaims: !/em nossos testes|nos nossos testes|testamos|medimos/i.test(output),
  };
  return { wordCount, checks: { ...checks, passed: Object.values(checks).every(Boolean) } };
}

async function main() {
  if (!API_KEY) {
    console.error('NVIDIA_API_KEY não definida. Configure-a em GitHub Actions Secrets ou no ambiente local.');
    process.exit(1);
  }

  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  const results: ModelResult[] = [];
  console.log(`Benchmark NVIDIA NIM: ${MODELS.length} modelos; execução sequencial para reduzir 429.`);

  for (const model of MODELS) {
    const startedAt = Date.now();
    console.log(`\n[START] ${model}`);
    try {
      // Keep request parameters conservative and common across providers.
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
      });

      const output = response.choices[0]?.message?.content ?? '';
      const elapsedMs = Date.now() - startedAt;
      if (!output.trim()) {
        results.push({
          model,
          status: 'empty_response',
          elapsedMs,
          promptTokens: response.usage?.prompt_tokens ?? null,
          completionTokens: response.usage?.completion_tokens ?? null,
          totalTokens: response.usage?.total_tokens ?? null,
          wordCount: 0,
          output,
        });
        console.log(`[EMPTY] ${model} em ${elapsedMs} ms`);
        continue;
      }

      const { wordCount, checks } = evaluate(output);
      results.push({
        model,
        status: 'success',
        elapsedMs,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null,
        totalTokens: response.usage?.total_tokens ?? null,
        wordCount,
        qualityChecks: checks,
        output,
      });
      console.log(`[OK] ${model}: ${elapsedMs} ms; ${wordCount} palavras; quality ${checks.passed ? 'PASS' : 'REVIEW'}`);
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const message = String(err.message ?? error).slice(0, 800);
      results.push({
        model,
        status: 'failed',
        elapsedMs: Date.now() - startedAt,
        httpStatus: err.status ?? null,
        error: message,
      });
      console.error(`[FAIL] ${model}: HTTP ${err.status ?? 'unknown'} — ${message.slice(0, 250)}`);
    }
  }

  const succeeded = results.filter((r) => r.status === 'success').length;
  const passedQuality = results.filter((r) => r.qualityChecks?.passed === true).length;
  const report = {
    generatedAt: new Date().toISOString(),
    api: 'NVIDIA NIM',
    baseUrl: BASE_URL,
    evaluationMode: 'same prompt, sequential requests, offline only; no publication or database writes',
    request: { timeoutMs: REQUEST_TIMEOUT_MS, maxTokens: MAX_TOKENS, temperature: 0.3 },
    totals: {
      requested: MODELS.length,
      succeeded,
      failed: results.filter((r) => r.status === 'failed').length,
      emptyResponses: results.filter((r) => r.status === 'empty_response').length,
      qualityPassed: passedQuality,
    },
    models: results,
    manualReviewRubric: [
      { criterion: 'Precisão técnica e ausência de fatos inventados', weightPercent: 30 },
      { criterion: 'Qualidade editorial em português', weightPercent: 25 },
      { criterion: 'Cumprimento da estrutura SEO solicitada', weightPercent: 20 },
      { criterion: 'Profundidade e equilíbrio da análise', weightPercent: 15 },
      { criterion: 'Tempo e consumo de tokens', weightPercent: 10 },
    ],
    interpretation: 'Quality checks are automated screening only; compare full outputs manually before selecting a production model.',
  };

  const outDir = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'nvidia-model-benchmark.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

  const markdown = [
    '# NVIDIA NIM Model Benchmark',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `- Models requested: ${MODELS.length}`,
    `- Successful responses: ${succeeded}`,
    `- Failed requests: ${report.totals.failed}`,
    `- Empty responses: ${report.totals.emptyResponses}`,
    `- Automated quality passes: ${passedQuality}`,
    '',
    '| Model | Status | HTTP | Latency (ms) | Words | Tokens (prompt/completion) | Quality |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...results.map((r) => `| ${r.model} | ${r.status} | ${r.httpStatus ?? '—'} | ${r.elapsedMs} | ${r.wordCount ?? 0} | ${r.promptTokens ?? '—'}/${r.completionTokens ?? '—'} | ${r.qualityChecks ? (r.qualityChecks.passed ? 'PASS' : 'REVIEW') : '—'} |`),
    '',
    'Automated quality checks are screening signals, not a final editorial judgment. Review each model output in the JSON artifact.',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'nvidia-model-benchmark.md'), markdown + '\n', 'utf8');

  console.log(`\nBenchmark concluído: ${succeeded}/${MODELS.length} respostas. Relatórios JSON e Markdown gravados em artifacts/.`);
  // Keep the workflow useful even when individual free endpoints are unavailable.
  // Fail only when no model produced a response; per-model failures remain in the artifact.
  if (succeeded === 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Falha no benchmark:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
