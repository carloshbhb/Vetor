import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vetor-memory-'));
process.env.AGENTDB_PATH = path.join(tmp, 'test.db');
process.env.LEARNINGS_PATH = path.join(tmp, 'LEARNINGS.md');
process.env.RULES_PATH = path.join(tmp, 'AGENTS.md');
fs.writeFileSync(process.env.RULES_PATH, '# AGENTS.md\n\nRegras existentes do projeto.\n');

const memory = await import('./memory.mjs');

test('inferDomain mapeia palavras-chave para domínios', () => {
  assert.equal(memory.inferDomain('melhorar rank no Google com schema FAQ'), 'seo-optimization');
  assert.equal(memory.inferDomain('aumentar conversão do CTA na review'), 'conversion-optimization');
  assert.equal(memory.inferDomain('link de afiliado do mercado livre'), 'mercadolivre-affiliate');
  assert.equal(memory.inferDomain('next build quebrou o lint'), 'nextjs-performance');
  assert.equal(memory.inferDomain('componente de design system'), 'design-system');
  assert.equal(memory.inferDomain('artigo viral de review'), 'content-generation');
  assert.equal(memory.inferDomain('refatorar código qualquer'), 'code-quality');
});

test('extractTags retorna tags conhecidas sem duplicar', () => {
  const tags = memory.extractTags('SEO ranking e performance do next build');
  assert.ok(tags.includes('seo'));
  assert.ok(tags.includes('nextjs'));
  assert.equal(new Set(tags).size, tags.length);
});

test('storeLesson persiste episódio e espelha em LEARNINGS.md', async () => {
  const id = await memory.storeLesson({
    lesson: 'Adicionar FAQ schema nas reviews para capturar rich results',
    domain: 'seo-optimization',
    tags: ['seo'],
    confidence: 0.9,
    evidence: 'teste de gate',
    success: true,
  });
  assert.ok(Number.isInteger(id) && id > 0);

  const stats = await memory.getMemoryStats();
  assert.equal(stats.totalLessons, 1);
  assert.equal(stats.totalPatterns, 0);

  const learnings = fs.readFileSync(process.env.LEARNINGS_PATH, 'utf8');
  assert.match(learnings, /FAQ schema nas reviews/);
  assert.match(learnings, /seo-optimization/);
  assert.match(learnings, /Confiança: 0\.90/);
});

test('queryLessons recupera a lição salva', async () => {
  const results = await memory.queryLessons({ task: 'como melhorar rich results no Google' });
  assert.ok(results.length >= 1);
  assert.match(results[0].task, /FAQ schema/);
  assert.equal(results[0].metadata.domain, 'seo-optimization');
  assert.ok(!('embedding' in results[0]));
});

test('storePattern grava padrão com task pattern:<domain> e reward = confidence', async () => {
  const id = await memory.storePattern({
    trigger: 'arquivo em scripts/metrics/',
    response: 'rodar lint antes de commitar',
    domain: 'automation',
    context: { tool: 'Edit', file: 'scripts/metrics/fetch-ga4.mjs' },
    success: true,
    confidence: 0.75,
  });
  assert.ok(Number.isInteger(id) && id > 0);

  const stats = await memory.getMemoryStats();
  assert.equal(stats.totalPatterns, 1);

  const row = await (await import('./memory.mjs')).queryLessons({ task: 'pattern automation lint', k: 1 });
  assert.match(row[0].task, /^pattern:/);
  const critique = JSON.parse(row[0].critique);
  assert.equal(critique.response, 'rodar lint antes de commitar');
});

test('getMemoryStats conta lessons e patterns', async () => {
  const stats = await memory.getMemoryStats();
  assert.equal(stats.totalLessons, 1);
  assert.equal(stats.totalPatterns, 1);
});

test('promoteHighConfidenceLessons não promove com menos de 3 ocorrências', async () => {
  await memory.storeLesson({
    lesson: 'Usar internal links entre reviews irmãs',
    domain: 'seo-optimization',
    confidence: 0.9,
    success: true,
  });
  const promoted = await memory.promoteHighConfidenceLessons(0.85);
  assert.deepEqual(promoted, []);
  assert.ok(!fs.readFileSync(process.env.RULES_PATH, 'utf8').includes('Regras promovidas'));
});

test('promoteHighConfidenceLessons promove domínio com 3 lições confiáveis e não duplica', async () => {
  await memory.storeLesson({
    lesson: 'Inserir FAQ schema com pergunta real do usuário nas reviews',
    domain: 'seo-optimization',
    confidence: 0.95,
    success: true,
  });
  const promoted = await memory.promoteHighConfidenceLessons(0.85);
  assert.equal(promoted.length, 1);
  assert.ok(Number.isInteger(promoted[0]) && promoted[0] > 0);

  const rules = fs.readFileSync(process.env.RULES_PATH, 'utf8');
  assert.match(rules, /## Regras promovidas \(auto\)/);
  assert.match(rules, /\(seo-optimization\)/);
  assert.match(rules, /FAQ schema com pergunta real/);
  assert.match(rules, /confiança 0\.9[0-9]/);

  const again = await memory.promoteHighConfidenceLessons(0.85);
  assert.deepEqual(again, []);
  assert.equal(fs.readFileSync(process.env.RULES_PATH, 'utf8').match(/FAQ schema com pergunta real/g).length, 1);
});

test('promoteHighConfidenceLessons não promove domínio com confiança baixa', async () => {
  for (let i = 0; i < 3; i++) {
    await memory.storeLesson({
      lesson: `Tentativa fraca de indexação ${i}`,
      domain: 'code-quality',
      confidence: 0.5,
      success: true,
    });
  }
  const promoted = await memory.promoteHighConfidenceLessons(0.85);
  assert.deepEqual(promoted, []);
});

test('consolidateMemory cria skill a partir de 3 padrões repetidos', async () => {
  for (let i = 0; i < 2; i++) {
    await memory.storePattern({
      trigger: 'arquivo em scripts/',
      response: 'commitar depois do lint',
      domain: 'automation',
      success: true,
      confidence: 0.8,
    });
  }
  const result = await memory.consolidateMemory();
  assert.ok(result.created >= 1);
  assert.ok(result.patterns.length >= 1);

  const stats = await memory.getMemoryStats();
  assert.equal(stats.totalPatterns, 3);
  assert.equal(stats.totalLessons, 6);
});

test('train roda descoberta causal (best-effort) e consolida skills', async () => {
  const result = await memory.train({ minAttempts: 3 });
  assert.equal(typeof result.causalEdges, 'number');
  assert.ok(result.causalEdges >= 0);
  assert.ok(result.consolidated);
  assert.ok(result.consolidated.created + result.consolidated.updated >= 1);
});

test('closeMemory encerra a conexão sem erro', async () => {
  const stats = await memory.getMemoryStats();
  assert.ok(stats.totalLessons >= 1);
  await memory.closeMemory();
});
