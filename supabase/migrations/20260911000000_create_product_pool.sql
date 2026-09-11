-- Vetor Blog — MAS: product_pool table
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS product_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL,
  category TEXT NOT NULL,
  keyword_score NUMERIC DEFAULT 0,
  search_volume TEXT,
  seo_difficulty TEXT,
  trend_source TEXT,
  priority NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_pool_status_priority ON product_pool (status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_product_pool_status_processed ON product_pool (status, processed_at);
CREATE INDEX IF NOT EXISTS idx_product_pool_product ON product_pool (product);

ALTER TABLE product_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON product_pool
  FOR ALL
  USING (auth.role() = 'service_role');
