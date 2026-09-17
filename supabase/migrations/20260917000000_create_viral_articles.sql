CREATE TABLE IF NOT EXISTS viral_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content TEXT,
  hero JSONB DEFAULT '{}'::jsonb,
  products JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_articles_slug ON viral_articles(slug);
CREATE INDEX IF NOT EXISTS idx_viral_articles_category ON viral_articles(category);
CREATE INDEX IF NOT EXISTS idx_viral_articles_published_at ON viral_articles(published_at DESC);
