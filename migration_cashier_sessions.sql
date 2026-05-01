-- Bu migration ZATEN UYGULANDI (Supabase MCP ile)
-- Sadece referans için.

CREATE TABLE IF NOT EXISTS cashier_sessions (
  id text PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cashier_id uuid NOT NULL REFERENCES cashier_accounts(id) ON DELETE CASCADE,
  role text NOT NULL,
  user_agent text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cashier_sessions_active ON cashier_sessions (id, expires_at);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_cashier ON cashier_sessions (cashier_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashier_sessions_business ON cashier_sessions (business_id, expires_at DESC);
ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;
