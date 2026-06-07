-- ─────────────────────────────────────────────────────────────────────────────
-- Vetor Blog — AI Citations Table (GEO Tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_citations (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  query TEXT NOT NULL,
  cited_url TEXT NOT NULL,
  cited_page TEXT NOT NULL,
  context TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_citations_source ON ai_citations(source);
CREATE INDEX IF NOT EXISTS idx_ai_citations_detected_at ON ai_citations(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_citations_cited_page ON ai_citations(cited_page);
CREATE INDEX IF NOT EXISTS idx_ai_citations_verified ON ai_citations(verified);

-- RLS policies (allow service role full access)
ALTER TABLE ai_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage ai_citations"
  ON ai_citations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete citations older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_ai_citations()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_citations
  WHERE detected_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs weekly)
SELECT cron.schedule(
  'cleanup-ai-citations',
  '0 5 * * 0',
  'SELECT cleanup_old_ai_citations()'
);
