import { z } from 'zod';

const MIN_CONTENT_LENGTH = 4500;
const MIN_HERO_LEAD_LENGTH = 80;
const MIN_SECTIONS = 4;
const MIN_PROS = 3;
const MIN_CONS = 3;
const MIN_FAQ = 3;
const MIN_SPECS = 4;
const MIN_HERO_BARS = 3;

const FORBIDDEN_REVIEW_EDITORIAL_SIGNALS = [
  'temos um claro vencedor',
  'claro vencedor',
  'em nossos testes',
  'nos nossos testes',
  'testamos',
  'medimos',
  'benchmark feito por nos',
  'garantimos',
  'padrão ouro',
  'escolha definitiva',
  'líder do mercado',
  'nao tem rivais a altura',
  'compra certa',
  'deve ser evitado',
  'nível médico',
  'clinicamente útil',
  'garante visibilidade perfeita',
  'funcionam sem falhas',
  'sem engasgos',
];

function normalizeReviewEditorialText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function visibleTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

export const generatedReviewQualitySchema = z
  .object({
    product: z.string().trim().min(1, 'product is required'),
    category: z.string().trim().min(1, 'category is required'),
    content: z
      .string()
      .trim()
      .min(MIN_CONTENT_LENGTH, `content must have at least ${MIN_CONTENT_LENGTH} characters`),
    sections: z
      .array(
        z.object({
          heading: z.string().trim().min(4),
          content: z.string().trim().min(120),
        })
      )
      .min(MIN_SECTIONS, `sections must contain at least ${MIN_SECTIONS} substantive sections`),
    hero_lead: z
      .string()
      .trim()
      .min(MIN_HERO_LEAD_LENGTH, `hero_lead must have at least ${MIN_HERO_LEAD_LENGTH} characters`),
    specs: z.array(z.object({
      label: z.string().trim().min(2),
      value: z.string().trim().min(1),
    })).min(MIN_SPECS, `specs must contain at least ${MIN_SPECS} specifications`),
    hero_bars: z.array(z.object({
      pct: z.number().min(0).max(100),
      label: z.string().trim().min(2),
      value: z.number().min(0).max(10),
    })).min(MIN_HERO_BARS, `hero_bars must contain at least ${MIN_HERO_BARS} criteria`).max(5),
    pros: z.array(z.string().trim().min(8)).min(MIN_PROS),
    cons: z.array(z.string().trim().min(8)).min(MIN_CONS),
    faq: z
      .array(
        z.object({
          question: z.string().trim().min(8),
          answer: z.string().trim().min(30),
        })
      )
      .min(MIN_FAQ, `faq must contain at least ${MIN_FAQ} questions`),
    hero_overall_score: z.number().min(0).max(10).optional(),
    verdict_score: z.number().min(0).max(10).optional(),
    meta_title: z.string().trim().min(35).max(65),
    meta_description: z.string().trim().min(100).max(160),
    verdict_label: z.string().trim().optional(),
    verdict_text: z.string().trim().optional(),
    verdict_note: z.string().trim().optional(),
    compare_table: z
      .object({
        rows: z.array(
          z.object({
            feature: z.string().trim().min(2),
            values: z.array(z.string()).min(1),
            winner: z.number().int().min(-1),
          })
        ).min(3),
        caption: z.string().trim().min(4),
        columns: z.array(z.string().trim().min(2)).min(2).max(4),
        winnerCol: z.number().int().min(0),
      }),

  })
  .superRefine((val, ctx) => {
    if (visibleTextLength(val.content) < MIN_CONTENT_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `visible article text must have at least ${MIN_CONTENT_LENGTH} characters`,
      });
    }
    const normalized = val.content.toLowerCase();
    const forbiddenFallbacks = [
      'análise completa do produto',
      'bom custo-benefício',
      'design moderno',
      'boa qualidade de construção',
      'recomendado para quem busca qualidade',
    ];
    for (const phrase of forbiddenFallbacks) {
      if (normalized.includes(phrase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['content'],
          message: `generic fallback phrase detected: "${phrase}"`,
        });
      }
    }

    if (val.hero_bars.some((bar) => Math.abs(bar.pct - bar.value * 10) > 0.1)) {
      ctx.addIssue({ code: 'custom', path: ['hero_bars'], message: 'hero_bars pct must equal value * 10' });
    }

    if (val.compare_table.columns.length > 0) {
      const productColumnCount = val.compare_table.columns.length - 1;
      if (val.compare_table.winnerCol >= val.compare_table.columns.length) {
        ctx.addIssue({ code: 'custom', path: ['compare_table', 'winnerCol'], message: 'winnerCol must point to a valid product column' });
      }
      for (const [index, row] of val.compare_table.rows.entries()) {
        if (row.values.length !== productColumnCount) {
          ctx.addIssue({ code: 'custom', path: ['compare_table', 'rows', index, 'values'], message: 'row values must match the number of product columns' });
        }
        if (row.winner >= row.values.length) {
          ctx.addIssue({ code: 'custom', path: ['compare_table', 'rows', index, 'winner'], message: 'row winner must point to a valid value index or be -1' });
        }
      }
    }

    const editorialCorpus = [
      val.content,
      val.hero_lead,
      val.meta_title,
      val.meta_description,
      val.verdict_label,
      val.verdict_text,
      val.verdict_note,
      ...(val.pros ?? []),
      ...(val.cons ?? []),
      ...(val.sections ?? []).flatMap((section) => [section.heading, section.content]),
      ...(val.faq ?? []).flatMap((item) => [item.question, item.answer]),
      JSON.stringify(val.compare_table ?? {}),
    ].filter(Boolean).join(' ');

    const normalizedEditorial = normalizeReviewEditorialText(editorialCorpus);
    for (const phrase of FORBIDDEN_REVIEW_EDITORIAL_SIGNALS) {
      if (normalizedEditorial.includes(normalizeReviewEditorialText(phrase))) {
        ctx.addIssue({
          code: 'custom',
          path: ['content'],
          message: `unsupported editorial signal detected: "${phrase}"`,
        });
      }
    }
  });

export type GeneratedReviewQualityInput = z.input<typeof generatedReviewQualitySchema>;

export function validateGeneratedReview(
  payload: GeneratedReviewQualityInput,
  meta: { source: 'admin' | 'cron'; slug?: string }
): { ok: true; issues: [] } | { ok: false; issues: string[] } {
  const result = generatedReviewQualitySchema.safeParse(payload);
  if (result.success) return { ok: true, issues: [] };

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });

  console.error(
    '[quality-gate] review_validation_failed',
    JSON.stringify({ source: meta.source, slug: meta.slug ?? null, issues })
  );

  return { ok: false, issues };
}


const MIN_VIRAL_CONTENT_LENGTH = 3500;
const MIN_VIRAL_HEADINGS = 6;
const MIN_VIRAL_PARAGRAPHS = 8;
const MIN_VIRAL_FAQ_QUESTIONS = 3;
const MIN_VIRAL_PRODUCTS = 2;

function countHtmlTags(html: string, tag: string): number {
  const matches = html.match(new RegExp(`<${tag}\\b`, 'gi'));
  return matches?.length ?? 0;
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export const generatedViralQualitySchema = z
  .object({
    slug: z.string().trim().min(3, 'slug is required'),
    title: z.string().trim().min(10, 'title must have at least 10 characters'),
    description: z.string().trim().min(40, 'description must have at least 40 characters'),
    content: z.string().trim().min(MIN_VIRAL_CONTENT_LENGTH, `content must have at least ${MIN_VIRAL_CONTENT_LENGTH} characters`),
    category: z.string().trim().min(1, 'category is required'),
    products: z.array(z.object({
      name: z.string().trim().min(2),
      slug: z.string().trim().min(2),
      imageUrl: z.string().trim().min(1),
      product_url: z.string().trim().optional(),
    })).min(MIN_VIRAL_PRODUCTS, `products must contain at least ${MIN_VIRAL_PRODUCTS} products`),
    seo_title: z.string().trim().min(10),
    seo_description: z.string().trim().min(40),
  })
  .superRefine((val, ctx) => {
    if (visibleTextLength(val.content) < MIN_VIRAL_CONTENT_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `visible article text must have at least ${MIN_VIRAL_CONTENT_LENGTH} characters`,
      });
    }

    const headings = countHtmlTags(val.content, 'h2') + countHtmlTags(val.content, 'h3');
    if (headings < MIN_VIRAL_HEADINGS) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `content must contain at least ${MIN_VIRAL_HEADINGS} substantive headings`,
      });
    }

    if (countHtmlTags(val.content, 'p') < MIN_VIRAL_PARAGRAPHS) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `content must contain at least ${MIN_VIRAL_PARAGRAPHS} paragraphs`,
      });
    }

    if (!/<table\b/i.test(val.content)) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'content must contain a comparison table' });
    }

    const normalized = normalizeSearchText(val.content);
    if (!/(perguntas frequentes|faq|duvidas frequentes)/i.test(normalized)) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'content must contain an identifiable FAQ section' });
    }

    if ((val.content.match(/\?/g) ?? []).length < MIN_VIRAL_FAQ_QUESTIONS) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: `content must contain at least ${MIN_VIRAL_FAQ_QUESTIONS} questions`,
      });
    }

    if (!/(comprar|preco|preço|oferta|disponibilidade)/i.test(normalized)) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'content must include a purchase/price CTA' });
    }

    const mentionedProducts = val.products.filter((product) =>
      normalized.includes(normalizeSearchText(product.name))
    ).length;
    if (mentionedProducts < MIN_VIRAL_PRODUCTS) {
      ctx.addIssue({ code: 'custom', path: ['products'], message: 'content must mention all compared product names' });
    }

    for (const phrase of [
      'temos um claro vencedor',
      'claro vencedor',
      'em nossos testes',
      'nos nossos testes',
      'testamos',
      'medimos',
      'benchmark feito por nos',
      'garantimos',
    ]) {
      if (normalized.includes(phrase)) {
        ctx.addIssue({
          code: 'custom',
          path: ['content'],
          message: `unsupported editorial signal detected: "${phrase}"`,
        });
      }
    }
  });

export type GeneratedViralQualityInput = z.input<typeof generatedViralQualitySchema>;

export function validateGeneratedViralArticle(
  payload: GeneratedViralQualityInput,
  meta: { source: 'admin' | 'cron' | 'generator' | 'persistence'; slug?: string }
): { ok: true; issues: [] } | { ok: false; issues: string[] } {
  const result = generatedViralQualitySchema.safeParse(payload);
  if (result.success) return { ok: true, issues: [] };
  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'root';
    return `${path}: ${issue.message}`;
  });
  console.error('[quality-gate] viral_validation_failed', JSON.stringify({
    source: meta.source, slug: meta.slug ?? null, issues
  }));
  return { ok: false, issues };
}
