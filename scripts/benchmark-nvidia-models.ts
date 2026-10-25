import { config } from 'dotenv';
import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';

config({ path: '.env.local' });

const API_KEY = process.env.NVIDIA_API_KEY?.trim();
const BASE_URL = 'https://integrate.api.nvidia.com/v1';
const TARGET_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const MODELS = [
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/nemotron-3-super-120b-a12b',
  TARGET_MODEL,
];

const systemPrompt = [
  'Você é editor técnico e especialista em reviews SEO para o site brasileiro Vetor.blog.',
  'Escreva em português brasileiro natural, sem inventar testes realizados, preços atuais, fontes, citações ou especificações além dos fatos fornecidos.',
  'Diferencie claramente os fatos fornecidos das recomendações editoriais. Não alegue experiência prática real.',
  'Use parágrafos curtos, subtítulos claros e uma análise útil para quem está decidindo comprar.',
].join(' ');

const userPrompt = `Crie uma amostra editorial comparável para avaliar modelos de IA. Produto: Samsung Galaxy Fit3.
Fatos confirmados que você pode usar: tela AMOLED de 1,6 polegada; autonomia anunciada de até 13 dias, variável conforme o uso; resistência à água de 5 ATM; monitoramento de SpO2; não possui GPS integrado.
Não invente preço, medições próprias, testes práticos, avaliações de compradores nem especificações adicionais.
Entregue um mini-review de aproximadamente 450 a 600 palavras com: (1) título SEO, (2) meta description de até 155 caracteres, (3) resumo da proposta, (4) tela e uso diário, (5) bateria e limitações, (6) para quem vale a pena, (7) três prós e dois contras, (8) veredito equilibrado. Use Markdown. Esta é apenas uma avaliação offline: não publique nem tente salvar o texto em qualquer serviço.`;

async function main() {
  if (!API_KEY) {
    console.error('NVIDIA_API_KEY não definida. Configure-a no ambiente antes de executar o benchmark.');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL, timeout: 120000, maxRetries: 0 });
  const results: Array<Record<string, unknown>> = [];

  for (const model of MODELS) {
    const startedAt = Date.now();
    try {
      // Match the production adapter's non-thinking configuration for the new fallback.
      const requestParams: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: model === TARGET_MODEL ? 2600 : 1800,
        ...(model.includes('nemotron-3.5-lightning') ? {} : { reasoning_effort: 'none' }),
        chat_template_kwargs: { enable_thinking: false, force_nonempty_content: true },
      };
      const response = await client.chat.completions.create(requestParams);

      const output = response.choices[0]?.message?.content ?? '';
      const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
      const qualityChecks = {
        sufficientLength: wordCount >= 350,
        productSpecific: /galaxy fit3/i.test(output) && /amoled|tela/i.test(output) && /bateria|autonomia/i.test(output) && /gps/i.test(output),
        structuredSections: (output.match(/(^|\\n)\\s{0,3}(?:#{1,6}\\s|\\*\\*[^*\\n]{3,}\\*\\*)/gim) || []).length >= 3,
        includesProsAndCons: /pr[oó]s|vantagens/i.test(output) && /contras|limita[cç][oõ]es/i.test(output),
        includesVerdict: /veredito|vale a pena/i.test(output),
        metadataPresent: /meta[- ]?description|meta descri[cç][aã]o|descri[cç][aã]o meta/i.test(output),
        avoidsUnsupportedTestClaims: !/em nossos testes|nos nossos testes|testamos|medimos/i.test(output),
      };
      qualityChecks.passed = Object.values(qualityChecks).every(Boolean);
      results.push({
        model,
        status: output.trim() ? 'success' : 'empty_response',
        elapsedMs: Date.now() - startedAt,
        promptTokens: response.usage?.prompt_tokens ?? null,
        completionTokens: response.usage?.completion_tokens ?? null,
        wordCount,
        qualityChecks,
        output,
      });
      console.log(`[${model}] concluído em ${Date.now() - startedAt} ms; palavras: ${wordCount}; quality-check: ${qualityChecks.passed ? 'PASS' : 'FAIL'}`);
      if (model === TARGET_MODEL && !qualityChecks.passed) {
        console.error(`[${TARGET_MODEL}] respondeu, mas não passou em todos os critérios básicos de qualidade: ${JSON.stringify(qualityChecks)}`);
      }
    } catch (error) {
      const err = error as { status?: number; message?: string };
      results.push({
        model,
        status: 'failed',
        elapsedMs: Date.now() - startedAt,
        httpStatus: err.status ?? null,
        error: String(err.message ?? error).slice(0, 600),
      });
      console.error(`[${model}] falhou (HTTP ${err.status ?? 'desconhecido'}): ${String(err.message ?? error).slice(0, 250)}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    api: 'NVIDIA NIM',
    evaluationMode: 'same prompt, offline, no publication or database writes',
    models: results,
    manualReviewRubric: [
      { criterion: 'Precisão técnica e ausência de fatos inventados', weightPercent: 30 },
      { criterion: 'Qualidade editorial em português', weightPercent: 25 },
      { criterion: 'Cumprimento da estrutura SEO solicitada', weightPercent: 20 },
      { criterion: 'Profundidade e equilíbrio da análise', weightPercent: 15 },
      { criterion: 'Tempo e consumo de tokens', weightPercent: 10 },
    ],
  };

  const outputPath = path.join(process.cwd(), 'artifacts', 'nvidia-model-benchmark.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`Relatório gravado em ${outputPath}`);

  const targetResult = results.find((result) => result.model === TARGET_MODEL);
  const targetQualityPassed = Boolean(
    targetResult &&
    targetResult.status === 'success' &&
    (targetResult.qualityChecks as { passed?: boolean } | undefined)?.passed === true
  );
  if (!targetQualityPassed) {
    console.error(`Target model ${TARGET_MODEL} did not pass the live API + editorial smoke test.`);
    process.exitCode = 1;
  } else {
    console.log(`Target model ${TARGET_MODEL} passed the live API + editorial smoke test.`);
  }
  if (!results.some((result) => result.status === 'success')) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Falha no benchmark:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
