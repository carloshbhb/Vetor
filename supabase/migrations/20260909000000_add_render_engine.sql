-- Adiciona coluna render_engine para suportar múltiplos renderizadores
-- ffmpeg (padrão, 30/dia) e remotion (premium, 1/dia)
ALTER TABLE video_jobs
  ADD COLUMN IF NOT EXISTS render_engine TEXT DEFAULT 'ffmpeg'
  CHECK (render_engine IN ('ffmpeg', 'remotion'));

CREATE INDEX IF NOT EXISTS idx_video_jobs_render_engine ON video_jobs(render_engine);
