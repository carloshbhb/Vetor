-- Remove default broad grants from internal tables. RLS does not protect against TRUNCATE.
REVOKE ALL ON TABLE public.agent_metrics FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_citations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.alerts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.comments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.error_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.health_checks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.market_trend_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.seo_keyword_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.seo_keywords FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.web_vitals FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.agent_metrics TO service_role;
GRANT ALL ON TABLE public.ai_citations TO service_role;
GRANT ALL ON TABLE public.alerts TO service_role;
GRANT ALL ON TABLE public.comments TO service_role;
GRANT ALL ON TABLE public.error_logs TO service_role;
GRANT ALL ON TABLE public.health_checks TO service_role;
GRANT ALL ON TABLE public.market_trend_events TO service_role;
GRANT ALL ON TABLE public.seo_keyword_snapshots TO service_role;
GRANT ALL ON TABLE public.seo_keywords TO service_role;
GRANT ALL ON TABLE public.web_vitals TO service_role;

-- Preserve only the anonymous read access required for the public site.
REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO service_role;

REVOKE ALL ON TABLE public.viral_articles FROM PUBLIC, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.viral_articles FROM anon;
GRANT SELECT ON TABLE public.viral_articles TO anon;
GRANT ALL ON TABLE public.viral_articles TO service_role;
