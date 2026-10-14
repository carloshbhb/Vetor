import { seo } from './seo';
import { chatCompletion } from './llm-provider';
import { validateGeneratedReview } from './content-quality';
import { slugifyEditorialTitle } from './slug';
import type { ReviewHeroBar, ReviewSpec, ReviewSection, ReviewCompareTable, ReviewFaq } from './types';

// NOTA: import.meta.url não é suportado pelo bundler do Next (transpila p/ CJS).
// Em runtime, process.cwd() aponta para a raiz do projeto, onde vive /scripts.
const __dirname = process.cwd();

// ---------------------------------------------------------------------------
// Sanitizador de sinais editoriais proibidos
// (espelha FORBIDDEN_REVIEW_EDITORIAL_SIGNALS em content-quality.ts)
//
// O modelo pode escrever expressões editoriais proibidas mesmo com a lista
// no prompt — o gate reprovaria um review inteiro por uma frase só.
// Esta camada determinística reescreve cada sinal por um sinônimo seguro
// antes da validação, com match sem acento/caixa (mesma normalização do gate).
// ---------------------------------------------------------------------------
const ACCENT_CLASS: Record<string, string> = {
  a: '[aáàâãä]',
  c: '[cç]',
  e: '[eéêè]',
  i: '[iíìîï]',
  o: '[oóòôõö]',
  u: '[uúùûü]',
};

const EDITORIAL_SIGNAL_REWRITES: Array<{ phrase: string; replacement: string }> = [
  { phrase: 'temos um claro vencedor', replacement: 'há um vencedor claro' },
  { phrase: 'claro vencedor', replacement: 'vencedor' },
  { phrase: 'em nossos testes', replacement: 'na análise de especificações' },
  { phrase: 'nos nossos testes', replacement: 'na análise de especificações' },
  { phrase: 'benchmark feito por nós', replacement: 'comparativo técnico' },
  { phrase: 'testamos', replacement: 'analisamos' },
  { phrase: 'medimos', replacement: 'verificamos' },
  { phrase: 'garantimos', replacement: 'confirmamos' },
  { phrase: 'padrão ouro', replacement: 'padrão de mercado' },
  { phrase: 'escolha definitiva', replacement: 'escolha sólida' },
  { phrase: 'líder do mercado', replacement: 'destaque do mercado' },
  { phrase: 'não tem rivais à altura', replacement: 'tem poucos rivais à altura' },
  { phrase: 'compra certa', replacement: 'boa escolha' },
  { phrase: 'deve ser evitado por', replacement: 'não é indicado para' },
  { phrase: 'deve ser evitado', replacement: 'não é indicado' },
  { phrase: 'nível médico', replacement: 'nível profissional' },
  { phrase: 'clinicamente útil', replacement: 'útil no dia a dia' },
  { phrase: 'garante visibilidade perfeita', replacement: 'oferece ótima visibilidade' },
  { phrase: 'funcionam sem falhas', replacement: 'funcionam de forma consistente' },
  { phrase: 'sem engasgos', replacement: 'sem travamentos' },
].sort((a, b) => b.phrase.length - a.phrase.length); // frases maiores primeiro

const EDITORIAL_SIGNAL_RULES = EDITORIAL_SIGNAL_REWRITES.map(({ phrase, replacement }) => {
  const normalized = phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const body = normalized
    .split('')
    .map((ch) => ACCENT_CLASS[ch] ?? ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('')
    .replace(/\s+/g, '\\s+');
  // Lookarounds evitam reescrever trechos dentro de palavras maiores
  // ("detestamos"), preservando a qualidade do texto; o gate, por usar
  // includes(), só falha nesses casos se a palavra maior aparecer isolada.
  return {
    pattern: new RegExp(`(?<![\\p{L}])${body}(?![\\p{L}])`, 'giu'),
    replacement,
  };
});

export function rewriteEditorialText(text: string): string {
  let out = text;
  for (const rule of EDITORIAL_SIGNAL_RULES) {
    out = out.replace(rule.pattern, (match) => {
      let rewritten = rule.replacement;
      if (match === match.toUpperCase() && match !== match.toLowerCase()) {
        rewritten = rewritten.toUpperCase();
      } else if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
      }
      return rewritten;
    });
  }
  return out;
}

export function rewriteEditorialSignals<T>(value: T): T {
  if (typeof value === 'string') return rewriteEditorialText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => rewriteEditorialSignals(item)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteEditorialSignals(item);
    }
    return out as unknown as T;
  }
  return value;
}

interface ReviewSectionPlan {
  id: string;
  heading: string;
  tocEmoji: string;
  tocLabel: string;
  focus: string;
}

const REVIEW_SECTION_PLAN: ReviewSectionPlan[] = [
  { id: 'overview', heading: 'Visão geral e posicionamento', tocEmoji: '📝', tocLabel: 'Visão geral', focus: 'explique proposta, público-alvo, papel na categoria e quais decisões o leitor precisa tomar; responda cedo se faz sentido considerar o produto' },
  { id: 'design', heading: 'Design, construção e ergonomia', tocEmoji: '🎨', tocLabel: 'Design', focus: 'analise materiais e ergonomia somente quando houver informação sustentada; transforme ausência de dados em critérios objetivos a conferir, sem inventar observação prática' },
  { id: 'features', heading: 'Recursos e especificações', tocEmoji: '⚙️', tocLabel: 'Recursos', focus: 'explique para que servem os recursos confirmados, limites de uso, dependências e quais especificações ainda precisam ser conferidas' },
  { id: 'compatibility', heading: 'Compatibilidade e uso cotidiano', tocEmoji: '🔌', tocLabel: 'Compatibilidade', focus: 'discuta cenários de uso, compatibilidade a verificar, configuração, manutenção e limitações por perfil, sem afirmar experiência prática' },
  { id: 'alternatives', heading: 'Preço, alternativas e custo-benefício', tocEmoji: '💰', tocLabel: 'Preço e alternativas', focus: 'contextualize o preço fornecido, critérios para comparar alternativas reais e custos/condições a confirmar; nunca invente preço ou especificação concorrente' },
  { id: 'verdict', heading: 'Para quem vale a pena e veredito', tocEmoji: '✅', tocLabel: 'Veredito', focus: 'apresente recomendação condicional, perfis para quem serve/não serve, lista prática do que conferir antes da compra e conclusão equilibrada' },
];

function visibleTextForGeneration(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function countVisibleWords(value: string): number {
  const text = visibleTextForGeneration(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function parseModelJsonObject(raw: string, context: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^[\x60]{3}(?:json)?\s*/i, '').replace(/\s*[\x60]{3}$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('NVIDIA não retornou JSON para ' + context + '.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(start, end + 1));
  } catch (error) {
    throw new Error('JSON inválido em ' + context + ': ' + (error instanceof Error ? error.message : String(error)));
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('A resposta de ' + context + ' precisa ser um objeto JSON.');
  }
  return parsed as Record<string, unknown>;
}

function extractMarkedSection(raw: string, plan: ReviewSectionPlan): string | null {
  const pattern = new RegExp(
    '\\[\\[SECTION:' + plan.id + '\\]\\]([\\s\\S]*?)\\[\\[\\/SECTION:' + plan.id + '\\]\\]',
    'i',
  );
  return raw.match(pattern)?.[1]?.trim() ?? null;
}

function isCompleteSectionBatch(raw: string, plans: ReviewSectionPlan[]): boolean {
  return plans.every((plan) => {
    const body = extractMarkedSection(raw, plan);
    return !!body && countVisibleWords(body) >= 260;
  });
}

function hasCompleteReviewMetadata(raw: string): boolean {
  try {
    const value = parseModelJsonObject(raw, 'metadados editoriais');
    const nonempty = (field: unknown) => typeof field === 'string' && field.trim().length > 0;
    const specs = Array.isArray(value.specs) ? value.specs : [];
    const heroBars = Array.isArray(value.hero_bars) ? value.hero_bars : [];
    const pros = Array.isArray(value.pros) ? value.pros : [];
    const cons = Array.isArray(value.cons) ? value.cons : [];
    const faq = Array.isArray(value.faq) ? value.faq : [];
    const table = value.compare_table && typeof value.compare_table === 'object'
      ? value.compare_table as { rows?: unknown; columns?: unknown }
      : null;
    const rows = table && Array.isArray(table.rows) ? table.rows : [];
    const columns = table && Array.isArray(table.columns) ? table.columns : [];
    return nonempty(value.title) &&
      nonempty(value.description) &&
      nonempty(value.meta_title) &&
      nonempty(value.meta_description) &&
      nonempty(value.hero_lead) &&
      nonempty(value.verdict_text) &&
      nonempty(value.verdict_label) &&
      Number.isFinite(Number(value.hero_overall_score ?? value.verdict_score)) &&
      heroBars.length >= 3 && specs.length >= 4 && pros.length >= 3 &&
      cons.length >= 3 && faq.length >= 3 && rows.length >= 3 && columns.length >= 3;
  } catch {
    return false;
  }
}

function buildReviewSourceContext(product: {
  title: string;
  category: string;
  price: string;
  product_url?: string;
  marketplace?: string;
  editorialBrief?: import('./prompt').EditorialBrief;
}): string {
  const brief = product.editorialBrief;
  return [
    'Produto: ' + product.title,
    'Categoria: ' + (product.category || 'Não informada'),
    'Preço fornecido: ' + (product.price || 'não informado'),
    'Anúncio fornecido: ' + (product.product_url || 'não informado'),
    'Marketplace: ' + (product.marketplace || 'não informado'),
    brief?.primaryKeyword ? 'Palavra-chave principal: ' + brief.primaryKeyword : '',
    brief?.searchQuestion ? 'Pergunta de busca principal: ' + brief.searchQuestion : '',
    brief?.relatedKeywords?.length ? 'Termos relacionados: ' + brief.relatedKeywords.join('; ') : '',
    brief?.verifiedFacts?.length
      ? 'Fatos com fonte fornecidos (não extrapole):\n' + brief.verifiedFacts.map((fact) => '- ' + fact.claim + ' [' + fact.sourceName + (fact.sourceUrl ? '; ' + fact.sourceUrl : '') + ']').join('\n')
      : 'Não foram fornecidas fontes/fatos adicionais verificados; não invente números, testes, experiência prática, avaliações, preços atuais nem links.',
    brief?.internalLinks?.length
      ? 'Links internos permitidos, somente se relevantes: ' + brief.internalLinks.map((item) => item.title + ': ' + item.url).join('; ')
      : 'Não invente links, fontes ou URLs.',
    brief?.callToAction ? 'Objetivo editorial: ' + brief.callToAction : '',
  ].filter(Boolean).join('\n');
}

function escapeGeneratedHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeGeneratedSection(raw: string, plan: ReviewSectionPlan): string {
  let text = raw.trim()
    .replace(/^[\x60]{3}(?:html|text|markdown)?\s*/i, '')
    .replace(/\s*[\x60]{3}$/, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>\s*<p(?:\s+[^>]*)?>/gi, '\n\n')
    .replace(/<\/(?:p|div|li|ul|ol|section|article)\s*>/gi, '\n')
    .replace(/<(?:p|div|li|ul|ol|section|article)(?:\s+[^>]*)?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '')
    .trim();

  const firstLine = text.split('\n')[0]?.trim() ?? '';
  if (firstLine.replace(/^#{1,6}\s*/, '').toLocaleLowerCase('pt-BR') === plan.heading.toLocaleLowerCase('pt-BR')) {
    text = text.slice(text.indexOf('\n') + 1).trim();
  }
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/^[-*]\s+/gm, '').trim())
    .filter(Boolean);

  if (!paragraphs.length) throw new Error('Seção ' + plan.id + ' retornou sem parágrafos.');
  return paragraphs.map((paragraph) => {
    const escaped = escapeGeneratedHtml(paragraph)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    return '<p>' + escaped + '</p>';
  }).join('\n');
}

async function generateReviewSectionBatch(
  sourceContext: string,
  plans: ReviewSectionPlan[],
): Promise<ReviewSection[]> {
  const requestedSections = plans.map((plan, index) =>
    (index + 1) + '. Marcadores exatos: [[SECTION:' + plan.id + ']] e [[/SECTION:' + plan.id + ']]. Tema: ' + plan.heading + '. Foco: ' + plan.focus + '.'
  ).join('\n');

  const raw = await chatCompletion({
    systemPrompt: 'Você é editor técnico sênior do Vetor.blog. Escreva em português brasileiro claro, analítico e factual. Não invente teste prático, dado, preço, URL, citação ou especificação. Não repita frases para SEO. Siga exatamente o formato de marcadores solicitado.',
    userPrompt: [
      'Contexto do produto:',
      sourceContext,
      '',
      'Escreva APENAS as duas seções abaixo, sem JSON, introdução, conclusão extra ou markdown fora dos parágrafos. Cada seção deve ter 290–330 palavras úteis e específicas, em 3 a 5 parágrafos completos. Não inclua o título dentro do texto. Não copie uma seção na outra. Se um dado não foi fornecido, explique o que o comprador deve conferir em vez de inventar.',
      '',
      requestedSections,
      '',
      'Formato obrigatório:',
      '[[SECTION:' + plans[0].id + ']]',
      'Parágrafo um...',
      '',
      'Parágrafo dois...',
      '[[/SECTION:' + plans[0].id + ']]',
      '[[SECTION:' + plans[1].id + ']]',
      'Parágrafo um...',
      '',
      'Parágrafo dois...',
      '[[/SECTION:' + plans[1].id + ']]',
    ].join('\n'),
    temperature: 0.35,
    maxTokens: 2600,
    timeoutMs: 16000,
    deadlineMs: 36000,
    validateResponse: (value) => isCompleteSectionBatch(value, plans),
  });

  return plans.map((plan) => {
    const body = extractMarkedSection(raw, plan);
    if (!body || countVisibleWords(body) < 260) {
      throw new Error('A seção ' + plan.id + ' não atingiu 260 palavras substantivas.');
    }
    const content = normalizeGeneratedSection(body, plan);
    return {
      id: plan.id,
      heading: plan.heading,
      tocEmoji: plan.tocEmoji,
      tocLabel: plan.tocLabel,
      content,
    };
  });
}

async function generateReviewMetadata(
  sourceContext: string,
  productTitle: string,
): Promise<GeneratedReviewResult> {
  const raw = await chatCompletion({
    systemPrompt: 'Você prepara os metadados e componentes de um review editorial. Responda somente com objeto JSON válido. Não invente fontes, testes práticos, preços, links nem especificações. Use "não informado" quando faltar dado.',
    userPrompt: [
      'Contexto factual:',
      sourceContext,
      '',
      'Retorne um objeto JSON curto para o review do produto ' + productTitle + ', sem o corpo e sem as seções do artigo.',
      'Campos obrigatórios: title (comece com "Review" e nome do produto), description (100–160 caracteres), meta_title (35–65 caracteres), meta_description (100–160 caracteres), hero_overall_score (número de 6 a 9 sustentado por critérios editoriais, não por teste de laboratório), hero_bars (3 ou 4 itens {pct,label,value}; pct=value*10), specs (4–6 itens {label,value,highlight}), pros (3–5 pontos específicos), cons (3–5 limitações honestas), compare_table ({columns:["Critério","' + productTitle + '","Alternativa da categoria"], rows: pelo menos 3 objetos {feature,values:["valor do produto","comparativo factual ou não informado"],winner:-1}, caption, winnerCol:-1}), verdict_score, verdict_label, verdict_text, verdict_note, hero_lead (pelo menos 80 caracteres), hero_headline_line1, hero_headline_line2, hero_headline_em e faq (3–5 objetos {question,answer}).',
      'Não inclua content nem sections. Evite texto em markdown/fences.',
    ].join('\n'),
    temperature: 0.25,
    maxTokens: 1800,
    timeoutMs: 16000,
    deadlineMs: 36000,
    validateResponse: hasCompleteReviewMetadata,
  });
  return parseModelJsonObject(raw, 'metadados editoriais') as unknown as GeneratedReviewResult;
}

interface GeneratedReviewResult {
  title?: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  content?: string;
  hero_overall_score?: number;
  hero_bars?: ReviewHeroBar[];
  specs?: ReviewSpec[];
  sections?: ReviewSection[];
  pros?: string[];
  cons?: string[];
  compare_table?: ReviewCompareTable;
  verdict_score?: number;
  verdict_label?: string;
  verdict_text?: string;
  verdict_note?: string;
  hero_lead?: string;
  hero_headline_line1?: string;
  hero_headline_line2?: string;
  hero_headline_em?: string;
  faq?: ReviewFaq[];
}

interface ReviewOutput {
  slug: string;
  title: string;
  description: string;
  content: string;
  price: string;
  category: string;
  image: string;
  product_url?: string;
  marketplace?: string;
  seo_title: string;
  seo_description: string;
  hero_overall_score: number;
  hero_bars: ReviewHeroBar[];
  specs: ReviewSpec[];
  sections: ReviewSection[];
  pros: string[];
  cons: string[];
  compare_table: ReviewCompareTable;
  verdict_score: number;
  verdict_label: string;
  verdict_text: string;
  verdict_note: string;
  hero_lead: string;
  hero_headline_line1: string;
  hero_headline_line2: string;
  hero_headline_em: string;
  faq: ReviewFaq[];
}

export async function generateReview(product: {
  title: string;
  category: string;
  price: string;
  image: string;
  product_url?: string;
  affiliate_url?: string;
  marketplace?: string;
  editorialBrief?: import('./prompt').EditorialBrief;
}): Promise<ReviewOutput> {
  try {
    // Generate long-form content in three small, sequential batches. A single
    // 2,000-word JSON response repeatedly timed out or returned an empty object.
    // Each batch has its own completeness gate; the final 1,500-word editorial gate remains.
    const sourceContext = buildReviewSourceContext(product);
    const modelSections: ReviewSection[] = [];
    for (let index = 0; index < REVIEW_SECTION_PLAN.length; index += 2) {
      const batch = REVIEW_SECTION_PLAN.slice(index, index + 2);
      console.info('[review-generator] generating section batch:', batch.map((item) => item.id));
      const generatedBatch = await generateReviewSectionBatch(sourceContext, batch);
      modelSections.push(...generatedBatch);
    }

    const modelMetadata = rewriteEditorialSignals(
      await generateReviewMetadata(sourceContext, product.title),
    );
    const modelResult: GeneratedReviewResult = {
      ...modelMetadata,
      content: '',
      sections: modelSections,
    };
    const modelSectionsBeforeValidation = Array.isArray(modelResult.sections) ? modelResult.sections : [];
    const sectionWordCounts = modelSectionsBeforeValidation.map((section) =>
      typeof section?.content === 'string' ? countVisibleWords(section.content) : 0
    );
    const hasEditorialPayload =
      [modelResult.title, modelResult.description, modelResult.meta_title, modelResult.meta_description, modelResult.hero_lead, modelResult.verdict_text]
        .some((value) => typeof value === 'string' && value.trim().length > 0) ||
      [modelResult.sections, modelResult.specs, modelResult.hero_bars, modelResult.pros, modelResult.cons, modelResult.faq]
        .some((value) => Array.isArray(value) && value.length > 0) ||
      (modelResult.compare_table && typeof modelResult.compare_table === 'object' && Object.keys(modelResult.compare_table).length > 0);

    console.info('[review-generator] model payload shape:', {
      keys: Object.keys(modelResult),
      sectionCount: modelSectionsBeforeValidation.length,
      sectionWordCounts,
      contentChars: typeof modelResult.content === 'string' ? modelResult.content.length : 0,
      specs: Array.isArray(modelResult.specs) ? modelResult.specs.length : 0,
      heroBars: Array.isArray(modelResult.hero_bars) ? modelResult.hero_bars.length : 0,
      pros: Array.isArray(modelResult.pros) ? modelResult.pros.length : 0,
      cons: Array.isArray(modelResult.cons) ? modelResult.cons.length : 0,
      faq: Array.isArray(modelResult.faq) ? modelResult.faq.length : 0,
      compareColumns: Array.isArray(modelResult.compare_table?.columns) ? modelResult.compare_table.columns.length : 0,
    });

    if (!hasEditorialPayload) {
      throw new Error('A NVIDIA retornou um objeto JSON vazio; geração recusada antes da validação ou persistência.');
    }

    const modelSections = Array.isArray(modelResult.sections) ? modelResult.sections : [];
    const sectionsHtml = modelSections
      .map((section) => `<h2>${section.heading}</h2>${section.content}`)
      .join('\n');
    const parsed = {
      title: typeof modelResult.title === 'string' && modelResult.title.trim() ? modelResult.title.trim() : product.title,
      description: modelResult.description || modelResult.meta_description || '',
      // The prompt intentionally avoids generating the article twice. Sections are canonical.
      content: sectionsHtml.trim() ? sectionsHtml : (modelResult.content || ''),
      meta_title: modelResult.meta_title || '',
      meta_description: modelResult.meta_description || modelResult.description || '',
      hero_lead: modelResult.hero_lead || '',
      hero_overall_score: modelResult.hero_overall_score ?? modelResult.verdict_score ?? 0,
      verdict_score: modelResult.verdict_score ?? modelResult.hero_overall_score ?? 0,
      verdict_label: modelResult.verdict_label || '',
      verdict_text: modelResult.verdict_text || '',
      verdict_note: modelResult.verdict_note || '',
      hero_bars: modelResult.hero_bars || [],
      specs: modelResult.specs || [],
      sections: modelSections,
      pros: modelResult.pros || [],
      cons: modelResult.cons || [],
      compare_table: modelResult.compare_table || { rows: [], caption: '', columns: [], winnerCol: -1 },
      faq: modelResult.faq || [],
      hero_headline_line1: modelResult.hero_headline_line1 || 'Review completo do',
      hero_headline_line2: modelResult.hero_headline_line2 || product.title,
      hero_headline_em: modelResult.hero_headline_em || 'Vale a pena?',
    };

    const generatedTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    let generatedDescription = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    let generatedContent = typeof parsed.content === 'string' ? parsed.content.trim() : '';

    let sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    let specs = Array.isArray(parsed.specs) ? parsed.specs : [];
    let heroBars = Array.isArray(parsed.hero_bars) ? parsed.hero_bars : [];
    let pros = Array.isArray(parsed.pros) ? parsed.pros : [];
    let cons = Array.isArray(parsed.cons) ? parsed.cons : [];
    let faq = Array.isArray(parsed.faq) ? parsed.faq : [];
    let comparison = parsed.compare_table;

    // Reject deficient model output before legacy fallback code can pad it with generic prose.
    const visibleText = (value: string) => value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const visibleContent = visibleText(generatedContent);
    const visibleWordCount = visibleContent ? visibleContent.split(/\s+/).length : 0;
    const headingCount = (generatedContent.match(/<h[23]\b/gi) ?? []).length;
    const paragraphCount = (generatedContent.match(/<p\b/gi) ?? []).length;
    const preflightIssues: string[] = [];

    if (generatedContent.length < 5000) preflightIssues.push('HTML do review tem menos de 5.000 caracteres; não será alongado com texto genérico');
    if (visibleContent.length < 4500) preflightIssues.push(`texto visível tem ${visibleContent.length} caracteres (mínimo 4.500)`);
    if (visibleWordCount < 1500) preflightIssues.push(`texto visível tem ${visibleWordCount} palavras (mínimo 1.500)`);
    if (headingCount < 6) preflightIssues.push(`conteúdo tem ${headingCount} subtítulos H2/H3 (mínimo 6)`);
    if (paragraphCount < 8) preflightIssues.push(`conteúdo tem ${paragraphCount} parágrafos (mínimo 8)`);
    if (sections.length < 6) preflightIssues.push('sections deve conter as 6 seções substantivas exigidas');
    if (sections.some((section: any) => {
      const sectionText = visibleText(String(section?.content ?? ''));
      const sectionWords = sectionText ? sectionText.split(/\s+/).length : 0;
      return typeof section?.heading !== 'string' || sectionWords < 150;
    })) {
      preflightIssues.push('cada seção precisa de título e pelo menos 150 palavras substantivas');
    }
    if (specs.length < 4) preflightIssues.push('specs deve conter pelo menos 4 itens');
    if (heroBars.length < 3 || heroBars.length > 5) preflightIssues.push('hero_bars deve conter de 3 a 5 itens');
    if (pros.length < 3) preflightIssues.push('pros deve conter pelo menos 3 itens');
    if (cons.length < 3) preflightIssues.push('cons deve conter pelo menos 3 itens');
    if (faq.length < 3) preflightIssues.push('faq deve conter pelo menos 3 perguntas');
    if (!comparison || !Array.isArray(comparison.columns) || comparison.columns.length < 2 || comparison.columns.length > 4) {
      preflightIssues.push('compare_table precisa de 2 a 4 colunas');
    } else {
      if (!Array.isArray(comparison.rows) || comparison.rows.length < 3) {
        preflightIssues.push('compare_table precisa de pelo menos 3 linhas');
      } else if (comparison.rows.some((row: any) => !Array.isArray(row?.values) || row.values.length !== comparison.columns.length - 1)) {
        preflightIssues.push('cada linha da comparação deve ter um valor para cada produto');
      }
      const winnerCol = comparison.winnerCol;
      if (!Number.isInteger(winnerCol) || (winnerCol !== -1 && winnerCol < 1) || winnerCol >= comparison.columns.length) {
        preflightIssues.push('compare_table.winnerCol deve ser -1 (sem vencedor) ou apontar para uma coluna de produto existente');
      }
    }

    if (preflightIssues.length > 0) {
      throw new Error(`quality gate prévio reprovou o review: ${preflightIssues.join('; ')}`);
    }

    // Normalize field lengths and repair omitted editorial scaffolding only with
    // explicitly qualified purchase guidance, never with made-up product specifications.
    if (generatedDescription.length > 160) {
      const clipped = generatedDescription.slice(0, 160);
      generatedDescription = clipped.slice(0, Math.max(clipped.lastIndexOf(" "), 100)).replace(/[.,;:\s]+$/, "");
    }

    const qualityIssues: string[] = [];
    if (generatedTitle.length < 10) qualityIssues.push(`title curto (${generatedTitle.length} caracteres)`);
    if (generatedDescription.length < 100 || generatedDescription.length > 160) qualityIssues.push(`description tem ${generatedDescription.length} caracteres (esperado 100–160)`);
    if (generatedContent.length < 5000) qualityIssues.push(`content tem ${generatedContent.length} caracteres (mínimo 5000)`);
    if (sections.length < 4) qualityIssues.push(`sections tem ${sections.length} itens (mínimo 4)`);
    const shortSection = sections.findIndex((item: any) => {
      const sectionText = typeof item.content === 'string' ? item.content.replace(/<[^>]+>/g, ' ').trim() : '';
      return !sectionText || sectionText.split(/\s+/).length < 150;
    });
    if (shortSection >= 0) qualityIssues.push(`section ${shortSection + 1} tem menos de 150 palavras`);
    if (specs.length < 4) qualityIssues.push(`specs tem ${specs.length} itens (mínimo 4)`);
    if (heroBars.length < 3) qualityIssues.push(`hero_bars tem ${heroBars.length} itens (mínimo 3)`);
    if (pros.length < 3) qualityIssues.push(`pros tem ${pros.length} itens (mínimo 3)`);
    if (cons.length < 3) qualityIssues.push(`cons tem ${cons.length} itens (mínimo 3)`);
    if (faq.length < 3) qualityIssues.push(`faq tem ${faq.length} itens (mínimo 3)`);
    if (!comparison) qualityIssues.push('compare_table ausente');
    else {
      if (!Array.isArray(comparison.columns) || comparison.columns.length < 2) qualityIssues.push('compare_table.columns ausente ou incompleto');
      if (!Array.isArray(comparison.rows) || comparison.rows.length < 3) qualityIssues.push('compare_table.rows tem menos de 3 itens');
    }

    if (qualityIssues.length > 0) {
      throw new Error(`A IA retornou um review incompleto: ${qualityIssues.join('; ')}. Não será publicado conteúdo genérico.`);
    }

    const seoOutput = seo(generatedTitle, generatedDescription);
    const proposedMetaTitle = String(parsed.meta_title || seoOutput.title).trim();
    const fallbackMetaTitle = `Review ${product.title}: vale a pena?`;
    const finalMetaTitle = proposedMetaTitle.length >= 35 && proposedMetaTitle.length <= 65
      ? proposedMetaTitle
      : fallbackMetaTitle.slice(0, 65);
    const proposedMetaDescription = String(parsed.meta_description || generatedDescription).trim();
    const fallbackMetaDescription = `Review de ${product.title}: conheça recursos, limitações e alternativas. Veja para quais perfis de uso faz sentido e o que conferir antes de comprar.`;
    const finalMetaDescription = proposedMetaDescription.length >= 100 && proposedMetaDescription.length <= 160
      ? proposedMetaDescription
      : fallbackMetaDescription.slice(0, 160);

    const qualityValidation = validateGeneratedReview({
      product: product.title,
      category: product.category || 'Não informada',
      content: generatedContent,
      sections,
      hero_lead: parsed.hero_lead,
      specs,
      hero_bars: heroBars,
      pros,
      cons,
      faq,
      meta_title: finalMetaTitle,
      meta_description: finalMetaDescription,
      hero_overall_score: parsed.hero_overall_score,
      verdict_score: parsed.verdict_score,
      verdict_label: parsed.verdict_label,
      verdict_text: parsed.verdict_text,
      verdict_note: parsed.verdict_note,
      compare_table: comparison,
    }, { source: 'cron', slug: generatedTitle });

    if (!qualityValidation.ok) {
      throw new Error(`quality gate editorial reprovou o review: ${qualityValidation.issues.join('; ')}`);
    }

    return {
      slug: slugifyEditorialTitle(product.title),
      title: generatedTitle,
      description: generatedDescription,
      content: generatedContent,
      price: product.price,
      category: product.category,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace,
      seo_title: finalMetaTitle,
      seo_description: finalMetaDescription,
      hero_overall_score: parsed.hero_overall_score,
      hero_bars: heroBars,
      specs,
      sections,
      pros,
      cons,
      compare_table: comparison,
      verdict_score: parsed.verdict_score,
      verdict_label: parsed.verdict_label,
      verdict_text: parsed.verdict_text,
      verdict_note: parsed.verdict_note,
      hero_lead: parsed.hero_lead,
      hero_headline_line1: parsed.hero_headline_line1 || 'Review completo do',
      hero_headline_line2: parsed.hero_headline_line2 || product.title,
      hero_headline_em: parsed.hero_headline_em || 'Vale a pena?',
      faq,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[review-generator] failed:', message);
    throw new Error(`[review-generator] ${message}`);
  }
}

export async function generateReviews(products: Array<{ title: string; category: string; price: string; image: string; product_url?: string; marketplace?: string; editorialBrief?: import('./prompt').EditorialBrief }>): Promise<ReviewOutput[]> {
  const results = await Promise.all(
    products.map((product) => generateReview(product))
  );
  return results;
}
