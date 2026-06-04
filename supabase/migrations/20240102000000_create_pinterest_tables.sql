-- Create pinterest_config table
CREATE TABLE IF NOT EXISTS pinterest_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  board_id TEXT NOT NULL,
  board_name TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pinterest_scheduled_pins table
CREATE TABLE IF NOT EXISTS pinterest_scheduled_pins (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL,
  review_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  pin_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pinterest_pins_status ON pinterest_scheduled_pins(status);
CREATE INDEX IF NOT EXISTS idx_pinterest_pins_scheduled_at ON pinterest_scheduled_pins(scheduled_at);

-- Enable Row Level Security (RLS)
ALTER TABLE pinterest_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinterest_scheduled_pins ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can do everything on pinterest_config" ON pinterest_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on pinterest_scheduled_pins" ON pinterest_scheduled_pins
  FOR ALL USING (auth.role() = 'service_role');
