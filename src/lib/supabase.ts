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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;

  serviceClient = createClient(url, serviceKey);
  return serviceClient;
}

const REVIEW_COLUMNS =
  'slug,status,product,category,marketplace,price_old,price_new,affiliate_url,image_url,ads_enabled,meta_title,meta_description,meta_keywords,meta_reading_time,meta_canonical,meta_og_image,hero_headline_line1,hero_headline_line2,hero_headline_em,hero_lead,hero_overall_score,hero_bars,specs,sections,compare_table,pros,cons,testimonials,verdict_score,verdict_label,verdict_text,verdict_note,schema_rating_value,schema_review_count,google_rank,last_rank_check,created_at,updated_at,faq';

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
  hero_bars?: Array<{ pct: number; label: string; value: number }>;
  specs?: Array<{ label: string; value: string; highlight: boolean }>;
  sections?: Array<{ id: string; heading: string; tocEmoji: string; tocLabel: string; content: string }>;
  compare_table?: { rows: Array<{ feature: string; values: string[]; winner: number }>; caption: string; columns: string[]; winnerCol: number };
  verdict_label?: string;
  verdict_text?: string;
  verdict_note?: string;
  hero_lead?: string;
  hero_headline_line1?: string;
  hero_headline_line2?: string;
  hero_headline_em?: string;
  faq?: Array<{ question: string; answer: string }>;
}): Promise<{ data: Review | null; error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return { data: { ...data, id: 'mock-' + Date.now(), status: 'draft', marketplace: data.marketplace || '', price_old: '', affiliate_url: data.affiliate_url || '', ads_enabled: false, meta_keywords: '', meta_reading_time: 5, meta_canonical: null, meta_og_image: null, hero_headline_line1: data.hero_headline_line1 || '', hero_headline_line2: data.hero_headline_line2 || '', hero_headline_em: data.hero_headline_em || '', hero_lead: data.hero_lead || '', hero_bars: data.hero_bars || [], specs: data.specs || [], sections: data.sections || [], compare_table: data.compare_table || { rows: [], caption: '', columns: [], winnerCol: 0 }, testimonials: [], verdict_label: data.verdict_label || '', verdict_text: data.verdict_text || '', verdict_note: data.verdict_note || '', schema_rating_value: data.hero_overall_score ?? 0, schema_review_count: 1, google_rank: null, last_rank_check: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), faq: data.faq || [] } as Review, error: null };
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('reviews')
    .select('created_at,status')
    .eq('slug', data.slug)
    .maybeSingle();

  const row = {
    slug: data.slug,
    status: existing?.status ?? 'draft',
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
    hero_headline_line1: data.hero_headline_line1 || '',
    hero_headline_line2: data.hero_headline_line2 || '',
    hero_headline_em: data.hero_headline_em || '',
    hero_lead: data.hero_lead || '',
    hero_overall_score: data.hero_overall_score ?? 0,
    hero_bars: data.hero_bars ?? [],
    specs: data.specs ?? [],
    sections: data.sections ?? [],
    compare_table: data.compare_table ?? { rows: [], caption: '', columns: [], winnerCol: 0 },
    pros: data.pros ?? [],
    cons: data.cons ?? [],
    testimonials: [],
    verdict_score: data.verdict_score ?? data.hero_overall_score ?? 0,
    verdict_label: data.verdict_label || '',
    verdict_text: data.verdict_text || '',
    verdict_note: data.verdict_note || '',
    schema_rating_value: data.hero_overall_score ?? 0,
    schema_review_count: 1,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    faq: data.faq ?? [],
  };

  const { data: result, error } = await supabase
    .from('reviews')
    .upsert(row, { onConflict: 'slug' })
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
  const { data: existing } = await supabase
    .from('viral_articles')
    .select('created_at,published_at')
    .eq('slug', data.slug)
    .maybeSingle();

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
    published_at: existing?.published_at ?? now,
    updated_at: now,
    created_at: existing?.created_at ?? now,
  };

  const { data: result, error } = await supabase
    .from('viral_articles')
    .upsert(row, { onConflict: 'slug' })
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

export async function getAllReviews(options?: {
  includeUnpublished?: boolean;
}): Promise<Review[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase.from('reviews').select(REVIEW_COLUMNS);
    if (!options?.includeUnpublished) {
      query = query.eq('status', 'published');
    }
    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error || !data || data.length === 0) return [];

    const first = data[0];
    if (!first || typeof first.slug !== 'string') return [];

    return data.map(normalizeReviewFields) as Review[];
  } catch (err) {
    console.error('[Supabase] getAllReviews error:', err);
    return [];
  }
}

export async function getAllReviewsAdmin(): Promise<Review[]> {
  const supabase = getSupabaseServiceKeyClient() ?? getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(REVIEW_COLUMNS)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    const first = data[0];
    if (!first || typeof first.slug !== 'string') return [];

    return data.map(normalizeReviewFields) as Review[];
  } catch (err) {
    console.error('[Supabase] getAllReviewsAdmin error:', err);
    return [];
  }
}

export async function updateReviewStatus(
  params: { slug: string },
  status: 'draft' | 'published'
): Promise<{ data: { slug: string } | null; error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return { data: null, error: 'Supabase service client not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('slug', params.slug)
      .select('slug');

    if (error) return { data: null, error: error.message };
    if (!data || data.length === 0) {
      return { data: null, error: 'Review not found' };
    }

    return { data: data[0] as { slug: string }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getReviewBySlug(slug: string): Promise<Review | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(REVIEW_COLUMNS)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return null;
    if (typeof data.slug !== 'string') return null;

    return normalizeReviewFields(data) as Review;
  } catch (err) {
    console.error('[Supabase] getReviewBySlug error:', err);
    return null;
  }
}

export async function getAllViralArticles(): Promise<ViralArticle[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('viral_articles')
      .select('id,slug,title,description,category,content,hero,products,seo_title,seo_description,published_at,updated_at,created_at')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    const first = data[0];
    if (!first || typeof first.slug !== 'string') return [];

    return data as ViralArticle[];
  } catch (err) {
    console.error('[Supabase] getAllViralArticles error:', err);
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
  } catch (err) {
    console.error('[Supabase] getViralArticleBySlug error:', err);
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
  } catch (err) {
    console.error('[Supabase] getReviewsByCategory error:', err);
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
  } catch (err) {
    console.error('[Supabase] getCategories error:', err);
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
  } catch (err) {
    console.error('[Supabase] updateReviewScore error:', err);
    return { error: err instanceof Error ? err.message : String(err) };
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
  } catch (err) {
    console.error('[Supabase] deleteReview error:', err);
    return { error: err instanceof Error ? err.message : String(err) };
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
  } catch (err) {
    console.error('[Supabase] deleteViralArticle error:', err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
