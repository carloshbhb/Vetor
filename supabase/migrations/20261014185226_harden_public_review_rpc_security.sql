-- Harden legacy public read RPCs by using caller privileges instead of SECURITY DEFINER.
ALTER FUNCTION public.get_published_reviews() SECURITY INVOKER;
ALTER FUNCTION public.get_review_by_slug(text) SECURITY INVOKER;

-- The website only needs anonymous access to published review data through these RPCs.
REVOKE EXECUTE ON FUNCTION public.get_published_reviews() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_published_reviews() TO anon;

REVOKE EXECUTE ON FUNCTION public.get_review_by_slug(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_by_slug(text) TO anon;

-- This trigger only touches NEW.updated_at and now(); it needs no mutable search path.
ALTER FUNCTION public.product_links_touch_updated_at() SET search_path = '';
