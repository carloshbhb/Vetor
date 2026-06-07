-- ─────────────────────────────────────────────────────────────────────────────
-- Vetor Blog — Health Checks Table (Auto-Healing)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_checks (
  component TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success TIMESTAMPTZ,
  last_failure TIMESTAMPTZ,
  action TEXT CHECK (action IN ('retry', 'fallback', 'circuit_break', 'cooldown'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_last_check ON health_checks(last_check DESC);

-- RLS policies (allow service role full access)
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage health_checks"
  ON health_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
