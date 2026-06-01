import { createClient } from '@supabase/supabase-js';
import type { ReviewData, ReviewSummary, FAQItem } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true';

const supabase = !fallbackToFile && supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

// ─── Backup Module ────────────────────────────────────────────────────────────

async function getBackup() {
  return import('./db.backup');
}

// ─── Type Mappers ─────────────────────────────────────────────────────────────
function mapToReviewData(row: any): ReviewData {
   const parseSafe = (val: any) => {
      if (val === null || val === undefined) return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
   };

   // FAQ may be stored as JSON string or array
   let faq: FAQItem[] = [];
   if (row.faq) {
      if (typeof row.faq === 'string') {
         try {
            faq = JSON.parse(row.faq);
         } catch {
            faq = [];
         }
      } else if (Array.isArray(row.faq)) {
         faq = row.faq;
      }
   }

   return {
     id: row.id,
     slug: row.slug,
     status: row.status,
     product: row.product ?? '',
     category: row.category ?? '',
     marketplace: row.marketplace ?? '',
     priceOld: row.price_old ?? '',
     priceNew: row.price_new ?? '',
     affiliateUrl: row.affiliate_url ?? '',
     imageUrl: row.image_url ?? '',
     adsEnabled: !!row.ads_enabled,
     meta: {
       title: row.meta_title ?? '',
       description: row.meta_description ?? '',
       keywords: row.meta_keywords ?? '',
       readingTime: parseSafe(row.meta_reading_time),
       canonical: row.meta_canonical ?? null,
       ogImage: row.meta_og_image ?? null,
     },
     hero: {
       headlineLine1: row.hero_headline_line1 ?? '',
       headlineLine2: row.hero_headline_line2 ?? '',
       headlineEm: row.hero_headline_em ?? '',
       lead: row.hero_lead ?? '',
       overallScore: parseSafe(row.hero_overall_score),
       bars: Array.isArray(row.hero_bars) ? row.hero_bars : [],
     },
     specs: Array.isArray(row.specs) ? row.specs : [],
     sections: Array.isArray(row.sections) ? row.sections : [],
     compareTable: row.compare_table ?? {},
     pros: Array.isArray(row.pros) ? row.pros : [],
     cons: Array.isArray(row.cons) ? row.cons : [],
     testimonials: Array.isArray(row.testimonials) ? row.testimonials : [],
     verdict: {
       score: parseSafe(row.verdict_score),
       label: row.verdict_label ?? '',
       text: row.verdict_text ?? '',
       note: row.verdict_note ?? '',
     },
     faq,
     schemaRating: {
       ratingValue: parseSafe(row.schema_rating_value),
       reviewCount: parseSafe(row.schema_review_count),
     },
     googleRank: row.google_rank ?? null,
     lastRankCheck: row.last_rank_check ?? null,
     createdAt: row.created_at ?? '',
     updatedAt: row.updated_at ?? '',
   };
 }

function mapToReviewSummary(row: any): ReviewSummary {
   const parseSafe = (val: any) => {
      if (val === null || val === undefined) return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
   };
   return {
     id: row.id,
     slug: row.slug,
     status: row.status,
     product: row.product ?? '',
     category: row.category ?? '',
     meta: {
       title: row.meta_title ?? '',
       description: row.meta_description ?? '',
       keywords: row.meta_keywords ?? '',
       readingTime: parseSafe(row.meta_reading_time),
       canonical: row.meta_canonical ?? null,
       ogImage: row.meta_og_image ?? null,
     },
     hero: {
       headlineLine1: row.hero_headline_line1 ?? '',
       headlineLine2: row.hero_headline_line2 ?? '',
       headlineEm: row.hero_headline_em ?? '',
       lead: row.hero_lead ?? '',
       overallScore: parseSafe(row.hero_overall_score),
       bars: Array.isArray(row.hero_bars) ? row.hero_bars : [],
     },
     adsEnabled: !!row.ads_enabled,
     createdAt: row.created_at ?? '',
     updatedAt: row.updatedAt ?? '',
     googleRank: row.google_rank ?? null,
     lastRankCheck: row.last_rank_check ?? null,
   };
 }

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getAllReviews(): Promise<ReviewData[]> {
  // If Supabase is not configured, use backup directly
  if (!supabase) { 
    const b = await getBackup(); 
    return b.getAllReviews(); 
  }

  // Query Supabase
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Database] Error fetching all reviews:', error);
    // Fallback to backup on Supabase error
    const b = await getBackup();
    return b.getAllReviews();
  }

  // If Supabase returned empty array, fallback to backup (may happen during migration or if table is empty)
  if (!data || data.length === 0) {
    console.warn('[Database] Supabase returned empty all reviews; falling back to JSON backup.');
    const b = await getBackup();
    return b.getAllReviews();
  }

  try {
    return data.map(mapToReviewData);
  } catch (mapError) {
    console.error('[Database] Error mapping all reviews data:', mapError);
    console.log('[DB] Falling back to backup due to mapping error');
    const b = await getBackup();
    return b.getAllReviews();
  }
}

export async function getReviewSummaries(): Promise<ReviewSummary[]> {
  if (!supabase) { const b = await getBackup(); return b.getReviewSummaries(); }
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Database] Error fetching review summaries:', error);
    return [];
  }

  return data.map(mapToReviewSummary);
}

export async function getPublishedReviews(): Promise<ReviewData[]> {
  console.log('[DB] getPublishedReviews called');
  // If Supabase is not configured, use backup directly
  if (!supabase) { 
    console.log('[DB] Supabase not configured, using backup');
    const b = await getBackup(); 
    return b.getPublishedReviews(); 
  }

  // Query Supabase
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Database] Error fetching published reviews:', error);
    console.log('[DB] Falling back to backup due to error');
    // Fallback to backup on Supabase error
    const b = await getBackup();
    return b.getPublishedReviews();
  }

  console.log(`[DB] Supabase returned ${data?.length ?? 0} published reviews`);
  // If Supabase returned empty array, fallback to backup (may happen during migration or if table is empty)
  if (!data || data.length === 0) {
    console.warn('[Database] Supabase returned empty published reviews; falling back to JSON backup.');
    const b = await getBackup();
    return b.getPublishedReviews();
  }

  console.log('[DB] Mapping Supabase data');
  try {
    return data.map(mapToReviewData);
  } catch (mapError) {
    console.error('[Database] Error mapping published reviews data:', mapError);
    console.log('[DB] Falling back to backup due to mapping error');
    const b = await getBackup();
    return b.getPublishedReviews();
  }
}

export async function getReviewById(id: string): Promise<ReviewData | undefined> {
  if (!supabase) { const b = await getBackup(); return b.getReviewById(id); }
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error('[Database] Error fetching review by id:', error);
    return undefined;
  }

  return mapToReviewData(data);
}

export async function getReviewBySlug(slug: string): Promise<ReviewData | undefined> {
  // If Supabase is not configured, use backup directly
  if (!supabase) { 
    const b = await getBackup(); 
    return b.getReviewBySlug(slug); 
  }

  // Query Supabase directly (not via RPC, which may not exist)
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error('[Database] Error fetching review by slug:', error);
    // Fallback to backup on Supabase error
    const b = await getBackup();
    return b.getReviewBySlug(slug);
  }

  return mapToReviewData(data);
}

export async function createReview(data: Omit<ReviewData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!supabase) { const b = await getBackup(); return b.createReview(data); }
  const insertData = {
    slug: data.slug,
    status: data.status,
    product: data.product,
    category: data.category,
    marketplace: data.marketplace,
    price_old: data.priceOld,
    price_new: data.priceNew,
    affiliate_url: data.affiliateUrl,
    image_url: data.imageUrl,
    ads_enabled: data.adsEnabled,
    meta_title: data.meta.title,
    meta_description: data.meta.description,
    meta_keywords: data.meta.keywords,
    meta_reading_time: data.meta.readingTime,
    meta_canonical: data.meta.canonical,
    meta_og_image: data.meta.ogImage,
    hero_headline_line1: data.hero.headlineLine1,
    hero_headline_line2: data.hero.headlineLine2,
    hero_headline_em: data.hero.headlineEm,
    hero_lead: data.hero.lead,
    hero_overall_score: data.hero.overallScore,
    hero_bars: data.hero.bars,
    specs: data.specs,
    sections: data.sections,
    compare_table: data.compareTable,
    pros: data.pros,
    cons: data.cons,
    testimonials: data.testimonials,
    verdict_score: data.verdict.score,
    verdict_label: data.verdict.label,
    verdict_text: data.verdict.text,
    verdict_note: data.verdict.note,
    schema_rating_value: data.schemaRating.ratingValue,
    schema_review_count: data.schemaRating.reviewCount,
    google_rank: data.googleRank,
    last_rank_check: data.lastRankCheck,
  };

  const { data: inserted, error } = await supabase
    .from('reviews')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[Database] Error creating review:', error);
    throw new Error(`Failed to create review: ${error.message}`);
  }

  return inserted.id;
}

export async function updateReview(id: string, patch: Partial<Omit<ReviewData, 'id' | 'createdAt'>>): Promise<boolean> {
  if (!supabase) { const b = await getBackup(); return b.updateReview(id, patch as any); }
  const updateData: any = {};

  if (patch.slug !== undefined) updateData.slug = patch.slug;
  if (patch.status !== undefined) updateData.status = patch.status;
  if (patch.product !== undefined) updateData.product = patch.product;
  if (patch.category !== undefined) updateData.category = patch.category;
  if (patch.marketplace !== undefined) updateData.marketplace = patch.marketplace;
  if (patch.priceOld !== undefined) updateData.price_old = patch.priceOld;
  if (patch.priceNew !== undefined) updateData.price_new = patch.priceNew;
  if (patch.affiliateUrl !== undefined) updateData.affiliate_url = patch.affiliateUrl;
  if (patch.imageUrl !== undefined) updateData.image_url = patch.imageUrl;
  if (patch.adsEnabled !== undefined) updateData.ads_enabled = patch.adsEnabled;

  if (patch.meta) {
    if (patch.meta.title !== undefined) updateData.meta_title = patch.meta.title;
    if (patch.meta.description !== undefined) updateData.meta_description = patch.meta.description;
    if (patch.meta.keywords !== undefined) updateData.meta_keywords = patch.meta.keywords;
    if (patch.meta.readingTime !== undefined) updateData.meta_reading_time = patch.meta.readingTime;
    if (patch.meta.canonical !== undefined) updateData.meta_canonical = patch.meta.canonical;
    if (patch.meta.ogImage !== undefined) updateData.meta_og_image = patch.meta.ogImage;
  }

  if (patch.hero) {
    if (patch.hero.headlineLine1 !== undefined) updateData.hero_headline_line1 = patch.hero.headlineLine1;
    if (patch.hero.headlineLine2 !== undefined) updateData.hero_headline_line2 = patch.hero.headlineLine2;
    if (patch.hero.headlineEm !== undefined) updateData.hero_headline_em = patch.hero.headlineEm;
    if (patch.hero.lead !== undefined) updateData.hero_lead = patch.hero.lead;
    if (patch.hero.overallScore !== undefined) updateData.hero_overall_score = patch.hero.overallScore;
    if (patch.hero.bars !== undefined) updateData.hero_bars = patch.hero.bars;
  }

  if (patch.specs !== undefined) updateData.specs = patch.specs;
  if (patch.sections !== undefined) updateData.sections = patch.sections;
  if (patch.compareTable !== undefined) updateData.compare_table = patch.compareTable;
  if (patch.pros !== undefined) updateData.pros = patch.pros;
  if (patch.cons !== undefined) updateData.cons = patch.cons;
  if (patch.faq !== undefined) updateData.faq = patch.faq;
  if (patch.testimonials !== undefined) updateData.testimonials = patch.testimonials;

  if (patch.verdict) {
    if (patch.verdict.score !== undefined) updateData.verdict_score = patch.verdict.score;
    if (patch.verdict.label !== undefined) updateData.verdict_label = patch.verdict.label;
    if (patch.verdict.text !== undefined) updateData.verdict_text = patch.verdict.text;
    if (patch.verdict.note !== undefined) updateData.verdict_note = patch.verdict.note;
  }

  if (patch.schemaRating) {
    if (patch.schemaRating.ratingValue !== undefined) updateData.schema_rating_value = patch.schemaRating.ratingValue;
    if (patch.schemaRating.reviewCount !== undefined) updateData.schema_review_count = patch.schemaRating.reviewCount;
  }

  if (patch.googleRank !== undefined) updateData.google_rank = patch.googleRank;
  if (patch.lastRankCheck !== undefined) updateData.last_rank_check = patch.lastRankCheck;

  const fieldCount = Object.keys(updateData).length;
  console.log(`[Database] Updating review ${id} with ${fieldCount} fields: ${Object.keys(updateData).join(', ')}`);

  const { data, error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', id)
    .select('id');

  if (error) {
    if (error.code === 'PGRST116') {
      console.warn(`[Database] Review ${id} not found for update`);
      return false;
    }
    console.error('[Database] Error updating review:', error);
    throw new Error(`Failed to update review: ${error.message}`);
  }

  const matched = data?.length ?? 0;
  console.log(`[Database] Review ${id} update result: ${matched} row(s) matched, fields sent: ${fieldCount}`);
  return matched > 0;
}

export async function deleteReview(id: string): Promise<boolean> {
  if (!supabase) { const b = await getBackup(); return b.deleteReview(id); }
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === 'PGRST116') return false;
    console.error('[Database] Error deleting review:', error);
    throw new Error(`Failed to delete review: ${error.message}`);
  }

  return true;
}

export async function getPublishedSlugs(): Promise<string[]> {
  if (!supabase) { const b = await getBackup(); return b.getPublishedSlugs(); }
  const { data, error } = await supabase
    .from('reviews')
    .select('slug')
    .eq('status', 'published');

  if (error) {
    console.error('[Database] Error fetching published slugs:', error);
    return [];
  }

  return data.map(r => r.slug);
}
