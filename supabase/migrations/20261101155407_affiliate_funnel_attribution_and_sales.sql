-- Affiliate funnel attribution, product/video associations and marketplace sales ledger.
-- This source migration mirrors production migration version 20261101155407.
BEGIN;

ALTER TABLE public.affiliate_clicks
  ALTER COLUMN link_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS request_path text,
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS click_source text,
  ADD COLUMN IF NOT EXISTS click_medium text,
  ADD COLUMN IF NOT EXISTS click_campaign text,
  ADD COLUMN IF NOT EXISTS content_id text,
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS cta_position text,
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS destination_host text;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_clicks_event_id_uidx ON public.affiliate_clicks(event_id);
CREATE INDEX IF NOT EXISTS affiliate_clicks_product_slug_clicked_idx ON public.affiliate_clicks(product_slug,clicked_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_clicks_source_clicked_idx ON public.affiliate_clicks(click_source,click_medium,clicked_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_clicks_content_id_idx ON public.affiliate_clicks(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS affiliate_clicks_video_id_idx ON public.affiliate_clicks(video_id) WHERE video_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_video_assets(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_link_id uuid NOT NULL REFERENCES public.product_links(id) ON DELETE CASCADE,
  review_slug text NOT NULL,
  youtube_video_id text NOT NULL UNIQUE,
  youtube_url text NOT NULL,
  video_type text NOT NULL DEFAULT 'unknown' CHECK(video_type IN ('short','long','live','unknown')),
  source_table text NOT NULL DEFAULT 'video_queue' CHECK(source_table IN ('video_queue','video_jobs')),
  source_record_id uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_video_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_video_assets FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.product_video_assets TO service_role;
CREATE INDEX IF NOT EXISTS product_video_assets_product_published_idx ON public.product_video_assets(product_link_id,published_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_sales(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL DEFAULT 'Mercado Livre',
  external_order_id text,
  source_reference text,
  product_title text NOT NULL,
  marketplace_item_id text,
  product_link_id uuid REFERENCES public.product_links(id) ON DELETE SET NULL,
  affiliate_link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0),
  sold_at timestamptz,
  reported_at timestamptz NOT NULL DEFAULT now(),
  sale_amount numeric(12,2) CHECK(sale_amount IS NULL OR sale_amount>=0),
  commission_amount numeric(12,2) CHECK(commission_amount IS NULL OR commission_amount>=0),
  currency text NOT NULL DEFAULT 'BRL',
  order_status text NOT NULL DEFAULT 'pending' CHECK(order_status IN ('reported_unverified','pending','approved','rejected','cancelled','returned')),
  attribution_status text NOT NULL DEFAULT 'pending_verification' CHECK(attribution_status IN ('pending_verification','unknown','attributed','unattributed')),
  attribution_source text NOT NULL DEFAULT 'unknown' CHECK(attribution_source IN ('unknown','website_review','youtube_video','other','user_reported')),
  attribution_confidence integer NOT NULL DEFAULT 0 CHECK(attribution_confidence BETWEEN 0 AND 100),
  video_id text,
  review_slug text,
  source_system text NOT NULL DEFAULT 'marketplace_portal' CHECK(source_system IN ('marketplace_portal','marketplace_export','user_reported','manual')),
  notes text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.affiliate_sales FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.affiliate_sales TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_sales_external_order_uidx ON public.affiliate_sales(marketplace,external_order_id) WHERE external_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_sales_source_reference_uidx ON public.affiliate_sales(marketplace,source_reference) WHERE source_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS affiliate_sales_reported_idx ON public.affiliate_sales(reported_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_sales_product_sold_idx ON public.affiliate_sales(marketplace_item_id,sold_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_sales_attribution_idx ON public.affiliate_sales(attribution_status,attribution_source,sold_at DESC);

INSERT INTO public.product_video_assets(product_link_id,review_slug,youtube_video_id,youtube_url,video_type,source_table,source_record_id,published_at)
SELECT pl.id,pl.review_slug,q.youtube_video_id,q.youtube_url,
  COALESCE((
    SELECT CASE WHEN asset->>'format' IN ('short','long') THEN asset->>'format' ELSE NULL END
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(q.media_assets)='array' THEN q.media_assets ELSE '[]'::jsonb END) AS asset
    WHERE asset->>'type'='publication_format' LIMIT 1
  ),'unknown'),
  'video_queue',q.id,q.completed_at
FROM public.video_queue q
JOIN public.product_links pl
  ON pl.review_slug=regexp_replace(split_part(q.review_url,'/reviews/',2),'/.*$','')
WHERE q.status='completed' AND NULLIF(q.youtube_video_id,'') IS NOT NULL
  AND NULLIF(q.youtube_url,'') IS NOT NULL AND q.review_url LIKE 'https://www.vetor.blog/reviews/%'
ON CONFLICT(youtube_video_id) DO NOTHING;

INSERT INTO public.product_video_assets(product_link_id,review_slug,youtube_video_id,youtube_url,video_type,source_table,source_record_id,published_at)
SELECT pl.id,pl.review_slug,j.youtube_video_id,j.youtube_url,'unknown','video_jobs',j.id,j.updated_at
FROM public.video_jobs j JOIN public.product_links pl ON pl.review_slug=j.slug
WHERE j.status='published' AND NULLIF(j.youtube_video_id,'') IS NOT NULL
  AND NULLIF(j.youtube_url,'') IS NOT NULL
ON CONFLICT(youtube_video_id) DO NOTHING;

UPDATE public.product_links pl SET has_video=true,
  video_id=(SELECT pva.youtube_video_id FROM public.product_video_assets pva
    WHERE pva.product_link_id=pl.id ORDER BY pva.published_at DESC NULLS LAST,pva.created_at DESC LIMIT 1),
  updated_at=now()
WHERE EXISTS(SELECT 1 FROM public.product_video_assets pva WHERE pva.product_link_id=pl.id);

INSERT INTO public.affiliate_sales(
  marketplace,source_reference,product_title,quantity,order_status,attribution_status,
  attribution_source,attribution_confidence,source_system,notes,metadata
) VALUES (
  'Mercado Livre','user-reported-redmi-pad-2-pro-128gb-2026-11-01',
  'Tablet Xiaomi Redmi Pad 2 Pro 12.1 6gb Ram 128gb Cinza Escuro Graphite Gray',
  1,'reported_unverified','pending_verification','user_reported',0,'user_reported',
  'Venda informada pelo proprietário. Data, ID do pedido, valor, comissão e origem (vídeo ou review) não informados. Mantida separada do cadastro do Vetor de 256 GB até confirmar a variação.',
  '{"ram":"6 GB","storage":"128 GB","color":"Cinza Escuro / Graphite Gray","attribution":"not_determined"}'::jsonb
)
ON CONFLICT(marketplace,source_reference) WHERE source_reference IS NOT NULL DO NOTHING;

COMMIT;
