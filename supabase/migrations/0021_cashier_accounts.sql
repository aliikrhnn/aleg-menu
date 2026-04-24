-- ============================================================
-- 0021 — KASİYER SİSTEMİ
-- ============================================================
-- Kasa uygulamasına PIN ile giriş yapan kasiyer hesapları.
-- Supabase Auth hesabı DEĞİL - basit PIN tabanlı sistem.
-- Her kasa işlemi kasiyer ID'si ile loglanır.
-- ============================================================

CREATE TABLE IF NOT EXISTS cashier_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  display_name TEXT NOT NULL,         -- "Ayşe", "Kasa 1"
  pin_hash TEXT NOT NULL,             -- bcrypt hash

  -- Görsel
  color TEXT DEFAULT '#C4553A',       -- kart rengi
  emoji TEXT DEFAULT '👤',            -- kart emoji'si

  -- Yetkiler
  can_close_day BOOLEAN DEFAULT FALSE, -- gün sonu kasa kapatabilir mi?
  can_refund BOOLEAN DEFAULT FALSE,    -- iade yapabilir mi?

  -- Durum
  is_active BOOLEAN DEFAULT TRUE,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES business_members(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashier_accounts_business
  ON cashier_accounts(business_id, is_active);

-- Display name aynı business içinde unique (2 tane "Ayşe" olamaz)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_accounts_name
  ON cashier_accounts(business_id, LOWER(display_name))
  WHERE is_active = TRUE;

CREATE TRIGGER update_cashier_accounts_updated_at
  BEFORE UPDATE ON cashier_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- payment_logs'a cashier_id
-- ============================================================
ALTER TABLE payment_logs
  ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES cashier_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_logs_cashier
  ON payment_logs(cashier_id, performed_at DESC);

-- ============================================================
-- cash_drawer_sessions'a cashier_id (kim açtı/kapattı)
-- ============================================================
ALTER TABLE cash_drawer_sessions
  ADD COLUMN IF NOT EXISTS opened_by_cashier UUID REFERENCES cashier_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_by_cashier UUID REFERENCES cashier_accounts(id) ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE cashier_accounts ENABLE ROW LEVEL SECURITY;

-- Business üyeleri kendi kafelerinin kasiyerlerini görebilir/yönetebilir
DROP POLICY IF EXISTS "cashier_accounts_business_access" ON cashier_accounts;
CREATE POLICY "cashier_accounts_business_access" ON cashier_accounts
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
