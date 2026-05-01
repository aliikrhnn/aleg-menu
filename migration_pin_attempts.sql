-- Bu migration ZATEN UYGULANDI (Supabase MCP ile)
-- Sadece referans amaçlı eklendi.

CREATE TABLE IF NOT EXISTS pin_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cashier_id uuid REFERENCES cashier_accounts(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  result text NOT NULL,
  expected_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_ip_cashier_time
  ON pin_attempts (ip_address, cashier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_business_time
  ON pin_attempts (business_id, created_at DESC);
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;
