import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

export async function upsertReviewDirect(review) {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('reviews')
    .select('created_at,status,affiliate_url,image_url')
    .eq('slug', review.slug)
    .maybeSingle();

  const row = {
    slug: review.slug,
    status: review.status || existing?.status || 'published',
    product: review.product,
    category: review.category,
    marketplace: review.marketplace || 'mercadolivre',
    price_old: review.price_old || '',
    price_new: review.price_new || '',
    affiliate_url: review.affiliate_url || existing?.affiliate_url || '',
    image_url: review.image_url || existing?.image_url || '',
    ads_enabled: review.ads_enabled ?? true,
    meta_title: review.meta_title || '',
    meta_description: review.meta_description || '',
    meta_keywords: review.meta_keywords || '',
    meta_reading_time: review.meta_reading_time || 8,
    hero_headline_line1: review.hero_headline_line1 || 'Análise Completa:',
    hero_headline_line2: review.hero_headline_line2 || review.product,
    hero_headline_em: review.hero_headline_em || 'Vale a pena?',
    hero_lead: review.hero_lead || '',
    hero_overall_score: review.verdict_score || review.hero_overall_score || 8.5,
    hero_bars: review.hero_bars || [],
    specs: review.specs || [],
    sections: review.sections || [],
    compare_table: review.compare_table || { rows: [], caption: '', columns: [], winnerCol: 0 },
    pros: review.pros || [],
    cons: review.cons || [],
    testimonials: review.testimonials || [],
    verdict_score: review.verdict_score || review.hero_overall_score || 8.5,
    verdict_label: review.verdict_label || 'RECOMENDADO',
    verdict_text: review.verdict_text || '',
    verdict_note: review.verdict_note || '',
    schema_rating_value: review.schema_rating_value || (review.verdict_score ? Number((review.verdict_score / 2).toFixed(2)) : 4.25),
    schema_review_count: review.schema_review_count || 1,
    created_at: existing?.created_at || now,
    updated_at: now,
    faq: review.faq || [],
  };

  const { data, error } = await supabase
    .from('reviews')
    .upsert(row, { onConflict: 'slug' })
    .select('slug')
    .single();

  if (error) {
    console.error(`  ✗ Falha no upsert de ${review.slug}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${review.slug} salvo no Supabase com sucesso!`);
  return true;
}
