-- Tabela para armazenar tokens do Mercado Livre (OAuth)
-- Usada pelo cron de renovação automática (a cada 5h, antes da expiração de 6h)
CREATE TABLE IF NOT EXISTS ml_tokens (
  id TEXT PRIMARY KEY DEFAULT 'current',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas por expiração (cron de renovação)
CREATE INDEX IF NOT EXISTS idx_ml_tokens_expires_at ON ml_tokens(expires_at);

-- RLS: apenas service role acessa
ALTER TABLE ml_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on ml_tokens" ON ml_tokens
  FOR ALL USING (auth.role() = 'service_role');
