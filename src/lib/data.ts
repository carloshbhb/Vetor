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

function normalizeReviewCategory(review: Review): Review {
  return { ...review, category: normalizeCategoryName(review.category) };
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
    return review ? normalizeReviewCategory(review) : null;
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
