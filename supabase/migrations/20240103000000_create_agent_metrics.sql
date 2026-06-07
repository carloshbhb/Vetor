-- ─────────────────────────────────────────────────────────────────────────────
-- Vetor Blog — Agent Metrics Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  provider TEXT,
  token_count INTEGER,
  error_message TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_name ON agent_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp ON agent_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_success ON agent_metrics(success);

-- RLS policies (allow service role full access)
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage agent_metrics"
  ON agent_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete metrics older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_agent_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs daily)
SELECT cron.schedule(
  'cleanup-agent-metrics',
  '0 4 * * *',
  'SELECT cleanup_old_agent_metrics()'
);
