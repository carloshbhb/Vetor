-- Limit editorial and operational tables to the server-side service role.
-- Public readers can only SELECT rows approved by the existing published-review RLS policy.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_notification_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reviews FROM anon;
GRANT SELECT ON TABLE public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO service_role;

DROP POLICY IF EXISTS "Authenticated can manage all" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated can read all" ON public.reviews;

REVOKE ALL ON TABLE public.product_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_links TO service_role;
DROP POLICY IF EXISTS "Authenticated users can manage product links" ON public.product_links;
DROP POLICY IF EXISTS "Public can read product links" ON public.product_links;

REVOKE ALL ON TABLE public.product_pool FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_pool TO service_role;

REVOKE ALL ON TABLE public.video_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.video_queue TO service_role;

REVOKE ALL ON TABLE public.ml_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ml_tokens TO service_role;
DROP POLICY IF EXISTS "Service role can do everything on ml_tokens" ON public.ml_tokens;

REVOKE ALL ON TABLE public.ml_notification_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ml_notification_events TO service_role;
