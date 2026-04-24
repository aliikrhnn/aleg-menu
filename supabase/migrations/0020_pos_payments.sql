-- ============================================================
-- 0020 — KASA SİSTEMİ (Offline-capable POS)
-- ============================================================
-- 1. orders tablosuna ödeme detayları
-- 2. Sync client ID (offline çakışma önleme)
-- 3. cash_drawer_sessions tablosu (nakit kasa sayacı)
-- 4. payment_logs tablosu (audit trail)
-- ============================================================

-- ============================================================
-- orders: Ödeme detay kolonları
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS change_given NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS payment_note TEXT,
  -- Offline oluşturulan siparişler için idempotency key
  ADD COLUMN IF NOT EXISTS sync_client_id TEXT,
  -- "Hızlı satış" siparişleri için (masası yok, barda alındı)
  ADD COLUMN IF NOT EXISTS is_quick_sale BOOLEAN DEFAULT FALSE,
  -- Kasa oturumuna referans
  ADD COLUMN IF NOT EXISTS cash_session_id UUID;

-- Önceki payment_method check'ini kaldır (varsa) ve genişlet
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check CHECK (
    payment_method IS NULL
    OR payment_method IN ('cash', 'card', 'transfer', 'online', 'split', 'other')
  );

-- Sync client_id için unique index (bir client_id bir kez düşer)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_sync_client
  ON orders(business_id, sync_client_id)
  WHERE sync_client_id IS NOT NULL;

-- Paid_at indeksi (raporlama için)
CREATE INDEX IF NOT EXISTS idx_orders_paid_at
  ON orders(business_id, paid_at DESC)
  WHERE paid_at IS NOT NULL;

-- ============================================================
-- cash_drawer_sessions — Nakit kasa sayacı oturumu
-- ============================================================
-- Her sabah "kasada X TL var" girilir, gün sonunda sayılır, kapatılır.
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Açılış
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  opened_by UUID REFERENCES business_members(id) ON DELETE SET NULL,
  opening_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  opening_note TEXT,

  -- Kapanış (NULL = açık oturum)
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES business_members(id) ON DELETE SET NULL,
  counted_amount NUMERIC(10, 2),      -- fiziki sayılan nakit
  expected_amount NUMERIC(10, 2),     -- Aleg'in hesapladığı olması gereken
  difference NUMERIC(10, 2),          -- counted - expected (fark, +/-)
  closing_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_business
  ON cash_drawer_sessions(business_id, opened_at DESC);

-- Açık oturum tek olsun - aynı business için birden fazla açık olamaz
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_open
  ON cash_drawer_sessions(business_id)
  WHERE closed_at IS NULL;

DROP TRIGGER IF EXISTS update_cash_sessions_updated_at ON cash_drawer_sessions;
CREATE TRIGGER update_cash_sessions_updated_at
  BEFORE UPDATE ON cash_drawer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- orders.cash_session_id için FK (tablo oluştuktan sonra)
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_cash_session_fk;
ALTER TABLE orders
  ADD CONSTRAINT orders_cash_session_fk
  FOREIGN KEY (cash_session_id)
  REFERENCES cash_drawer_sessions(id)
  ON DELETE SET NULL;

-- ============================================================
-- payment_logs — Ödeme audit trail
-- ============================================================
-- Her ödeme işlemi burada kayıtlı: kim aldı, ne zaman, ne kadar, hangi yöntem
-- İptal/refund da ayrı satır olarak işlenir.
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  cash_session_id UUID REFERENCES cash_drawer_sessions(id) ON DELETE SET NULL,

  action TEXT NOT NULL CHECK (action IN (
    'payment', 'refund', 'void', 'tip', 'discount'
  )),
  payment_method TEXT CHECK (payment_method IN (
    'cash', 'card', 'transfer', 'online', 'split', 'other'
  )),
  amount NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2),      -- müşterinin verdiği (nakit için > amount olabilir)
  change_given NUMERIC(10, 2),      -- para üstü
  note TEXT,

  performed_by UUID REFERENCES business_members(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Offline sync için
  sync_client_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_business_date
  ON payment_logs(business_id, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_logs_session
  ON payment_logs(cash_session_id);

CREATE INDEX IF NOT EXISTS idx_payment_logs_order
  ON payment_logs(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_logs_sync_client
  ON payment_logs(business_id, sync_client_id)
  WHERE sync_client_id IS NOT NULL;

-- ============================================================
-- RLS Politikaları
-- ============================================================
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- cash_drawer_sessions: aynı business'taki aktif üyeler görebilir
DROP POLICY IF EXISTS "cash_sessions_business_access" ON cash_drawer_sessions;
CREATE POLICY "cash_sessions_business_access" ON cash_drawer_sessions
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

-- payment_logs: aynı business'taki aktif üyeler görebilir
DROP POLICY IF EXISTS "payment_logs_business_access" ON payment_logs;
CREATE POLICY "payment_logs_business_access" ON payment_logs
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
