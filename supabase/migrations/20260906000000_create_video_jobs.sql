-- Fila de vídeos (backlog 6/dia + reviews novos do dia)
-- Roda com: npx supabase db push  (ou aplique no SQL Editor do Supabase)

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'script_ready'
    CHECK (status IN ('script_ready','rendering','ready_mp4','published','failed')),
  script JSONB NOT NULL DEFAULT '{}'::jsonb,
  youtube_video_id TEXT,
  youtube_url TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_slug ON video_jobs(slug);

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages video jobs" ON video_jobs;
CREATE POLICY "Service role manages video jobs" ON video_jobs
  FOR ALL USING (true) WITH CHECK (true);
