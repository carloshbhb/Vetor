-- Internal worker queue: server-side service role only.
-- RLS and SQL grants are both required; policies alone do not revoke table privileges.
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.video_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.video_jobs TO service_role;

DROP POLICY IF EXISTS "Service role manages video jobs" ON public.video_jobs;
CREATE POLICY "Service role manages video jobs"
  ON public.video_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
