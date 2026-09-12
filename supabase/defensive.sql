-- ============================================================================
-- Defesas contra egress (economia de banda no plano free)
-- Consultas "SELECT *" de todas as linhas geram ~2 MB por request. Estas
-- funções SECURITY DEFINER retornam APENAS as colunas de vitrine, então o
-- payload cai para poucos KB — é uma trava no banco, independente do código.
-- ============================================================================

-- 1) Cards de vitrine (home, sitemap, RSS, categoria, relacionados)
--    ~12 colunas texto curto por linha (vs dezenas de KB de specs/sections/faq).
DROP FUNCTION IF EXISTS public.get_review_cards();
CREATE OR REPLACE FUNCTION public.get_review_cards()
RETURNS TABLE (
  id uuid,
  slug text,
  product text,
  category text,
  price_new text,
  image_url text,
  hero_overall_score numeric,
  hero_lead text,
  meta_title text,
  meta_description text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.product, r.category, r.price_new, r.image_url,
         r.hero_overall_score, r.hero_lead, r.meta_title, r.meta_description,
         r.created_at, r.updated_at
  FROM reviews r
  WHERE r.status = 'published'
  ORDER BY r.created_at DESC;
$$;

-- 2) Resumos para listas administrativas/research (sem specs/sections/faq)
DROP FUNCTION IF EXISTS public.get_review_summaries();
CREATE OR REPLACE FUNCTION public.get_review_summaries()
RETURNS TABLE (
  id uuid,
  slug text,
  status text,
  product text,
  category text,
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
  ads_enabled boolean,
  created_at timestamptz,
  updated_at timestamptz,
  google_rank integer,
  last_rank_check timestamp
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.status, r.product, r.category,
         r.meta_title, r.meta_description, r.meta_keywords, r.meta_reading_time,
         r.meta_canonical, r.meta_og_image,
         r.hero_headline_line1, r.hero_headline_line2, r.hero_headline_em,
         r.hero_lead, r.hero_overall_score, r.hero_bars,
         r.ads_enabled, r.created_at, r.updated_at,
         r.google_rank, r.last_rank_check
  FROM reviews r
  ORDER BY r.created_at DESC;
$$;

-- 3) Comforto: permite que o app peça APENAS estas colunas via REST também
COMMENT ON FUNCTION public.get_review_cards() IS 'Cards leves p/ vitrine (home/sitemap/rss/categoria). Retorna só colunas de listagem p/ não estourar egress.';
COMMENT ON FUNCTION public.get_review_summaries() IS 'Resumos leves de reviews (admin/research) sem JSONB pesados.';