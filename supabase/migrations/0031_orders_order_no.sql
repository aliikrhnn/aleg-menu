-- ============================================================
-- 0031_orders_order_no.sql
-- ============================================================
-- Orders tablosuna `order_no` kolonu ekler.
-- Her işletme için günlük artan sipariş numarası (örn. "ORD-101").
--
-- Sebep: Kodda 68+ yerde orders.order_no referansı vardı ama tablo'da
-- bu kolon hiç yoktu → "Sipariş query hatası: column orders.order_no
-- does not exist" hatası.
-- ============================================================

-- 1. order_no kolonu ekle
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_no TEXT;

-- 2. Mevcut siparişlere order_no doldur (id'den türeterek)
-- Format: "ORD-XXXXXXXX" (UUID'in ilk 8 karakteri)
UPDATE orders
SET order_no = 'ORD-' || UPPER(SUBSTRING(id::text, 1, 8))
WHERE order_no IS NULL;

-- 3. Index ekle
CREATE INDEX IF NOT EXISTS idx_orders_business_order_no
  ON orders(business_id, order_no);

-- 4. Yeni siparişler için trigger - günlük artan numara
-- Format: "ORD-YYMMDD-NNN" (örn. "ORD-260427-001")
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TRIGGER AS $$
DECLARE
  date_prefix TEXT;
  next_num INT;
  formatted_no TEXT;
BEGIN
  -- order_no zaten set edilmişse dokunma
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;

  -- Bugünün tarih prefix'i (YYMMDD)
  date_prefix := TO_CHAR(NOW(), 'YYMMDD');

  -- Bu işletme için bugünün son numarasını bul
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(order_no FROM 'ORD-' || date_prefix || '-(\d+)$') AS INTEGER
      )
    ),
    0
  ) + 1
  INTO next_num
  FROM orders
  WHERE business_id = NEW.business_id
    AND order_no LIKE 'ORD-' || date_prefix || '-%';

  -- 3 haneli zero-padded format
  formatted_no := 'ORD-' || date_prefix || '-' || LPAD(next_num::TEXT, 3, '0');
  NEW.order_no := formatted_no;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eski trigger varsa kaldır (idempotent)
DROP TRIGGER IF EXISTS trg_generate_order_no ON orders;

-- Yeni trigger
CREATE TRIGGER trg_generate_order_no
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_no();

-- 5. RLS - mevcut policy'leri etkilemez (SELECT/INSERT/UPDATE zaten var)

-- ============================================================
-- KONTROL
-- ============================================================
-- Test:
--   INSERT INTO orders (business_id, order_type) VALUES
--     ('your-business-id', 'dine_in') RETURNING order_no;
--   → 'ORD-260427-001'
-- ============================================================
