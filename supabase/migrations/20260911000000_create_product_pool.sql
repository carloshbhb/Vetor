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

-- Index for priority queries (getTopProducts)
CREATE INDEX IF NOT EXISTS idx_product_pool_status_priority
  ON product_pool (status, priority DESC);

-- Index for cleanup queries (cleanPool)
CREATE INDEX IF NOT EXISTS idx_product_pool_status_processed
  ON product_pool (status, processed_at);

-- Index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_product_pool_product
  ON product_pool (product);

-- Row Level Security (service role bypasses this, but good practice)
ALTER TABLE product_pool ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON product_pool
  FOR ALL
  USING (auth.role() = 'service_role');
