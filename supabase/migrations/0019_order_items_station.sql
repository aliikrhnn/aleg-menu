-- ============================================================
-- Migration 0019: order_items.station_id kolonu
-- Ürün istasyon bilgisi sipariş anında snapshot edilir
-- (Sonradan ürünün istasyonu değişse bile geçmiş siparişler etkilenmez)
-- ============================================================

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_station
  ON order_items(station_id) WHERE station_id IS NOT NULL;

-- Mevcut order_items'ları products'tan güncelle (backfill)
UPDATE order_items oi
SET station_id = p.station_id
FROM products p
WHERE oi.product_id = p.id
  AND oi.station_id IS NULL
  AND p.station_id IS NOT NULL;
