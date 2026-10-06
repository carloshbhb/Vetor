-- Metadados comerciais, UTM, frescor e sincronização review -> affiliate_links.
-- Compatível com a infraestrutura já aplicada em produção.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS product_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affiliate_tag text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS affiliate_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price numeric(12,2);

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;

CREATE INDEX IF NOT EXISTS affiliate_clicks_campaign_idx
  ON public.affiliate_clicks (utm_source, utm_medium, utm_campaign);

CREATE TABLE IF NOT EXISTS public.affiliate_offer_freshness (
  link_id uuid PRIMARY KEY REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  last_checked_at timestamptz NULL,
  stale_after_days integer NOT NULL DEFAULT 7 CHECK (stale_after_days BETWEEN 1 AND 90),
  is_stale boolean NOT NULL DEFAULT true,
  stale_since timestamptz NULL,
  reason text NOT NULL DEFAULT 'Nunca conferido',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_offer_freshness ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.affiliate_offer_freshness FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_offer_freshness TO service_role;

CREATE INDEX IF NOT EXISTS affiliate_offer_freshness_stale_idx
  ON public.affiliate_offer_freshness (is_stale, stale_since DESC);

CREATE OR REPLACE FUNCTION private.refresh_affiliate_offer_freshness()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.affiliate_offer_freshness
    (link_id,last_checked_at,stale_after_days,is_stale,stale_since,reason,updated_at)
  SELECT
    l.id,
    l.affiliate_checked_at,
    7,
    (
      l.affiliate_checked_at IS NOT NULL
      AND l.affiliate_checked_at < now() - interval '7 days'
    ),
    CASE
      WHEN l.affiliate_checked_at IS NOT NULL
       AND l.affiliate_checked_at < now() - interval '7 days' THEN l.affiliate_checked_at
      ELSE NULL
    END,
    CASE
      WHEN l.affiliate_checked_at IS NULL THEN 'Nunca conferido'
      WHEN l.affiliate_checked_at < now() - interval '7 days' THEN 'Conferência comercial antiga'
      ELSE 'Atual'
    END,
    now()
  FROM public.affiliate_links l
  WHERE l.status = 'active'
  ON CONFLICT (link_id) DO UPDATE SET
    last_checked_at=EXCLUDED.last_checked_at,
    stale_after_days=EXCLUDED.stale_after_days,
    is_stale=EXCLUDED.is_stale,
    stale_since=EXCLUDED.stale_since,
    reason=EXCLUDED.reason,
    updated_at=now();

  DELETE FROM public.affiliate_offer_freshness f
  WHERE NOT EXISTS (
    SELECT 1 FROM public.affiliate_links l
    WHERE l.id=f.link_id AND l.status='active'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.refresh_affiliate_offer_freshness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.refresh_affiliate_offer_freshness() TO service_role;

CREATE OR REPLACE FUNCTION private.sync_review_offer_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  parsed_price numeric(12,2);
  cleaned text;
BEGIN
  cleaned := regexp_replace(coalesce(NEW.price_new, ''), '[^0-9.,]', '', 'g');

  IF cleaned = '' THEN
    parsed_price := NULL;
  ELSIF position(',' in cleaned) > 0 THEN
    parsed_price := NULLIF(replace(replace(cleaned, '.', ''), ',', '.'), '')::numeric;
  ELSE
    parsed_price := NULLIF(cleaned, '')::numeric;
  END IF;

  UPDATE public.affiliate_links
  SET
    name=coalesce(nullif(NEW.product,''),name),
    marketplace=coalesce(nullif(NEW.marketplace,''),marketplace),
    destination_url=coalesce(nullif(NEW.affiliate_url,''),destination_url),
    image_url=coalesce(nullif(NEW.image_url,''),image_url),
    price=parsed_price,
    updated_at=now()
  WHERE source_type='review' AND source_ref=NEW.slug;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.sync_review_offer_metadata() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.sync_review_offer_metadata() TO service_role;

DROP TRIGGER IF EXISTS reviews_sync_affiliate_offer_metadata ON public.reviews;
CREATE TRIGGER reviews_sync_affiliate_offer_metadata
AFTER INSERT OR UPDATE OF product, marketplace, affiliate_url, image_url, price_new
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION private.sync_review_offer_metadata();

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname='vetor-affiliate-offer-freshness';

SELECT cron.schedule(
  'vetor-affiliate-offer-freshness',
  '15 4 * * *',
  $$SELECT private.refresh_affiliate_offer_freshness();$$
);

SELECT private.refresh_affiliate_offer_freshness();
