-- ============================================================
-- Migration 0007: Orders tablosu için Realtime açma
-- ============================================================
-- Supabase'de tabloyu realtime publication'a eklememiz gerekiyor.
-- Bu sayede orders tablosundaki INSERT/UPDATE/DELETE değişiklikleri
-- WebSocket üzerinden client'a push edilir.
-- ============================================================

-- Orders tablosunu realtime publication'a ekle
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Order items için de aynı (opsiyonel, sipariş içeriği canlı değişmez genelde)
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Waiter calls için de realtime — garson çağrıları anlık gelsin
ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
