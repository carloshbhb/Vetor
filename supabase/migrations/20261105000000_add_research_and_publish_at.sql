-- Add research cache column to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS research jsonb;

-- Add scheduled publish timestamp to video_queue
ALTER TABLE video_queue ADD COLUMN IF NOT EXISTS publish_at timestamptz;

-- Index for slot lookup by day
CREATE INDEX IF NOT EXISTS idx_video_queue_publish_at ON video_queue (publish_at);
