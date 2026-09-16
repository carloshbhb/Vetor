import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Review, ViralArticle, Category } from './types';

let client: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function hasSupabaseCredentials(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!anonKey && url !== 'https://your-project.supabase.co' && anonKey !== 'your-anon-key-here';
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  if (!hasSupabaseCredentials()) return null;

  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}

export function getSupabaseServiceKeyClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;

  serviceClient = createClient(url, serviceKey);
  return serviceClient;
}

export async function createReview(data: {
  slug: string;
  product: string;
  category: string;
  price_new: string;
  image_url: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  pros?: string[];
  cons?: string[];
  hero_overall_score?: number;
  verdict_score?: number;
  marketplace?: string;
  affiliate_url?: string;
}): Promise<{ data: Review | null; error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return { data: { ...data, id: 'mock-' + Date.now(), status: 'published', marketplace: data.marketplace || '', price_old: '', affiliate_url: data.affiliate_url || '', ads_enabled: false, meta_keywords: '', meta_reading_time: 5, meta_canonical: null, meta_og_image: null, hero_headline_line1: '', hero_headline_line2: '', hero_headline_em: '', hero_lead: '', hero_bars: [], specs: [], sections: [], compare_table: { rows: [], caption: '', columns: [], winnerCol: 0 }, testimonials: [], verdict_label: '', verdict_text: '', verdict_note: '', schema_rating_value: data.hero_overall_score ?? 0, schema_review_count: 1, google_rank: null, last_rank_check: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), faq: [] } as Review, error: null };
  }

  const now = new Date().toISOString();
  const row = {
    slug: data.slug,
    status: 'published',
    product: data.product,
    category: data.category,
    marketplace: data.marketplace || '',
    price_old: '',
    price_new: data.price_new,
    affiliate_url: data.affiliate_url || '',
    image_url: data.image_url,
    ads_enabled: false,
    meta_title: data.meta_title || '',
    meta_description: data.meta_description || '',
    meta_keywords: '',
    meta_reading_time: 5,
    hero_headline_line1: '',
    hero_headline_line2: '',
    hero_headline_em: '',
    hero_lead: '',
    hero_overall_score: data.hero_overall_score ?? 0,
    hero_bars: [],
    specs: [],
    sections: [],
    compare_table: { rows: [], caption: '', columns: [], winnerCol: 0 },
    pros: data.pros ?? [],
    cons: data.cons ?? [],
    testimonials: [],
    verdict_score: data.verdict_score ?? 0,
    verdict_label: '',
    verdict_text: '',
    verdict_note: '',
    schema_rating_value: data.hero_overall_score ?? 0,
    schema_review_count: 1,
    created_at: now,
    updated_at: now,
    faq: [],
  };

  const { data: result, error } = await supabase
    .from('reviews')
    .insert(row)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: result as Review, error: null };
}

export async function createViralArticle(data: {
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
  hero: { imageUrl: string; bars: Array<{ label: string; value: string; imageUrl: string }> };
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
  seo_title: string;
  seo_description: string;
}): Promise<{ data: ViralArticle | null; error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return { data: { ...data, id: 'mock-' + Date.now(), published_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_at: new Date().toISOString() } as ViralArticle, error: null };
  }

  const now = new Date().toISOString();
  const row = {
    slug: data.slug,
    title: data.title,
    description: data.description,
    category: data.category,
    content: data.content,
    hero: data.hero,
    products: data.products,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    published_at: now,
    updated_at: now,
    created_at: now,
  };

  const { data: result, error } = await supabase
    .from('viral_articles')
    .insert(row)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: result as ViralArticle, error: null };
}

function parseJsonArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return []; } }
  return [];
}

function normalizeReviewFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const r = { ...data };
  r.hero_bars = parseJsonArray(r.hero_bars);
  r.specs = parseJsonArray(r.specs);
  r.sections = parseJsonArray(r.sections);
  r.pros = parseJsonArray(r.pros);
  r.cons = parseJsonArray(r.cons);
  r.testimonials = parseJsonArray(r.testimonials);
  r.faq = parseJsonArray(r.faq);
  if (typeof r.compare_table === 'string') { try { r.compare_table = JSON.parse(r.compare_table); } catch { r.compare_table = null; } }
  if (r.compare_table && typeof r.compare_table === 'object') {
    r.compare_table.rows = parseJsonArray(r.compare_table.rows).map((row: any) => ({
      ...row,
      values: parseJsonArray(row?.values),
    }));
    r.compare_table.columns = parseJsonArray(r.compare_table.columns);
  } else {
    r.compare_table = { rows: [], caption: '', columns: [], winnerCol: 0 };
  }
  return r;
}

export async function getAllReviews(): Promise<Review[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    const first = data[0];
    if (!first || typeof first.slug !== 'string') return [];

    return data.map(normalizeReviewFields) as Review[];
  } catch {
    return [];
  }
}

export async function getReviewBySlug(slug: string): Promise<Review | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    if (typeof data.slug !== 'string') return null;

    return normalizeReviewFields(data) as Review;
  } catch {
    return null;
  }
}

export async function getAllViralArticles(): Promise<ViralArticle[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('viral_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    const first = data[0];
    if (!first || typeof first.slug !== 'string') return [];

    return data as ViralArticle[];
  } catch {
    return [];
  }
}

export async function getViralArticleBySlug(slug: string): Promise<ViralArticle | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('viral_articles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    if (typeof data.slug !== 'string') return null;

    return data as ViralArticle;
  } catch {
    return null;
  }
}

export async function getReviewsByCategory(category: string): Promise<Review[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('category', category)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(normalizeReviewFields) as Review[];
  } catch {
    return [];
  }
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('category')
      .eq('status', 'published');

    if (error || !data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      const cat = row.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

export async function updateReviewScore(slug: string, score: number): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('reviews')
      .update({ verdict_score: score, hero_overall_score: score, schema_rating_value: score / 2, updated_at: new Date().toISOString() })
      .eq('slug', slug);

    return { error: error?.message ?? null };
  } catch {
    return { error: null };
  }
}

export async function deleteReview(slug: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('slug', slug);

    return { error: error?.message ?? null };
  } catch {
    return { error: null };
  }
}

export async function deleteViralArticle(slug: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('viral_articles')
      .delete()
      .eq('slug', slug);

    return { error: error?.message ?? null };
  } catch {
    return { error: null };
  }
}
