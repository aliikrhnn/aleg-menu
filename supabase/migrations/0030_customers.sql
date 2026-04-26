-- ============================================================
-- 0030_customers.sql
-- Cari hesap kullanıcıları (customers) ve transaction kayıtları
-- ============================================================

-- ============================================================
-- CUSTOMERS — Cari kullanıcılar
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name text NOT NULL,
  phone text,
  email text,
  note text,

  -- Cached değerler (transaction yazıldıkça güncellenir)
  -- balance: negatif = bize borçlu, pozitif = avans (önceden ödeme)
  balance numeric(12,2) NOT NULL DEFAULT 0,
  total_charged numeric(12,2) NOT NULL DEFAULT 0,
  total_paid numeric(12,2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  last_transaction_at timestamptz,

  -- Soft delete
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone) WHERE phone IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(business_id, balance) WHERE is_active = true AND balance < 0;
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers USING gin (to_tsvector('simple', name));

-- ============================================================
-- CUSTOMER_TRANSACTIONS — Borç + ödeme hareketleri
-- ============================================================
-- type:
--   'charge'  → sipariş cariye eklendi (borç +)
--   'payment' → müşteri ödeme yaptı (borç -)
--   'manual'  → manuel borç/alacak (manuel ekleme)

CREATE TABLE IF NOT EXISTS customer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  type text NOT NULL CHECK (type IN ('charge', 'payment', 'manual_charge', 'manual_credit')),
  -- amount: her zaman pozitif tutulur, type davranışı belirler
  --   charge / manual_charge: balance'tan ÇIKARILIR (borç ekler)
  --   payment / manual_credit: balance'a EKLENİR (borç azaltır)
  amount numeric(12,2) NOT NULL CHECK (amount > 0),

  -- charge için: hangi sipariş
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,

  -- payment için: kasa oturumu + payment_log bağlantısı
  payment_method text CHECK (
    payment_method IS NULL OR
    payment_method IN ('cash', 'card', 'transfer', 'online', 'other')
  ),
  payment_log_id uuid REFERENCES payment_logs(id) ON DELETE SET NULL,
  cash_session_id uuid REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,

  cashier_id uuid REFERENCES cashier_accounts(id) ON DELETE SET NULL,
  member_id uuid REFERENCES business_members(id) ON DELETE SET NULL,

  note text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cust_tx_business ON customer_transactions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_tx_customer ON customer_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_tx_session ON customer_transactions(cash_session_id) WHERE cash_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cust_tx_order ON customer_transactions(order_id) WHERE order_id IS NOT NULL;

-- ============================================================
-- ORDERS — customer_id alanı (cari sipariş bağı)
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_customer_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;

-- Customers: business_members ile erişim
DROP POLICY IF EXISTS customers_business_access ON customers;
CREATE POLICY customers_business_access ON customers
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cust_tx_business_access ON customer_transactions;
CREATE POLICY cust_tx_business_access ON customer_transactions
  FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
    )
  );
