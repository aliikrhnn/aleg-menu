-- Migration 0035: orders.discount_amount, tip_amount, discount_reason
--
-- Bölme öncesi (veya tek ödeme sırasında) uygulanan indirim ve bahşiş
-- bilgisini siparişe yazmak için. Böylece bölme yaparken server ve
-- client aynı net total üzerinden hesap yapar.
--
-- subtotal: kalemler toplamı (ham)
-- discount_amount: uygulanan indirim
-- tip_amount: uygulanan bahşiş
-- total: subtotal - discount_amount + tip_amount (net ödenecek)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.discount_amount IS
  'Bu siparişe uygulanan toplam indirim tutarı. orders.total bunun düşülmüş halidir.';
COMMENT ON COLUMN orders.tip_amount IS
  'Bu siparişe eklenen bahşiş. orders.total bunu içerir.';
COMMENT ON COLUMN orders.discount_reason IS
  'İndirim açıklaması (öğrenci, çalışan, kampanya vb.)';
