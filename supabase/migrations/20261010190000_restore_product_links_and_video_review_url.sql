-- Restore the product queue required by src/lib/product-links.ts from the canonical affiliate registry.
CREATE TABLE IF NOT EXISTS public.product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL DEFAULT 'Geral',
  product_url text NOT NULL,
  affiliate_url text,
  image_url text,
  marketplace text NOT NULL DEFAULT 'mercadolivre'
    CHECK (marketplace IN ('mercadolivre', 'amazon', 'multi')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'reviewed', 'video_generated', 'archived')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'websearch', 'scraped', 'api')),
  has_review boolean NOT NULL DEFAULT false,
  has_video boolean NOT NULL DEFAULT false,
  review_slug text,
  video_id text,
  price text,
  score numeric,
  priority integer NOT NULL DEFAULT 0,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS has_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS has_video boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS review_slug text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS video_id text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS affiliate_url text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS product_url text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS price text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS score numeric;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.product_links ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.product_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can do anything" ON public.product_links;
DROP POLICY IF EXISTS "Anonymous users can read" ON public.product_links;
DROP POLICY IF EXISTS "Authenticated users can manage product links" ON public.product_links;
DROP POLICY IF EXISTS "Public can read product links" ON public.product_links;
CREATE POLICY "Authenticated users can manage product links"
  ON public.product_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can read product links"
  ON public.product_links FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_product_links_category ON public.product_links (category);
CREATE INDEX IF NOT EXISTS idx_product_links_status ON public.product_links (status);
CREATE INDEX IF NOT EXISTS idx_product_links_has_review ON public.product_links (has_review);
CREATE INDEX IF NOT EXISTS idx_product_links_has_video ON public.product_links (has_video);

CREATE OR REPLACE FUNCTION public.product_links_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS product_links_updated_at ON public.product_links;
CREATE TRIGGER product_links_updated_at BEFORE UPDATE ON public.product_links
FOR EACH ROW EXECUTE FUNCTION public.product_links_touch_updated_at();

INSERT INTO public.product_links
  (slug, product_name, category, product_url, affiliate_url, image_url, marketplace,
   status, source, has_review, has_video, review_slug, price, priority, notes, tags,
   created_at, updated_at)
SELECT
  al.slug,
  COALESCE(NULLIF(BTRIM(al.name), ''), al.slug),
  COALESCE(NULLIF(BTRIM(al.category), ''), 'Geral'),
  COALESCE(NULLIF(BTRIM(al.product_url), ''), al.destination_url),
  al.destination_url,
  al.image_url,
  CASE
    WHEN LOWER(COALESCE(al.marketplace, '')) LIKE '%amazon%' THEN 'amazon'
    WHEN LOWER(COALESCE(al.marketplace, '')) LIKE '%mercado%' THEN 'mercadolivre'
    ELSE 'multi'
  END,
  CASE WHEN al.status = 'active' THEN 'active' ELSE 'archived' END,
  CASE WHEN al.source_type = 'comparison_product' THEN 'api' ELSE 'manual' END,
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.slug = al.slug AND r.status = 'published'),
  false,
  CASE WHEN EXISTS (SELECT 1 FROM public.reviews r WHERE r.slug = al.slug AND r.status = 'published') THEN al.slug ELSE NULL END,
  al.price::text,
  COALESCE(al.priority, 0),
  al.notes,
  COALESCE(al.tags, '{}'),
  COALESCE(al.created_at, now()),
  COALESCE(al.updated_at, now())
FROM public.affiliate_links al
WHERE al.status = 'active'
  AND al.source_type IN ('review', 'comparison_product')
  AND COALESCE(NULLIF(BTRIM(al.product_url), ''), NULLIF(BTRIM(al.destination_url), '')) IS NOT NULL
ON CONFLICT (slug) DO NOTHING;

-- Restore details lost when older comparison links were imported into affiliate_links.
-- Product images and purchase URLs are already stored on each article's products JSON.
WITH comparison_products AS (
  SELECT
    al.slug,
    COALESCE(NULLIF(BTRIM(p.item->>'name'), ''), al.name) AS product_name,
    COALESCE(NULLIF(BTRIM(p.item->>'product_url'), ''), al.product_url, al.destination_url) AS product_url,
    NULLIF(BTRIM(p.item->>'imageUrl'), '') AS image_url,
    r.price_new AS review_price,
    r.image_url AS review_image
  FROM public.affiliate_links al
  JOIN public.viral_articles va
    ON al.source_ref LIKE 'comparativo:' || va.slug || '#%'
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(va.products, '[]'::jsonb))
    WITH ORDINALITY AS p(item, ordinality)
  LEFT JOIN public.reviews r
    ON r.slug = NULLIF(BTRIM(p.item->>'slug'), '')
  WHERE al.source_type = 'comparison_product'
    AND al.source_ref = 'comparativo:' || va.slug || '#' || p.ordinality::text
)
UPDATE public.product_links pl
SET
  product_name = COALESCE(NULLIF(cp.product_name, ''), pl.product_name),
  product_url = COALESCE(NULLIF(cp.product_url, ''), pl.product_url),
  image_url = COALESCE(NULLIF(cp.image_url, ''), NULLIF(cp.review_image, ''), NULLIF(pl.image_url, '')),
  price = COALESCE(NULLIF(cp.review_price, ''), NULLIF(pl.price, '')),
  updated_at = now()
FROM comparison_products cp
WHERE pl.slug = cp.slug;

ALTER TABLE public.video_queue ADD COLUMN IF NOT EXISTS review_url text;
CREATE INDEX IF NOT EXISTS idx_video_queue_review_url ON public.video_queue (review_url) WHERE review_url IS NOT NULL;
