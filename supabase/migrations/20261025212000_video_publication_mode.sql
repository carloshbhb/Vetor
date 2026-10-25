-- Track whether a completed YouTube upload came from a scheduled batch or a manual dispatch.
-- Automatic quota counts only scheduled publications; manual dispatches remain independently runnable.
ALTER TABLE public.video_queue
  ADD COLUMN IF NOT EXISTS publication_mode text NOT NULL DEFAULT 'automatic';

DO $$
BEGIN
  ALTER TABLE public.video_queue
    ADD CONSTRAINT video_queue_publication_mode_check
    CHECK (publication_mode IN ('automatic', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_video_queue_automatic_quota
  ON public.video_queue (completed_at)
  WHERE status = 'completed' AND publication_mode = 'automatic';
