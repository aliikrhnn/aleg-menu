-- ============================================================
-- 0022 — İKRAM + MANUEL SİPARİŞ DESTEĞİ
-- ============================================================
-- 1. order_items'a is_complimentary (ikram) alanı
-- 2. orders'a complimentary_total ve created_by_cashier
-- 3. Manuel sipariş için source='manual' değeri (check genişlet)
-- ============================================================

-- ============================================================
-- order_items: İkram alanı
-- ============================================================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_complimentary BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS complimentary_reason TEXT; -- "müdavim", "şikayet", "doğum günü"

CREATE INDEX IF NOT EXISTS idx_order_items_complimentary
  ON order_items(order_id, is_complimentary)
  WHERE is_complimentary = TRUE;

-- ============================================================
-- orders: İkram toplamı + kasiyer izleme + kaynak
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS complimentary_total NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_cashier UUID REFERENCES cashier_accounts(id) ON DELETE SET NULL,
  -- source: 'qr' (müşteri tarayarak), 'manual' (kasiyer açtı), 'call' (telefon), 'delivery_app'
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'qr';

-- Source check constraint (idempotent)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_source_check CHECK (
    source IS NULL OR source IN ('qr', 'manual', 'call', 'delivery_app', 'quick_sale')
  );

CREATE INDEX IF NOT EXISTS idx_orders_cashier
  ON orders(created_by_cashier, created_at DESC)
  WHERE created_by_cashier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_source
  ON orders(business_id, source, created_at DESC);

-- ============================================================
-- Yorum
-- ============================================================
COMMENT ON COLUMN order_items.is_complimentary IS
  'Bu kalem ikram mı? Müşteriye bedava verildi. Fiyatı toplamlara düşer ama charge edilmez.';

COMMENT ON COLUMN orders.complimentary_total IS
  'Bu siparişteki ikram edilen ürünlerin toplam maliyet değeri.';

COMMENT ON COLUMN orders.source IS
  'Siparişin nereden geldiği: qr (müşteri tarayarak), manual (kasiyer açtı), call (telefon), delivery_app, quick_sale';
