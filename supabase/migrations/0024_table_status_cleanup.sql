-- ============================================================
-- 0024 — Masa tutarlılık temizliği + ödeme sonrası otomatik kapama mantığı
-- ============================================================
-- 1. Tüm ödenmiş (payment_status='paid') ama 'delivered' olmayan siparişleri
--    'delivered' statüsüne al
-- 2. Aktif siparişi olmayan tüm masaları 'available' yap
-- 3. Bu migration idempotent (tekrar çalıştırılabilir)
-- ============================================================

-- 1) Ödenmiş ama delivered olmayan dine_in siparişlerini kapat
UPDATE orders
SET status = 'delivered'
WHERE payment_status = 'paid'
  AND status NOT IN ('delivered', 'cancelled');

-- 2) Aktif sipariş olmayan masaları 'available' yap
-- Aktif = status (received/confirmed/preparing/ready/on_way)
--        VEYA (status=delivered AND payment_status NOT IN (paid,refunded))
UPDATE tables t
SET status = 'available'
WHERE t.status = 'occupied'
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.table_id = t.id
      AND o.business_id = t.business_id
      AND (
        o.status IN ('received', 'confirmed', 'preparing', 'ready', 'on_way')
        OR (o.status = 'delivered' AND o.payment_status NOT IN ('paid', 'refunded'))
      )
  );

-- 3) DB tutarlılık fonksiyonu — gelecek için
-- Uygulama kodunun yedeği olarak trigger eklemiyoruz (race condition olabilir),
-- sadece yardımcı fonksiyon:
CREATE OR REPLACE FUNCTION public.reconcile_table_status(p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE tables t
  SET status = 'available'
  WHERE t.business_id = p_business_id
    AND t.status = 'occupied'
    AND NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.table_id = t.id
        AND o.business_id = t.business_id
        AND (
          o.status IN ('received', 'confirmed', 'preparing', 'ready', 'on_way')
          OR (o.status = 'delivered' AND o.payment_status NOT IN ('paid', 'refunded'))
        )
    );
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.reconcile_table_status IS
  'Aktif siparisi olmayan occupied masalari available yapar. Manuel/cron cagri icin.';
