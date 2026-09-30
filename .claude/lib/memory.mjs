import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentDB, NightlyLearner } from 'agentdb';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CONFIG_PATH = path.join(HERE, '..', 'memory-config.json');

const DB_PATH = process.env.AGENTDB_PATH || path.join(ROOT, '.agentdb.db');
const LEARNINGS_PATH = process.env.LEARNINGS_PATH || path.join(ROOT, 'LEARNINGS.md');
const RULES_PATH = process.env.RULES_PATH || path.join(ROOT, 'AGENTS.md');
const RULES_SECTION = '## Regras promovidas (auto)';

const PROMOTE_MIN_OCCURRENCES = 3;
const DEFAULT_THRESHOLD = 0.85;

const DOMAIN_KEYWORDS = [
  ['seo-optimization', ['seo', 'rank', 'keyword', 'schema', 'sitemap', 'indexnow', 'backlink']],
  ['conversion-optimization', ['convert', 'cta', 'affiliate', 'conversão', 'funil', 'checkout']],
  ['mercadolivre-affiliate', ['mercadolivre', 'mercado livre', 'ml-', ' afiliad']],
  ['nextjs-performance', ['next', 'build', 'lint', 'typecheck', 'core web vitals', 'bundle', 'cls']],
  ['design-system', ['design', 'ui', 'component', 'tailwind', 'layout']],
  ['content-generation', ['content', 'article', 'review', 'artigo', 'review', 'vídeo', 'viral']],
];

const TAG_MAP = {
  seo: ['seo', 'ranking', 'keywords'],
  cta: ['cta', 'conversion', 'affiliate'],
  ml: ['mercadolivre', 'affiliate', 'tracking'],
  next: ['nextjs', 'react', 'typescript'],
  design: ['ui', 'components', 'minimalist'],
  content: ['articles', 'reviews', 'viral'],
  performance: ['optimization', 'speed', 'core-web-vitals'],
  build: ['build', 'ci', 'lint', 'typecheck'],
  deploy: ['vercel', 'deploy', 'indexnow'],
};

let _agent = null;

function clamp01(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function randId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadDomains() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (Array.isArray(config.domains) && config.domains.length > 0) return config.domains;
  } catch {}
  return ['code-quality'];
}

export function inferDomain(text) {
  const lower = String(text ?? '').toLowerCase();
  for (const [domain, keywords] of DOMAIN_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return domain;
  }
  return 'code-quality';
}

export function extractTags(text) {
  const lower = String(text ?? '').toLowerCase();
  const tags = [];
  for (const [keyword, tagList] of Object.entries(TAG_MAP)) {
    if (lower.includes(keyword)) tags.push(...tagList);
  }
  return [...new Set(tags)];
}

async function getAgent() {
  if (!_agent) {
    _agent = new AgentDB({ dbPath: DB_PATH });
    await _agent.initialize();
    for (const name of ['reflexion', 'skills']) {
      const controller = _agent.getController(name);
      if (controller) controller.vectorBackend = null;
    }
  }
  return _agent;
}

export async function closeMemory() {
  if (_agent) {
    await _agent.close();
    _agent = null;
  }
}

function appendLearnings({ id, date, domain, text, evidence, confidence, success }) {
  const header = `# Lições aprendidas (LEARNINGS.md)\n\nEspelho legível do AgentDB (fonte canônica: .agentdb.db).\nGerado por .claude/lib/memory.mjs - não editar linhas geradas à mão.\n`;
  if (!fs.existsSync(LEARNINGS_PATH)) fs.writeFileSync(LEARNINGS_PATH, header);
  const status = success ? 'sucesso' : 'falha';
  const evidenceLine = evidence ? `\n  Evidência: ${evidence}` : '';
  fs.appendFileSync(
    LEARNINGS_PATH,
    `\n### ${date} · ${domain} · #${id}\n${text}${evidenceLine}\n  Confiança: ${Number(confidence).toFixed(2)} · ${status}\n`
  );
}

export async function storeLesson(lesson) {
  const text = lesson?.lesson;
  if (!text) throw new Error('storeLesson: campo "lesson" (texto) é obrigatório');
  const confidence = clamp01(lesson.confidence ?? 0.5);
  const success = lesson.success !== false;
  const domain = loadDomains().includes(lesson.domain) ? lesson.domain : inferDomain(text);
  const agent = await getAgent();
  const id = await agent.getController('reflexion').storeEpisode({
    sessionId: `lesson-${randId()}`,
    task: String(text),
    critique: lesson.evidence ? String(lesson.evidence) : undefined,
    reward: confidence,
    success,
    tags: Array.isArray(lesson.tags) ? lesson.tags : extractTags(text),
    metadata: { kind: 'lesson', domain, success, confidence },
  });
  appendLearnings({
    id,
    date: today(),
    domain,
    text: String(text),
    evidence: lesson.evidence ? String(lesson.evidence) : '',
    confidence,
    success,
  });
  return id;
}

export async function storePattern(pattern) {
  const trigger = pattern?.trigger;
  if (!trigger) throw new Error('storePattern: campo "trigger" é obrigatório');
  const confidence = clamp01(pattern.confidence ?? 0.5);
  const success = pattern.success !== false;
  const domain = pattern.domain
    ? String(pattern.domain)
    : inferDomain(`${trigger} ${pattern.response ?? ''}`);
  const agent = await getAgent();
  const id = await agent.getController('reflexion').storeEpisode({
    sessionId: `pattern-${randId()}`,
    task: `pattern:${domain}`,
    critique: JSON.stringify({
      trigger: String(trigger),
      response: pattern.response ?? '',
      context: pattern.context ?? {},
      storedAt: Date.now(),
    }),
    reward: confidence,
    success,
    metadata: { kind: 'pattern', domain, success, confidence },
  });
  return id;
}

export async function queryLessons({ task, k = 5, minReward, onlyFailures, onlySuccesses } = {}) {
  if (!task) throw new Error('queryLessons: campo "task" é obrigatório');
  const agent = await getAgent();
  const episodes = await agent.getController('reflexion').retrieveRelevant({
    task: String(task),
    k,
    minReward,
    onlyFailures,
    onlySuccesses,
  });
  return episodes.map(({ embedding, ...rest }) => rest);
}

export async function consolidateMemory(config = {}) {
  const agent = await getAgent();
  return agent.getController('skills').consolidateEpisodesIntoSkills({
    minAttempts: config.minAttempts ?? 3,
    minReward: config.minReward ?? 0.6,
    timeWindowDays: config.timeWindowDays ?? 30,
    extractPatterns: config.extractPatterns ?? true,
  });
}

export async function train(config = {}) {
  const agent = await getAgent();
  let causalEdges = 0;
  try {
    const learner = new NightlyLearner(agent.database, agent.embedder, {});
    const discovered = await learner.discover({
      minAttempts: config.minAttempts ?? 3,
      minSuccessRate: config.minSuccessRate ?? 0.6,
      minConfidence: config.minConfidence ?? 0.7,
      dryRun: false,
    });
    causalEdges = Array.isArray(discovered) ? discovered.length : 0;
  } catch (error) {
    console.warn(`train: descoberta causal pulada (${error.message})`);
  }
  const consolidated = await consolidateMemory(config);
  return { causalEdges, consolidated };
}

export async function getMemoryStats() {
  const agent = await getAgent();
  const row = agent.database
    .prepare(
      `SELECT
        SUM(CASE WHEN session_id LIKE 'lesson-%' THEN 1 ELSE 0 END) AS lessons,
        SUM(CASE WHEN session_id LIKE 'pattern-%' THEN 1 ELSE 0 END) AS patterns
      FROM episodes`
    )
    .get();
  return { totalLessons: row?.lessons ?? 0, totalPatterns: row?.patterns ?? 0 };
}

function appendRulesSection(lines) {
  if (!fs.existsSync(RULES_PATH)) fs.writeFileSync(RULES_PATH, `# AGENTS.md\n`);
  let content = fs.readFileSync(RULES_PATH, 'utf8');
  if (!content.includes(RULES_SECTION)) {
    content += `\n${RULES_SECTION}\n\n> Regras geradas pelo ciclo de aprendizado (3+ ocorrências e confiança média >= 0.85). Não editar linhas geradas à mão; remova a linha se não concordar.\n`;
  }
  content += lines.join('\n');
  fs.writeFileSync(RULES_PATH, content.endsWith('\n') ? content : `${content}\n`);
}

export async function promoteHighConfidenceLessons(threshold = DEFAULT_THRESHOLD) {
  const agent = await getAgent();
  const db = agent.database;
  const groups = db
    .prepare(
      `SELECT json_extract(metadata, '$.domain') AS domain,
              COUNT(*) AS occurrences,
              AVG(reward) AS avg_confidence,
              AVG(success) AS avg_success,
              MAX(id) AS latest_id,
              GROUP_CONCAT(id) AS ids
       FROM episodes
       WHERE session_id LIKE 'lesson-%'
         AND json_extract(metadata, '$.kind') = 'lesson'
         AND json_extract(metadata, '$.promoted') IS NULL
       GROUP BY json_extract(metadata, '$.domain')
       HAVING occurrences >= ? AND avg_confidence >= ? AND avg_success >= ?`
    )
    .all(PROMOTE_MIN_OCCURRENCES, clamp01(threshold), clamp01(threshold));

  const promoted = [];
  for (const group of groups) {
    const latest = db.prepare('SELECT id, task FROM episodes WHERE id = ?').get(group.latest_id);
    if (!latest) continue;
    const date = today();
    appendRulesSection([
      `- [${date}] (${group.domain}) ${latest.task} - confiança ${Number(group.avg_confidence).toFixed(2)} em ${group.occurrences} ocorrências [lesson #${latest.id}]`,
    ]);
    const ids = String(group.ids).split(',').map(Number);
    db.prepare(
      `UPDATE episodes SET metadata = json_set(metadata, '$.promoted', ?) WHERE id IN (${ids.map(() => '?').join(',')})`
    ).run(date, ...ids);
    promoted.push(latest.id);
  }
  return promoted;
}
