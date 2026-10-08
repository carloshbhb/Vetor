import {
  getAllReviews,
  getReviewBySlug,
  getAllViralArticles,
  getViralArticleBySlug,
  getCategories,
  getSupabaseClient,
} from './supabase';
import { reviews as staticReviews } from '@/data/reviews';
import type { Review, ViralArticle, Category } from './types';

const CATEGORY_ALIASES: Record<string, string> = {
  eletroportateis: 'Eletroportáteis',
  'eletroportáteis': 'Eletroportáteis',
  wearables: 'Wearables / Smartbands',
  'wearables / smartbands': 'Wearables / Smartbands',
  'acessorios gamer': 'Acessórios para Games',
  'acessórios gamer': 'Acessórios para Games',
  'acessórios para games': 'Acessórios para Games',
  'mercado livre frete gratis': 'Mercado Livre Frete Grátis',
  'mercado livre frete grátis': 'Mercado Livre Frete Grátis',
};

export function normalizeCategoryName(value: string): string {
  const key = value.trim().toLowerCase();
  return CATEGORY_ALIASES[key] || value.trim();
}

const EDITORIAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\\bEm nossos testes\\b/g, 'Na análise'],
  [/\\bNos nossos testes\\b/g, 'Na análise'],
  [/\\bem nossos testes\\b/g, 'na análise'],
  [/\\bnos nossos testes\\b/g, 'na análise'],
  [/\\bTestamos\\b/g, 'Analisamos'],
  [/\\btestamos\\b/g, 'analisamos'],
  [/\\bMedimos\\b/g, 'Avaliamos'],
  [/\\bmedimos\\b/g, 'avaliamos'],
  [/\\bbenchmark feito por nós\\b/gi, 'benchmark de referência'],
  [/\\bbenchmark feito por nos\\b/gi, 'benchmark de referência'],
];

function cleanReviewEditorialText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return EDITORIAL_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function normalizeScore(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

function normalizeReviewContent(review: Review): Review {
  const heroScore = normalizeScore(review.hero_overall_score);
  const verdictScore = normalizeScore(review.verdict_score, heroScore);

  const heroBars = Array.isArray(review.hero_bars)
    ? review.hero_bars.map((bar) => {
        const value = normalizeScore(bar?.value);
        return {
          ...bar,
          label: cleanReviewEditorialText(String(bar?.label ?? '')).trim(),
          value,
          pct: Math.round(value * 10),
        };
      })
    : [];

  const specs = Array.isArray(review.specs)
    ? review.specs.map((spec) => ({
        ...spec,
        label: cleanReviewEditorialText(String(spec?.label ?? '')).trim(),
        value: cleanReviewEditorialText(String(spec?.value ?? '')).trim(),
      }))
    : [];

  const sections = Array.isArray(review.sections)
    ? review.sections.map((section, index) => ({
        ...section,
        id: cleanReviewEditorialText(section.id || `section-${index + 1}`).trim(),
        heading: cleanReviewEditorialText(section.heading).trim(),
        tocEmoji: cleanReviewEditorialText(section.tocEmoji).trim(),
        tocLabel: cleanReviewEditorialText(section.tocLabel).trim(),
        content: cleanReviewEditorialText(section.content),
      }))
    : [];

  const compare = review.compare_table;
  const columns = Array.isArray(compare?.columns)
    ? compare.columns.map((column) => cleanReviewEditorialText(column).trim())
    : [];
  const compareRows = Array.isArray(compare?.rows)
    ? compare.rows.map((row) => {
        const values = Array.isArray(row?.values)
          ? row.values.map((value) => cleanReviewEditorialText(String(value ?? '')).trim())
          : [];
        const winner =
          Number.isInteger(row?.winner) && row.winner >= 0 && row.winner < values.length
            ? row.winner
            : -1;
        return {
          ...row,
          feature: cleanReviewEditorialText(String(row?.feature ?? '')).trim(),
          values,
          winner,
        };
      })
    : [];
  const winnerCol =
    Number.isInteger(compare?.winnerCol) &&
    compare.winnerCol >= 0 &&
    compare.winnerCol < columns.length
      ? compare.winnerCol
      : 0;

  return {
    ...review,
    meta_title: cleanReviewEditorialText(review.meta_title).trim(),
    meta_description: normalizeMetaDescription(review.meta_description, review.product),
    hero_lead: cleanReviewEditorialText(review.hero_lead).trim(),
    hero_headline_line1: cleanReviewEditorialText(review.hero_headline_line1).trim(),
    hero_headline_line2: cleanReviewEditorialText(review.hero_headline_line2).trim(),
    hero_headline_em: cleanReviewEditorialText(review.hero_headline_em).trim(),
    hero_overall_score: heroScore,
    verdict_score: verdictScore,
    verdict_label: cleanReviewEditorialText(review.verdict_label).trim(),
    verdict_text: cleanReviewEditorialText(review.verdict_text).trim(),
    verdict_note: cleanReviewEditorialText(review.verdict_note).trim(),
    hero_bars: heroBars,
    specs,
    sections,
    pros: (review.pros || []).map((item) => cleanReviewEditorialText(item).trim()).filter(Boolean),
    cons: (review.cons || []).map((item) => cleanReviewEditorialText(item).trim()).filter(Boolean),
    faq: (review.faq || []).map((item) => ({
      ...item,
      question: cleanReviewEditorialText(item.question).trim(),
      answer: cleanReviewEditorialText(item.answer).trim(),
    })),
    compare_table: {
      ...compare,
      columns,
      rows: compareRows,
      caption: cleanReviewEditorialText(compare?.caption || '').trim(),
      winnerCol,
    },
    schema_rating_value: Math.round((verdictScore / 2) * 10) / 10,
    schema_review_count: 0,
  };
}

function normalizeMetaDescription(value: unknown, product: string): string {
  const text = cleanReviewEditorialText(value).trim();
  if (!text) return '';
  if (!/(\\bgaranta\\b|\\bclique\\b|\\bcompre agora\\b|\\badquira\\b|\\bconfira agora\\b|\\bmelhor preço agora\\b)/i.test(text)) {
    return text;
  }
  const fallback = `Review de ${product}: nota, prós, contras, preço consultado e alternativas para decidir a compra.`;
  if (fallback.length <= 160) return fallback;
  return fallback.slice(0, 160).replace(/\\s+\\S*$/, '').trim() + '.';
}

function normalizeReviewCategory(review: Review): Review {
  const normalized = normalizeReviewContent(review);
  return { ...normalized, category: normalizeCategoryName(normalized.category) };
}

function normalizeStaticReviews(): Review[] {
  return staticReviews.map((r) => ({
    slug: r.slug,
    status: 'published',
    product: r.title,
    category: r.category,
    marketplace: 'mercadolivre',
    price_old: '',
    price_new: r.price,
    affiliate_url: r.product_url || '',
    image_url: r.image || '',
    ads_enabled: false,
    meta_title: r.title,
    meta_description: r.description,
    meta_keywords: '',
    meta_reading_time: 5,
    meta_canonical: null,
    meta_og_image: null,
    hero_headline_line1: r.title.toUpperCase(),
    hero_headline_line2: '',
    hero_headline_em: r.title,
    hero_lead: r.description,
    hero_overall_score: 0,
    hero_bars: [],
    specs: [],
    sections: [],
    compare_table: { rows: [], caption: '', columns: [], winnerCol: 0 },
    pros: [],
    cons: [],
    testimonials: [],
    verdict_score: 0,
    verdict_label: '',
    verdict_text: '',
    verdict_note: '',
    schema_rating_value: 0,
    schema_review_count: 1,
    google_rank: null,
    last_rank_check: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    faq: [],
  })).map(r => ({ ...r, marketplace: 'mercadolivre', category: normalizeCategoryName(r.category) }));
}

export async function fetchAllReviews(): Promise<Review[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return normalizeStaticReviews();

  try {
    const reviews = await getAllReviews();
    return reviews.map(normalizeReviewCategory);
  } catch (error) {
    console.error('[Data] getAllReviews failed:', error);
    return [];
  }
}

export async function fetchReviewBySlug(slug: string): Promise<Review | null> {
  if (getSupabaseClient()) {
    const review = await getReviewBySlug(slug);
    if (review) return normalizeReviewCategory(review);

    // Fallback defensivo: o índice público de reviews pode estar disponível
    // mesmo quando a consulta pontual ao slug falha.
    try {
      const reviews = await getAllReviews();
      const fallback = reviews.find((item) => item.slug === slug);
      return fallback ? normalizeReviewCategory(fallback) : null;
    } catch (error) {
      console.error('[Data] getReviewBySlug fallback failed:', error);
      return null;
    }
  }
  const staticReview = staticReviews.find((r) => r.slug === slug);
  if (!staticReview) return null;
  return normalizeStaticReviews().find((r) => r.slug === slug) || null;
}

export async function fetchAllViralArticles(): Promise<ViralArticle[]> {
  try {
    const articles = await getAllViralArticles();
    if (articles && articles.length > 0) return articles;
  } catch {
    // Supabase not available
  }
  return [];
}

export async function fetchViralArticleBySlug(
  slug: string
): Promise<ViralArticle | null> {
  try {
    const article = await getViralArticleBySlug(slug);
    if (article) return article;
  } catch {
    // Supabase not available
  }
  return null;
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const categories = await getCategories();
    if (categories && categories.length > 0) {
      const normalized = new Map<string, number>();
      for (const category of categories) {
        const name = normalizeCategoryName(category.name);
        normalized.set(name, (normalized.get(name) || 0) + category.count);
      }
      return Array.from(normalized.entries()).map(([name, count]) => ({ name, count }));
    }
  } catch {
    // Supabase not available
  }
  const reviews = await fetchAllReviews();
  const categoryMap = new Map<string, number>();
  for (const review of reviews) {
    const count = categoryMap.get(review.category) || 0;
    categoryMap.set(review.category, count + 1);
  }
  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));
}

export async function fetchReviewsByCategory(
  category: string
): Promise<Review[]> {
  const normalizedCategory = normalizeCategoryName(category);
  const reviews = await fetchAllReviews();
  return reviews.filter((r) => r.category === normalizedCategory);
}

// Reviews que funcionam como guias (contêm "guia" ou prefixos top-N/melhores-*).
// Usado pela home e pela rota /guias/ (aponta para /reviews/[slug], sem duplicar).
export function isGuiaLike(review: Review): boolean {
  const s = review.slug.toLowerCase();
  return s.includes('guia') || s.startsWith('melhores-') || s.startsWith('top-');
}

export async function fetchGuias(): Promise<Review[]> {
  const reviews = await fetchAllReviews();
  return reviews.filter(isGuiaLike);
}
