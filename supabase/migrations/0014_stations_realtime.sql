-- ============================================================
-- Migration 0014: stations tablosunu Realtime publication'a ekle
-- KDS'de yeni istasyon oluşturulduğunda anında tab açılması için
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE stations;
