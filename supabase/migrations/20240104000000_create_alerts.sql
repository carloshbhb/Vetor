-- ─────────────────────────────────────────────────────────────────────────────
-- Vetor Blog — Alerts Table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_agent_name ON alerts(agent_name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- RLS policies (allow service role full access)
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage alerts"
  ON alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function: delete alerts older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS void AS $$
BEGIN
  DELETE FROM alerts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (runs daily)
SELECT cron.schedule(
  'cleanup-alerts',
  '0 3 * * *',
  'SELECT cleanup_old_alerts()'
);
