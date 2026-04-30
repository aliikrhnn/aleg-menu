-- Migration 0036: orders.cancelled_at, orders.cancel_reason
--
-- Tüm kalemleri iptal edilen siparişler ve manuel iptal edilen
-- siparişler için izleme. cancelOrderItems action'ı bunları yazar.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.cancelled_at IS
  'Sipariş iptal edildi. NULL ise iptal değil. status=cancelled iken doludur.';
COMMENT ON COLUMN orders.cancel_reason IS
  'İptal nedeni — kasiyer girişi veya "Tüm kalemler iptal" gibi otomatik mesaj.';

CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at
  ON orders(cancelled_at)
  WHERE cancelled_at IS NOT NULL;
