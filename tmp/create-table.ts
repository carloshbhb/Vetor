import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function run() {
  const sql = `
CREATE TABLE IF NOT EXISTS product_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  product_url TEXT NOT NULL,
  affiliate_url TEXT,
  image_url TEXT,
  marketplace TEXT DEFAULT 'mercadolivre',
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'manual',
  has_review BOOLEAN DEFAULT false,
  has_video BOOLEAN DEFAULT false,
  review_slug TEXT,
  video_id TEXT,
  price TEXT,
  score NUMERIC,
  priority INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated full access" ON product_links
    FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon read access" ON product_links
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_links_category ON product_links(category);
CREATE INDEX IF NOT EXISTS idx_product_links_status ON product_links(status);
CREATE INDEX IF NOT EXISTS idx_product_links_has_review ON product_links(has_review);
CREATE INDEX IF NOT EXISTS idx_product_links_has_video ON product_links(has_video);
`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
}

run().catch(console.error);
