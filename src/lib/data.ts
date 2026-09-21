import {
  getAllReviews,
  getReviewBySlug,
  getAllViralArticles,
  getViralArticleBySlug,
  getCategories,
} from './supabase';
import { reviews as staticReviews } from '@/data/reviews';
import type { Review, ViralArticle, Category } from './types';

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
  })).map(r => ({ ...r, marketplace: 'mercadolivre' }));
}

export async function fetchAllReviews(): Promise<Review[]> {
  try {
    const reviews = await getAllReviews();
    if (reviews && reviews.length > 0) return reviews;
  } catch {
    // Supabase not available, fall back to static
  }
  return normalizeStaticReviews();
}

export async function fetchReviewBySlug(slug: string): Promise<Review | null> {
  try {
    const review = await getReviewBySlug(slug);
    if (review) return review;
  } catch {
    // Supabase not available
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
    if (categories && categories.length > 0) return categories;
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
  const reviews = await fetchAllReviews();
  return reviews.filter(
    (r) => r.category.toLowerCase() === category.toLowerCase()
  );
}
