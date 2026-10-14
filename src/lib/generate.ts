import { buildReviewPrompt } from './prompt';
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
    // Use NVIDIA directly; automated generation must never depend on a Gemini key
    // or launch a legacy subprocess requiring GOOGLE_AI_API_KEY.
    const userPrompt = buildReviewPrompt({
      title: product.title,
      category: product.category,
      price: product.price,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace,
      editorialBrief: product.editorialBrief,
    });
    const raw = await chatCompletion({
      systemPrompt: 'Você é editor sênior do Vetor.blog. Gere um review técnico, útil e factual, cumpra todo o schema JSON e os critérios de qualidade do prompt. Não invente medições nem experiência prática. Retorne somente JSON válido.',
      userPrompt,
      temperature: 0.35,
      maxTokens: 8000,
      responseFormat: { type: 'json_object' },
    });
    const trimmed = raw.trim();
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new Error('NVIDIA não retornou um objeto JSON para o review.');
    }

    let modelResult: GeneratedReviewResult;
    try {
      modelResult = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as GeneratedReviewResult;
    } catch (error) {
      throw new Error('Não foi possível interpretar o JSON retornado pela NVIDIA: ' + (error instanceof Error ? error.message : String(error)));
    }
    modelResult = rewriteEditorialSignals(modelResult);

    const modelSections = Array.isArray(modelResult.sections) ? modelResult.sections : [];
    const sectionsHtml = modelSections
      .map((section) => `<h2>${section.heading}</h2>${section.content}`)
      .join('\n');
    const parsed = {
      title: typeof modelResult.title === 'string' && modelResult.title.trim() ? modelResult.title.trim() : product.title,
      description: modelResult.description || modelResult.meta_description || '',
      content: typeof modelResult.content === 'string' && modelResult.content.trim() ? modelResult.content : sectionsHtml,
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
    if (sections.length < 4) preflightIssues.push('sections deve conter pelo menos 4 seções substantivas');
    if (sections.some((section: any) => typeof section?.heading !== 'string' || visibleText(String(section.content ?? '')).length < 120)) {
      preflightIssues.push('cada seção precisa de título e pelo menos 120 caracteres de texto');
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
    const shortSection = sections.findIndex((item: any) =>
      typeof item.content !== 'string' || item.content.replace(/<[^>]+>/g, ' ').trim().length < 120
    );
    if (shortSection >= 0) qualityIssues.push(`section ${shortSection + 1} tem menos de 120 caracteres`);
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
