-- Vetor Blog Database Schema
-- Run this in your Supabase SQL Editor

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  price text,
  category text,
  image text,
  score numeric DEFAULT 0,
  pros jsonb DEFAULT '[]'::jsonb,
  cons jsonb DEFAULT '[]'::jsonb,
  author_name text DEFAULT 'Editor Vetor',
  author_bio text DEFAULT 'Especialista em análise de produtos tech',
  seo_title text,
  seo_description text,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Viral Articles table
CREATE TABLE IF NOT EXISTS viral_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  category text,
  hero jsonb DEFAULT '{}'::jsonb,
  products jsonb DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);
CREATE INDEX IF NOT EXISTS idx_reviews_category ON reviews(category);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_viral_articles_slug ON viral_articles(slug);
CREATE INDEX IF NOT EXISTS idx_viral_articles_category ON viral_articles(category);
CREATE INDEX IF NOT EXISTS idx_viral_articles_published_at ON viral_articles(published_at DESC);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_articles ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for reviews"
  ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Public read access for viral_articles"
  ON viral_articles
  FOR SELECT
  USING (true);

-- Authenticated write access policies
CREATE POLICY "Authenticated insert for reviews"
  ON reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for reviews"
  ON reviews
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for reviews"
  ON reviews
  FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert for viral_articles"
  ON viral_articles
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for viral_articles"
  ON viral_articles
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for viral_articles"
  ON viral_articles
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Video Queue table
CREATE TABLE IF NOT EXISTS video_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_url text NOT NULL,
  product_title text,
  product_category text,
  product_price text,
  product_image_url text,
  affiliate_url text,
  shortened_affiliate_url text,
  script_text text,
  script_hook text,
  voiceover_url text,
  voiceover_duration numeric,
  media_assets jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  error_message text,
  video_url text,
  youtube_video_id text,
  youtube_url text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for video queue
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_queue_created_at ON video_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_queue_scheduled_at ON video_queue(scheduled_at);

-- Enable Row Level Security
ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for video_queue"
  ON video_queue
  FOR SELECT
  USING (true);

-- Authenticated write access policies
CREATE POLICY "Authenticated insert for video_queue"
  ON video_queue
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for video_queue"
  ON video_queue
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for video_queue"
  ON video_queue
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Mercado Livre Tokens table
CREATE TABLE IF NOT EXISTS ml_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer UNIQUE NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for ML tokens
CREATE INDEX IF NOT EXISTS idx_ml_tokens_user_id ON ml_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE ml_tokens ENABLE ROW LEVEL SECURITY;

-- Service role access policies (only server can access)
CREATE POLICY "Service role insert for ml_tokens"
  ON ml_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update for ml_tokens"
  ON ml_tokens
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role select for ml_tokens"
  ON ml_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete for ml_tokens"
  ON ml_tokens
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Mercado Livre Affiliate Links table
CREATE TABLE IF NOT EXISTS ml_affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_url text NOT NULL,
  product_id text,
  product_title text,
  product_category text,
  product_price numeric,
  tracking_url text NOT NULL,
  short_url text,
  campaign text DEFAULT 'vetor_blog',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for affiliate links
CREATE INDEX IF NOT EXISTS idx_ml_affiliate_links_product_id ON ml_affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_ml_affiliate_links_status ON ml_affiliate_links(status);

-- Enable Row Level Security
ALTER TABLE ml_affiliate_links ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for ml_affiliate_links"
  ON ml_affiliate_links
  FOR SELECT
  USING (true);

-- Service role access policies
CREATE POLICY "Service role insert for ml_affiliate_links"
  ON ml_affiliate_links
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update for ml_affiliate_links"
  ON ml_affiliate_links
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role delete for ml_affiliate_links"
  ON ml_affiliate_links
  FOR DELETE
  USING (auth.role() = 'service_role');
