import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const sql = `
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
`;

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success:', data);
  }
}

main();
