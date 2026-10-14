CREATE TABLE IF NOT EXISTS public.admin_login_rate_limits (
  subject_hash text PRIMARY KEY CHECK (subject_hash ~ '^[0-9a-f]{64}$'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_login_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_login_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_login_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.record_admin_login_failure(p_subject_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF p_subject_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid login subject hash';
  END IF;

  INSERT INTO public.admin_login_rate_limits
    (subject_hash, attempts, window_started_at, blocked_until, updated_at)
  VALUES
    (p_subject_hash, 1, pg_catalog.now(), NULL, pg_catalog.now())
  ON CONFLICT (subject_hash) DO UPDATE
  SET
    attempts = CASE
      WHEN public.admin_login_rate_limits.window_started_at < pg_catalog.now() - interval '15 minutes'
        THEN 1
      ELSE public.admin_login_rate_limits.attempts + 1
    END,
    window_started_at = CASE
      WHEN public.admin_login_rate_limits.window_started_at < pg_catalog.now() - interval '15 minutes'
        THEN pg_catalog.now()
      ELSE public.admin_login_rate_limits.window_started_at
    END,
    blocked_until = CASE
      WHEN public.admin_login_rate_limits.window_started_at < pg_catalog.now() - interval '15 minutes'
        THEN NULL
      WHEN public.admin_login_rate_limits.attempts + 1 >= 5
        THEN pg_catalog.now() + interval '15 minutes'
      ELSE public.admin_login_rate_limits.blocked_until
    END,
    updated_at = pg_catalog.now();

  DELETE FROM public.admin_login_rate_limits
  WHERE updated_at < pg_catalog.now() - interval '2 days';
END;
$function$;

REVOKE ALL ON FUNCTION public.record_admin_login_failure(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_login_failure(text) TO service_role;
