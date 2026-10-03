import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { chatCompletion } from '../src/lib/llm-provider';
import { getAllReviews } from '../src/lib/supabase';
import type { Review, ReviewSection } from '../src/lib/types';

config({ path: '.env.local' });

// Uso:
//   npx tsx scripts/rewrite-review-sections.ts --dry-run --only=slug-1,slug-2 [--provider=gemini]
//   npx tsx scripts/rewrite-review-sections.ts --apply [--limit=N] [--offset=N] [--force] [--concurrency=N] [--provider=gemini]
// Sem --apply nada é gravado. Progresso em tmp/rewrite-progress.json (reruns pulam prontos).
// --provider força um provedor (apaga as outras chaves só no processo): openrouter|gemini|groq|openai.

const SYSTEM_PROMPT = `Você é um editor sênior de e-commerce brasileiro (pt-BR), especialista em reviews que convertem sem mentir.

TAREFA: reescrever o "content" de uma ÚNICA seção de um review para leitura agradável, mantendo TODOS os fatos.

REGRAS INVIOLÁVEIS (violar = resposta rejeitada):
1. NUNCA invente especificações, números, preços, medidas, modelos, testes, comparações ou prêmios. Tudo que é fato precisa já existir no texto original.
2. Preserve todos os números, preços (R$), medidas, nomes de produtos/recursos e URLs do original.
3. Mantenha o MESMO section id (copie verbatim) e heading. Reescreva SÓ o "content".
4. O texto original pode vir em HTML (<p>, <ul>, <li>, <strong>). Converta TUDO para markdown e NUNCA devolva HTML:
   - <p>...</p> vira parágrafo normal; seções separadas por linha em branco.
   - <ul><li>x</li><li>y</li></ul> vira lista "- x" / "- y" (uma linha por item, sem marcadores extras).
   - <ol><li>x</li></ol> vira lista "1. x" / "2. y" (renumere em ordem).
   - <strong>x</strong> vira **x**.
   - "> " no início da linha vira destaque; "![alt](url)" é a única forma de imagem.
   - NUNCA use < ou > fora do "> " de destaque e das imagens markdown.
5. Responda SÓ com JSON válido: {"id":"...","content":"..."}. mesmo id.

ESTILO (leitura agradável + intenção de compra honesta):
- Varie o início das frases: nunca 3 frases seguidas começando com o mesmo sujeito ("O X... / Ele... / O X..."). Combine frases curtas robotizadas em períodos fluidos.
- Parágrafos de 3 a 5 frases. Frases de 8 a 22 palavras; nenhuma acima de 28.
- Corte enchimento sem informação ("é um grande diferencial", "solução completa", "vale cada centavo", "prioriza a experiência do usuário"). Se uma frase não diz nada verificável, reescreva com fato ou corte.
- Tom de consultor honesto: reconheça limitações (elas vendem credibilidade), traduza specs em benefício prático ("o que isso muda no seu dia a dia").
- Pode ADICIONAR até 2 frases por seção com orientação genérica de compra coerente com os prós/contras/veredicto (ex.: para quem serve, o que checar antes de comprar). Nada específico que não esteja no original.
- Feche seções de análise com 1 frase de encaminhamento para decisão (ver preço, comparar alternativa) quando natural.
- Segunda pessoa ("você") com moderação; alterne com formas impessoais.`;

type Args = {
  apply: boolean;
  dryRun: boolean;
  limit?: number;
  offset?: number;
  only?: string[];
  force: boolean;
  concurrency: number;
  provider?: string;
  model?: string;
  delayMs: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    // Aceita --name=valor e --name valor.
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.split('=').slice(1).join('=');
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--')) {
      return argv[idx + 1];
    }
    return undefined;
  };
  return {
    apply: argv.includes('--apply'),
    dryRun: !argv.includes('--apply'),
    limit: get('limit') ? Number(get('limit')) : undefined,
    offset: get('offset') ? Number(get('offset')) : 0,
    only: get('only') ? get('only')!.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    force: argv.includes('--force'),
    concurrency: Math.max(1, Number(get('concurrency') || 3)),
    provider: get('provider'),
    model: get('model'),
    delayMs: Math.max(0, Number(get('delay-ms') || 0)),
  };
}

// Conteúdo fino demais não dá para reescrever sem inventar (vai para geração, não reescrita).
const MIN_CHARS = 300;

const PROGRESS_PATH = path.join(__dirname, '..', 'tmp', 'rewrite-progress.json');

function loadProgress(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveProgress(p: Record<string, string>) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

export function digitRuns(text: string): string[] {
  return text.match(/\d+/g) || [];
}

export function urls(text: string): string[] {
  return text.match(/https?:\/\/\S+/g) || [];
}

// Fechos genéricos de intenção de compra permitidos (lista fechada).
// Qualquer frase nova que não seja paráfrase precisa ser EXATAMENTE uma destas.
export const MENU_CLOSES = [
  'Confira o preço atual e compare com as alternativas antes de decidir.',
  'Se esse perfil combina com você, vale acompanhar as ofertas.',
  'Para esse perfil de uso, o custo-benefício se confirma na comparação direta.',
  'Na dúvida entre dois modelos, o comparativo lado a lado ajuda a bater o martelo.',
];

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú"“'(\d💡>])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function trigrams(s: string): Set<string> {
  const t = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const set = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) set.add(t.slice(i, i + 3));
  return set;
}

export function trigramJaccard(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((g) => {
    if (B.has(g)) inter++;
  });
  return inter / (A.size + B.size - inter);
}

// Entidades capitalizadas no meio de frase (marcas, lojas, recursos próprios).
// Exclui primeira palavra de cada sentença (capitalização natural).
const STOP_CAP = new Set(
  'O A Os As Um Uma Em De Do Da Na No Se Que Para Com Por Ele Ela Este Esta Esse Essa Isso Você Seu Sua Nos Nas Dos Das Ao Além Como Quando Onde Qual Quais Quanto Tudo Todo Toda Nada Cada Outro Outra Mesmo Mesma Tal Tanto Muito Muita Pouco Pouca Certo Certa Grande Pequeno Pequena Melhor Pior Maior Menor Primeiro Primeira Sim Não Mais Menos Bem Ainda Já Também Até Desde Durante Entre Sobre Após Antes Depois Sem Sob Além Conforme Segundo Embora Enquanto Porque Contudo Entretanto Todavia Porém Logo Portanto Então Assim Dessa Deste Desse Nesta Neste Nesse Nessa Nesses Nessas Destes Destas Isto Ele Ela Eles Elas Nós Você Vocês Sr Sra Dr Dra'.split(
    ' '
  )
);

export function midCaps(text: string): string[] {
  const out = new Set<string>();
  for (const s of splitSentences(text)) {
    const words = s.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9®™-]+/g) || [];
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/^[“"']+|[”"'.:,;!?®™]+$/g, '');
      if (w.length > 2 && /^[A-ZÀ-Ú]/.test(w) && !STOP_CAP.has(w)) out.add(w);
    }
  }
  return Array.from(out);
}

// Entidades novas na seção reescrita que não existem na original (ex.: loja,
// marca ou recurso inventados). Calibrado: rewrite bom = 0; invencionices = >=1.
export function novelEntities(origContent: string, newContent: string): string[] {
  const origLower = origContent.toLowerCase();
  return midCaps(newContent).filter((w) => !origLower.includes(w.toLowerCase()));
}

// Helpers de normalização (unidades de medida) para checagem de fatos.
const UNIT_ALIASES: Record<string, string> = {
  centimetro: 'cm', centimetros: 'cm',
  milimetro: 'mm', milimetros: 'mm',
  metro: 'm', metros: 'm',
  minuto: 'min', minutos: 'min',
  segundo: 'seg', segundos: 'seg',
  hora: 'h', horas: 'h',
  polegada: 'pol', polegadas: 'pol',
  grama: 'g', gramas: 'g',
  quilo: 'kg', quilos: 'kg',
  litro: 'l', litros: 'l',
  mililitro: 'ml', mililitros: 'ml',
  decibel: 'db', decibeis: 'db',
  watt: 'w', watts: 'w',
};

function normWord(w: string): string {
  const base = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return UNIT_ALIASES[base] || base;
}

function wordTokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z\u00e0-\u00f6\u00f8-\u00ff]+/g) || []).map(normWord);
}

// Só contam como fato: dígitos, entidades capitalizadas e unidades de medida.
// Adjetivos/enchimento em minúsculas ("destaque", "poderoso") podem ser cortados.
export function reviewFactTokens(sections: Array<{ content?: string }>): string[] {
  const allS = sections.flatMap((st) => splitSentences(st.content || ''));
  const factS = allS.filter((st) => !st.trim().startsWith('\u{1F4A1}'));
  if (factS.length === 0) return [];
  const df = new Map<string, number>();
  for (const st of factS) {
    new Set(wordTokens(st)).forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  }
  const boiler = new Set<string>();
  df.forEach((n, t) => {
    if (n / factS.length > 0.3) boiler.add(t);
  });
  const facts = new Set<string>();
  for (const st of factS) {
    for (const d of st.match(/\d+/g) || []) facts.add(d);
    for (const w of midCaps(st)) {
      const key = normWord(w);
      if (!boiler.has(key)) facts.add(w.toLowerCase());
    }
    new Set(wordTokens(st)).forEach((t) => {
      if (UNIT_ALIASES[t] && !boiler.has(t) && !boiler.has(UNIT_ALIASES[t])) {
        facts.add(UNIT_ALIASES[t]);
      }
    });
  }
  return Array.from(facts);
}

export function factCoverageIssues(
  original: Array<{ content?: string }>,
  rewritten: Array<{ content?: string }>
): string[] {
  const facts = reviewFactTokens(original);
  if (facts.length === 0) return [];
  const out = new Set<string>();
  for (const st of rewritten.flatMap((x) => splitSentences(x.content || ''))) {
    for (const d of st.match(/\d+/g) || []) out.add(d);
    for (const w of midCaps(st)) out.add(w.toLowerCase());
    for (const t of wordTokens(st)) out.add(t);
  }
  const missing = facts.filter((t) => !out.has(t));
  if (missing.length === 0) return [];
  return ['fatos do original sumiram no rewrite (' + missing.length + '): ' + missing.slice(0, 8).join(', ')];
}

export function menuClosesUsed(newContent: string): number {
  return splitSentences(newContent).filter((s) => MENU_CLOSES.includes(s.trim())).length;
}

/** Direção crítica: nada no output pode conter dígito que não exista no input (anti-invenção).
 *  Checagem por presença (conjunto), não por contagem: repetir um número legítimo
 *  não é invenção; só rejeita runs de dígito ausentes do original da seção. */
function digitsSubsetOf(output: string, input: string): { ok: boolean; missing: string[] } {
  const inSet = new Set(digitRuns(input));
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const run of digitRuns(output)) {
    if (!inSet.has(run) && !seen.has(run)) {
      seen.add(run);
      missing.push(run);
    }
  }
  return { ok: missing.length === 0, missing };
}

export function validate(
  original: ReviewSection[],
  rewritten: Array<{ id?: string; content?: string }>
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(rewritten) || rewritten.length !== original.length) {
    return { ok: false, errors: [`seções: esperado ${original.length}, veio ${rewritten?.length}`] };
  }
  const origText = original.map((s) => s.content || '').join('\n');
  const newText = rewritten.map((s) => s.content || '').join('\n');
  for (let i = 0; i < original.length; i++) {
    if (rewritten[i].id !== original[i].id) {
      errors.push(`seção ${i}: id mudou (${original[i].id} → ${rewritten[i].id})`);
    }
    const content = rewritten[i].content || '';
    const origContent = original[i].content || '';
    // Seção vazia no original não tem lastro: exigir output vazio evita filler inventado.
    if (origContent.trim().length === 0) {
      if (content.trim().length > 0) {
        errors.push(`seção ${original[i].id}: original vazio, rewrite inventou conteúdo`);
      }
      continue;
    }
    if (content.trim().length < 20) errors.push(`seção ${original[i].id}: conteúdo vazio/curto`);
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (t.includes('<')) errors.push(`seção ${original[i].id}: contém '<' (HTML proibido)`);
      if (t.includes('>') && !t.startsWith('> ') && !t.includes('![')) {
        errors.push(`seção ${original[i].id}: contém '>' fora de callout/imagem`);
      }
    }
    // Dígitos por seção (fecha o vazamento entre seções: "450 ml" virando "Snapdragon 450").
    const secDigits = digitsSubsetOf(content, origContent);
    if (!secDigits.ok) {
      errors.push(`seção ${original[i].id}: dígitos inventados: ${secDigits.missing.join(', ')}`);
    }
    // Entidades novas (marcas, lojas, recursos inventados).
    const novel = novelEntities(origContent, content);
    if (novel.length > 0) {
      errors.push(`seção ${original[i].id}: entidades novas: ${novel.join(', ')}`);
    }
  }
  const digits = digitsSubsetOf(newText, origText);
  if (!digits.ok) errors.push(`dígitos inventados: ${digits.missing.join(', ')}`);
  // Fatos distintivos do review inteiro precisam sobreviver em algum lugar do rewrite.
  for (const issue of factCoverageIssues(original, rewritten)) {
    errors.push(issue);
  }
  for (const u of urls(origText)) {
    if (!newText.includes(u)) errors.push(`URL removida: ${u.slice(0, 60)}`);
  }
  const origLen = origText.length;
  const newLen = newText.length;
  if (origLen > 0 && (newLen < origLen * 0.6 || newLen > origLen * 1.5)) {
    errors.push(`tamanho fora da faixa (orig ${origLen} → novo ${newLen})`);
  }
  return { ok: errors.length === 0, errors };
}

function buildUserPrompt(review: Review, section: ReviewSection): string {
  const ctx = [
    `Produto: ${review.product}`,
    `Categoria: ${review.category}`,
    `Veredicto: ${review.verdict_label || ''} — ${review.verdict_text || ''}`.trim(),
    `Prós: ${(review.pros || []).join(' | ')}`,
    `Contras: ${(review.cons || []).join(' | ')}`,
  ].join('\n');

  const secPrompt = JSON.stringify(
    { id: section.id, heading: section.heading, content: section.content },
    null,
    1
  );

  const allowedDigits = Array.from(new Set(digitRuns(section.content))).join(', ') || 'nenhum';

  return `${ctx}\n\nNúmeros que existem nesta seção (qualquer outro número é proibido): ${allowedDigits}.\nPreserve termos técnicos e nomes próprios em inglês exatamente como no original (ex.: Smart Dynamic Navigation).\nREESCREVA APENAS A SEÇÃO ABAIXO, MANTENDO O MESMO ID "${section.id}" E TODOS OS FATOS:\n${secPrompt}`;
}

function tryParseSections(text: string): Array<{ id: string; content: string }> | null {
  try {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : parsed.sections;
    if (Array.isArray(arr)) {
      return arr.map((s) => ({ id: String(s.id ?? ''), content: String(s.content ?? '') }));
    }
    // Formato singular: {"id":"...","content":"..."}
    if (parsed && typeof parsed === 'object' && 'id' in parsed && 'content' in parsed) {
      return [{ id: String(parsed.id), content: String(parsed.content) }];
    }
    return null;
  } catch {
    return null;
  }
}

function extractSections(raw: string): Array<{ id: string; content: string }> | null {
  // 1) direto; 2) sem fences; 3) maior bloco {...} (ignora preâmbulo/posfácio).
  const direct = tryParseSections(raw.trim());
  if (direct) return direct;
  const noFences = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const unfenced = tryParseSections(noFences);
  if (unfenced) return unfenced;
  const start = noFences.indexOf('{');
  const end = noFences.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return tryParseSections(noFences.slice(start, end + 1));
  }
  return null;
}

type RewriteResult = {
  ok: boolean;
  errors: string[];
  sections?: Array<{ id: string; content: string }>;
  wordRatio?: number;
};

async function rewriteReview(review: Review, model?: string): Promise<RewriteResult> {
  const sections = review.sections || [];
  if (sections.length === 0) return { ok: false, errors: ['sem seções'] };

  // Erros transitórios (429/5xx/overload): espera e tenta de novo sem gastar attempt.
  async function callWithRetry(userPrompt: string, maxTokens: number): Promise<string> {
    let lastError: unknown = null;
    let useJson = true;
    for (let r = 0; r < 6; r++) {
      try {
        return await chatCompletion({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
          temperature: 0.5,
          maxTokens,
          ...(model ? { model } : {}),
          ...(useJson ? { responseFormat: { type: 'json_object' } as const } : {}),
        });
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (useJson && /json/i.test(msg)) {
          useJson = false;
          console.log(`  json mode rejeitado, tentando sem response_format (${review.slug})`);
          continue;
        }
        if (!/429|rate|limit|500|502|503|overload|timeout|ECONN|connection|socket|fetch failed|terminat/i.test(msg) || r === 5) throw err;
        const waitMs = 5000 * (r + 1);
        console.log(`  retry ${r + 1}/5 em ${waitMs}ms (${review.slug}): ${msg.slice(0, 100)}`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    throw lastError;
  }

  const done: Array<{ id: string; content: string }> = [];

  for (const section of sections) {
    const sectionMaxTokens = Math.min(
      8000,
      Math.max(4000, Math.ceil((section.content || '').length * 1.5))
    );

    let ok = false;
    let lastErrors: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const correction =
        attempt === 2
          ? `\n\nATENÇÃO: sua tentativa anterior foi REJEITADA pela validação automática. Corrija EXATAMENTE estes erros sem repeti-los:\n- ${lastErrors.join('\n- ')}\nNada pode ser inventado: números, entidades e termos precisam existir no original.`
          : '';
      try {
        const raw = await callWithRetry(buildUserPrompt(review, section) + correction, sectionMaxTokens);
        const rewritten = extractSections(raw);
        if (!rewritten || rewritten.length !== 1) {
          const dbgDir = path.join(__dirname, '..', 'tmp', 'rewrite-debug');
          fs.mkdirSync(dbgDir, { recursive: true });
          fs.writeFileSync(path.join(dbgDir, `${review.slug}-${section.id}-attempt${attempt}.txt`), raw);
          lastErrors = ['parse JSON falhou (esperado objeto com 1 seção)'];
          console.log(`  seção ${section.id} attempt ${attempt}: parse JSON falhou (raw ${raw.length} chars, fim: …${raw.slice(-80).replace(/\s+/g, ' ')})`);
          continue;
        }
        if (rewritten[0].id !== section.id) {
          lastErrors = [`id divergente: esperado ${section.id}, veio ${rewritten[0].id}`];
          continue;
        }
        const v = validate([section], rewritten);
        if (v.ok) {
          done.push({ id: rewritten[0].id, content: rewritten[0].content });
          ok = true;
          break;
        }
        lastErrors = v.errors;
        const dbgDir = path.join(__dirname, '..', 'tmp', 'rewrite-debug');
        fs.mkdirSync(dbgDir, { recursive: true });
        fs.writeFileSync(path.join(dbgDir, `${review.slug}-${section.id}-attempt${attempt}-invalid.txt`), raw);
        console.log(`  seção ${section.id} attempt ${attempt}: ${v.errors.join(' | ').slice(0, 300)}`);
      } catch (err) {
        lastErrors = [err instanceof Error ? err.message : String(err)];
      }
    }

    if (!ok) {
      return { ok: false, errors: [`seção ${section.id}: ${lastErrors.join(' | ').slice(0, 300)}`] };
    }
  }

  const origLen = sections.map((s) => s.content || '').join('').length;
  const newLen = done.map((s) => s.content || '').join('').length;
  return { ok: true, errors: [], sections: done, wordRatio: origLen ? newLen / origLen : 1 };
}

async function writeBack(slug: string, sections: Array<{ id: string; content: string }>): Promise<void> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');
  // Preserva heading/tocLabel/tocEmoji: atualiza só o content por id.
  const current = await supabase.from('reviews').select('sections').eq('slug', slug).single();
  if (current.error || !current.data) throw new Error(`leitura atual falhou: ${current.error?.message}`);
  const merged = (current.data.sections || []).map((s: ReviewSection) => {
    const rw = sections.find((r) => r.id === s.id);
    return rw ? { ...s, content: rw.content } : s;
  });
  const { error } = await supabase
    .from('reviews')
    .update({ sections: merged, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .eq('status', 'published');
  if (error) throw new Error(`update falhou: ${error.message}`);
}

async function main() {
  const args = parseArgs();
  if (args.provider) {
    // Força o provedor apagando as outras chaves SÓ neste processo.
    const keep: Record<string, string> = {
      openrouter: 'OPENROUTER_API_KEY',
      gemini: 'GOOGLE_AI_API_KEY',
      groq: 'GROQ_API_KEY',
      openai: 'OPENAI_API_KEY',
      nvidia: 'NVIDIA_API_KEY',
    };
    const wanted = keep[args.provider];
    if (!wanted) throw new Error(`--provider inválido: ${args.provider}`);
    for (const key of Object.values(keep)) {
      if (key !== wanted) delete process.env[key];
    }
  }
  console.log(`modo: ${args.apply ? 'APPLY (grava no Supabase)' : 'DRY-RUN (não grava)'}`);
  // Limpa debug da execução anterior (progresso e dryruns são mantidos).
  fs.rmSync(path.join(__dirname, '..', 'tmp', 'rewrite-debug'), { recursive: true, force: true });

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) throw new Error('Supabase service key ausente');
  const { data, error } = await supabase
    .from('reviews')
    .select('slug,status,product,category,verdict_label,verdict_text,pros,cons,sections')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error || !data) throw new Error(`fetch reviews falhou: ${error?.message}`);
  let reviews = data as Review[];

  // Eufy primeiro (pedido explícito), depois o restante.
  reviews.sort((a, b) => (b.slug === 'robo-aspirador-eufy-g10-hybrid' ? 1 : 0) - (a.slug === 'robo-aspirador-eufy-g10-hybrid' ? 1 : 0));
  if (args.only) {
    const set = new Set(args.only);
    reviews = reviews.filter((r) => set.has(r.slug));
  }
  if (args.offset) reviews = reviews.slice(args.offset);
  if (args.limit) reviews = reviews.slice(0, args.limit);

  const progress = loadProgress();
  const queue = args.force ? reviews : reviews.filter((r) => !progress[r.slug]?.startsWith('done'));
  console.log(`reviews no lote: ${queue.length} (concorrência ${args.concurrency})`);

  let done = 0;
  let failed = 0;
  let skipped = 0;
  let consecutive429 = 0;
  let aborted = false;
  const failures: Array<{ slug: string; errors: string[] }> = [];

  async function worker(review: Review) {
    try {
      if (args.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, args.delayMs));
      }
      const totalChars = (review.sections || []).map((s) => s.content || '').join('').length;
      if (totalChars < MIN_CHARS) {
        skipped++;
        progress[review.slug] = `skipped-thin (${totalChars} chars)`;
        saveProgress(progress);
        console.log(`[${done + failed + skipped}/${queue.length}] ${review.slug} → ${progress[review.slug]}`);
        return;
      }
      const res = await rewriteReview(review, args.model);
      if (!res.ok) {
        failed++;
        failures.push({ slug: review.slug, errors: res.errors });
        progress[review.slug] = `failed: ${res.errors.join(' | ').slice(0, 200)}`;
      } else {
        if (args.apply && res.sections) {
          await writeBack(review.slug, res.sections);
        } else if (!args.apply && res.sections) {
          const outDir = path.join(__dirname, '..', 'tmp', 'rewrite-dryrun');
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(
            path.join(outDir, `${review.slug}.json`),
            JSON.stringify({ slug: review.slug, sections: res.sections }, null, 2)
          );
        }
        done++;
        consecutive429 = 0;
        progress[review.slug] = `done${res.wordRatio ? ` ratio=${res.wordRatio.toFixed(2)}` : ''}`;
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ slug: review.slug, errors: [message.slice(0, 200)] });
      progress[review.slug] = `failed: ${message.slice(0, 200)}`;
      if (/429|rate|limit/i.test(message)) {
        consecutive429++;
        if (consecutive429 >= 10) {
          aborted = true;
          console.log('\n⛔ 10x 429 seguidos — abortando o lote (quota esgotada). Rode de novo mais tarde; o progresso foi salvo.');
        }
      } else {
        consecutive429 = 0;
      }
    }
    saveProgress(progress);
    console.log(`[${done + failed + skipped}/${queue.length}] ${review.slug} → ${progress[review.slug]}`);
  }

  // Pool de concorrência: N workers consumindo a fila por índice.
  let cursor = 0;
  async function poolWorker() {
    while (!aborted) {
      const i = cursor++;
      if (i >= queue.length) return;
      await worker(queue[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(args.concurrency, queue.length) }, poolWorker));

  console.log(`\nOK: ${done} | finos pulados: ${skipped} | falhas: ${failed}`);
  for (const f of failures.slice(0, 20)) console.log(`  ❌ ${f.slug}: ${f.errors.join(' | ').slice(0, 160)}`);
}

// Roda main() só em execução direta (npx tsx scripts/rewrite-review-sections.ts);
// importação (ex.: check-rewrites.ts) usa só os exports.
const invokedAs = process.argv[1] || '';
if (invokedAs.endsWith('rewrite-review-sections.ts')) {
  main().catch((err) => {
    console.error('❌ Erro fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
