-- ============================================================
-- 0029 — KASİYER ROLÜ (kasiyer/garson/her ikisi)
-- ============================================================
-- Mevcut cashier_accounts'a 'role' kolonu eklenir.
-- /kasa sadece cashier|both olanları, /garson sadece waiter|both
-- olanları listeler.
-- ============================================================

ALTER TABLE cashier_accounts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'cashier';

-- Constraint - sadece geçerli değerler
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cashier_accounts_role_check'
  ) THEN
    ALTER TABLE cashier_accounts
      ADD CONSTRAINT cashier_accounts_role_check
      CHECK (role IN ('cashier', 'waiter', 'both'));
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_cashier_accounts_role
  ON cashier_accounts(business_id, role, is_active);

-- Mevcut tüm kayıtlar 'cashier' default - dokunulmaz
