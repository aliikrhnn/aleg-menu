-- ============================================================
-- 0023 — BAHŞİŞ, İNDİRİM, BÖLÜNMÜŞ ÖDEME
-- ============================================================
-- 1. orders.tip (bahşiş tutarı)
-- 2. orders.discount_reason (indirim sebebi - öğrenci/yaşlı/promosyon...)
-- 3. payment_logs.action'a 'partial_payment' eklenir (split payment)
-- 4. order_items.paid_by_log_id (hangi parçalı ödemede kapandı)
-- ============================================================

-- orders: bahşiş ve indirim sebebi
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tip NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT;

COMMENT ON COLUMN orders.tip IS
  'Bahşiş tutarı. total = subtotal - discount + service_fee + tip';
COMMENT ON COLUMN orders.discount_reason IS
  'İndirim sebebi: öğrenci, yaşlı, promosyon, özel, vb.';

-- payment_logs.action'ı genişlet (partial_payment ekle)
ALTER TABLE payment_logs DROP CONSTRAINT IF EXISTS payment_logs_action_check;
ALTER TABLE payment_logs
  ADD CONSTRAINT payment_logs_action_check CHECK (action IN (
    'payment', 'refund', 'void', 'tip', 'discount', 'partial_payment'
  ));

-- payment_logs: split ödeme için kalem bazlı işaretleme desteği
ALTER TABLE payment_logs
  ADD COLUMN IF NOT EXISTS split_group TEXT,
  ADD COLUMN IF NOT EXISTS covers_item_ids UUID[] DEFAULT ARRAY[]::UUID[];

COMMENT ON COLUMN payment_logs.split_group IS
  'Ayni siparisin split odemelerini gruplama anahtari (or: order_id + suffix).';
COMMENT ON COLUMN payment_logs.covers_item_ids IS
  'Kalem bazli split modunda hangi order_items kapsandigi (sadece item_split modunda).';

-- order_items: hangi parçalı ödemede kapandı (kalem-bazlı split için)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS paid_by_log_id UUID REFERENCES payment_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_paid_by_log
  ON order_items(paid_by_log_id)
  WHERE paid_by_log_id IS NOT NULL;

COMMENT ON COLUMN order_items.paid_by_log_id IS
  'Kalem-bazlı split ödemede bu kalemi hangi payment_log kapattı.';
