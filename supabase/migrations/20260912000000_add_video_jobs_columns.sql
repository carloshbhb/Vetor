-- Colunas adicionais usadas pelo lib/video-queue.ts (premium/viral scores)
-- e pelo pipeline remotion. Previne PGRST204 no upsert de video_jobs.
ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS packaging_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS viral_score NUMERIC,
  ADD COLUMN IF NOT EXISTS ctr_estimate NUMERIC,
  ADD COLUMN IF NOT EXISTS hook_score NUMERIC,
  ADD COLUMN IF NOT EXISTS retention_score NUMERIC,
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_source ON video_jobs(source);