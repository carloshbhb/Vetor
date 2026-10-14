-- Fix the legacy public read RPC: the SELECT must exactly match its 39-column RETURNS TABLE contract.
CREATE OR REPLACE FUNCTION public.get_review_by_slug(slug_param text)
RETURNS TABLE(
  id uuid,
  slug text,
  status text,
  product text,
  category text,
  marketplace text,
  price_old text,
  price_new text,
  affiliate_url text,
  image_url text,
  ads_enabled boolean,
  meta_title text,
  meta_description text,
  meta_keywords text,
  meta_reading_time integer,
  meta_canonical text,
  meta_og_image text,
  hero_headline_line1 text,
  hero_headline_line2 text,
  hero_headline_em text,
  hero_lead text,
  hero_overall_score numeric,
  hero_bars jsonb,
  specs jsonb,
  sections jsonb,
  compare_table jsonb,
  pros text[],
  cons text[],
  testimonials jsonb,
  verdict_score numeric,
  verdict_label text,
  verdict_text text,
  verdict_note text,
  schema_rating_value numeric,
  schema_review_count integer,
  google_rank integer,
  last_rank_check timestamp without time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.slug, r.status, r.product, r.category, r.marketplace,
    r.price_old, r.price_new, r.affiliate_url, r.image_url, r.ads_enabled,
    r.meta_title, r.meta_description, r.meta_keywords, r.meta_reading_time,
    r.meta_canonical, r.meta_og_image, r.hero_headline_line1, r.hero_headline_line2,
    r.hero_headline_em, r.hero_lead, r.hero_overall_score, r.hero_bars, r.specs,
    r.sections, r.compare_table, r.pros, r.cons, r.testimonials, r.verdict_score,
    r.verdict_label, r.verdict_text, r.verdict_note, r.schema_rating_value,
    r.schema_review_count, r.google_rank, r.last_rank_check, r.created_at, r.updated_at
  FROM public.reviews AS r
  WHERE r.slug = slug_param
    AND r.status = 'published';
END;
$function$;
