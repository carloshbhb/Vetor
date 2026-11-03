import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.GROQ_API_KEY?.trim();
const BASE_URL = "https://api.groq.com/openai/v1";
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_COMPLETION_TOKENS = 1_800;
const TARGETS = [
  { label: "GPT OSS 120B", id: "openai/gpt-oss-120b" },
  { label: "GPT OSS 20B", id: "openai/gpt-oss-20b" },
  { label: "Qwen 3.8 27B", id: "qwen/qwen3.8-27b" },
];

const systemPrompt = [
  "Você é editor técnico e especialista em reviews SEO para o site brasileiro Vetor.blog.",
  "Escreva em português brasileiro natural. Não invente testes realizados, preços atuais, fontes, citações ou especificações além dos fatos fornecidos.",
  "Diferencie fatos fornecidos de recomendações editoriais. Não alegue experiência prática real.",
  "Use parágrafos curtos, subtítulos claros e análise útil para quem está decidindo comprar.",
].join(" ");

const userPrompt = `Crie uma amostra editorial comparável para avaliar modelos de IA. Produto: Samsung Galaxy Fit3.
Fatos confirmados que você pode usar: tela AMOLED de 1,6 polegada; autonomia anunciada de até 13 dias, variável conforme o uso; resistência à água de 5 ATM; monitoramento de SpO2; não possui GPS integrado.
Não invente preço, medições próprias, testes práticos, avaliações de compradores nem especificações adicionais.
Entregue um mini-review de aproximadamente 450 a 600 palavras com: (1) título SEO, (2) meta description de até 155 caracteres, (3) resumo da proposta, (4) tela e uso diário, (5) bateria e limitações, (6) para quem vale a pena, (7) três prós e dois contras, (8) veredito equilibrado. Use Markdown.
Esta é apenas uma avaliação offline: não publique nem salve o texto em qualquer serviço.`;

function quality(output) {
  const words = output.trim() ? output.trim().split(/\s+/).length : 0;
  const checks = {
    sufficientLength: words >= 350,
    productSpecific: /galaxy fit3/i.test(output) && /amoled|tela/i.test(output) && /bateria|autonomia/i.test(output) && /gps/i.test(output),
    structuredSections: (output.match(/(^|\n)\s{0,3}(?:#{1,6}\s|\*\*[^*\n]{3,}\*\*)/gim) || []).length >= 3,
    includesProsAndCons: /pr[oó]s|vantagens/i.test(output) && /contras|limita[cç][oõ]es/i.test(output),
    includesVerdict: /veredito|vale a pena/i.test(output),
    metadataPresent: /meta[- ]?description|meta descri[cç][aã]o|descri[cç][aã]o meta/i.test(output),
    avoidsUnsupportedTestClaims: !/em nossos testes|nos nossos testes|testamos|medimos/i.test(output),
  };
  return { wordCount: words, checks: { ...checks, passed: Object.values(checks).every(Boolean) } };
}

async function request(url, init) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        continue;
      }
      return response;
    } catch (error) {
      last = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw last ?? new Error("Request failed");
}

async function main() {
  if (!API_KEY) throw new Error("GROQ_API_KEY não está disponível nos GitHub Actions Secrets.");
  const headers = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

  console.log("Consultando catálogo oficial de modelos Groq...");
  const catalogResponse = await request(`${BASE_URL}/models`, { headers });
  if (!catalogResponse.ok) {
    throw new Error(`GET /models retornou HTTP ${catalogResponse.status}: ${(await catalogResponse.text()).slice(0, 500)}`);
  }
  const catalog = await catalogResponse.json();
  const available = new Set((catalog.data ?? []).filter(m => m.active !== false).map(m => m.id));
  console.log(`Catálogo consultado: ${available.size} modelos ativos/listados.`);

  const results = [];
  for (const target of TARGETS) {
    if (!available.has(target.id)) {
      results.push({ ...target, status: "not_listed", elapsedMs: 0, error: "Model ID ausente no catálogo /models desta conta." });
      console.log(`[NOT LISTED] ${target.id}`);
      continue;
    }

    const started = Date.now();
    console.log(`[START] ${target.id}`);
    try {
      const response = await request(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: target.id,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          reasoning_effort: "low",
        }),
      });
      const elapsedMs = Date.now() - started;
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        results.push({ ...target, status: "failed", httpStatus: response.status, elapsedMs, error: JSON.stringify(body).slice(0, 1200) });
        console.log(`[FAIL] ${target.id}: HTTP ${response.status} em ${elapsedMs} ms`);
        continue;
      }

      const output = body.choices?.[0]?.message?.content ?? "";
      if (!output.trim()) {
        results.push({ ...target, status: "empty_response", elapsedMs, usage: body.usage ?? null, output });
        console.log(`[EMPTY] ${target.id}: ${elapsedMs} ms`);
        continue;
      }
      const evaluated = quality(output);
      results.push({
        ...target, status: "success", elapsedMs, ...evaluated,
        usage: body.usage ?? null, finishReason: body.choices?.[0]?.finish_reason ?? null,
        output,
      });
      console.log(`[OK] ${target.id}: ${elapsedMs} ms; ${evaluated.wordCount} palavras; quality ${evaluated.checks.passed ? "PASS" : "REVIEW"}`);
    } catch (error) {
      results.push({ ...target, status: "failed", elapsedMs: Date.now() - started, error: String(error).slice(0, 1000) });
      console.log(`[FAIL] ${target.id}: ${String(error).slice(0, 250)}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    provider: "Groq",
    endpoint: BASE_URL,
    mode: "same prompt, sequential requests; no production integration, publication, or database writes",
    catalog: { listedActiveCount: available.size, targetModels: TARGETS.map(m => ({ ...m, listed: available.has(m.id) })) },
    settings: { timeoutMs: REQUEST_TIMEOUT_MS, maxCompletionTokens: MAX_COMPLETION_TOKENS, reasoningEffort: "low", retries: 1 },
    totals: {
      requested: TARGETS.length,
      succeeded: results.filter(r => r.status === "success").length,
      qualityPassed: results.filter(r => r.checks?.passed).length,
      failed: results.filter(r => r.status === "failed").length,
      empty: results.filter(r => r.status === "empty_response").length,
      notListed: results.filter(r => r.status === "not_listed").length,
    },
    manualReviewRubric: [
      { criterion: "Precisão técnica e ausência de fatos inventados", weightPercent: 30 },
      { criterion: "Qualidade editorial em português", weightPercent: 25 },
      { criterion: "Cumprimento da estrutura SEO solicitada", weightPercent: 20 },
      { criterion: "Profundidade e equilíbrio da análise", weightPercent: 15 },
      { criterion: "Latência e consumo de tokens", weightPercent: 10 },
    ],
    models: results,
    note: "Checks automáticos são triagem, não avaliação editorial final. Verifique o texto completo antes de escolher um modelo.",
  };

  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(path.join("artifacts", "groq-model-benchmark.json"), JSON.stringify(report, null, 2) + "\n");
  const rows = results.map(r => {
    const u = r.usage ?? {};
    return `| ${r.id} | ${r.status} | ${r.httpStatus ?? "—"} | ${r.elapsedMs} | ${r.wordCount ?? 0} | ${u.prompt_tokens ?? "—"}/${u.completion_tokens ?? "—"} | ${r.checks ? (r.checks.passed ? "PASS" : "REVIEW") : "—"} |`;
  });
  const markdown = [
    "# Groq Model Benchmark", "", `Generated: ${report.generatedAt}`, "",
    `- Models requested: ${TARGETS.length}`,
    `- Successful responses: ${report.totals.succeeded}`,
    `- Quality passes: ${report.totals.qualityPassed}`,
    `- Failed: ${report.totals.failed}; empty: ${report.totals.empty}; not listed: ${report.totals.notListed}`, "",
    "| Model | Status | HTTP | Latency (ms) | Words | Tokens (prompt/completion) | Quality |",
    "|---|---|---:|---:|---:|---:|---|", ...rows, "",
    "Automated checks are screening signals only. Review complete outputs in the JSON artifact.",
  ].join("\n");
  fs.writeFileSync(path.join("artifacts", "groq-model-benchmark.md"), markdown + "\n");
  console.log(`Benchmark concluído: ${report.totals.succeeded}/${TARGETS.length} respostas.`);
  if (report.totals.succeeded === 0) process.exitCode = 1;
}

main().catch(error => { console.error(error.message ?? String(error)); process.exit(1); });
