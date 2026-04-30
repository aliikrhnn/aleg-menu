-- Migration 0038: order_logs (audit log)
--
-- Tüm sipariş ve para hareketleri için izleme tablosu.
-- Kim, ne zaman, hangi siparişte/masada, ne yaptı?
--
-- payment_logs zaten finansal işlemleri tutuyor. order_logs ise
-- ön/arka tarafa ait operasyonel işlemleri kayıt altına alır:
--   - Sipariş oluşturma, kalem ekleme/silme, durum değişikliği
--   - Kalem iptali, kalem ikramı
--   - İndirim/bahşiş uygulanması
--   - Masa taşıma, birleştirme, ayırma
--   - Sipariş notu değişikliği
--
-- Z-Report'ta "Garson X iptal ettiği toplam: ₺Y" gibi raporlar
-- bu tablodan üretilir.

CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

  -- Aksiyon türü — tahminen filtrelemede kullanılır
  action TEXT NOT NULL CHECK (action IN (
    'order_created',
    'order_status_changed',
    'item_added',
    'item_removed',
    'item_quantity_changed',
    'item_cancelled',
    'item_complimentary',
    'item_status_changed',
    'note_changed',
    'discount_applied',
    'tip_applied',
    'table_moved',
    'tables_merged',
    'tables_split',
    'order_cancelled',
    'split_payment_started'
  )),

  -- Detay - aksiyona göre değişen JSON payload
  -- Örnek: {"item_name": "am suyu", "quantity": 1, "unit_price": 300, "amount": 300}
  details JSONB DEFAULT '{}'::jsonb,

  -- Kim yaptı
  performed_by UUID REFERENCES business_members(id) ON DELETE SET NULL,
  performed_by_name TEXT, -- snapshot — üye silinse bile rapor için kalır
  performed_by_role TEXT, -- snapshot - 'admin' | 'cashier' | 'waiter'
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_order_logs_business
  ON order_logs(business_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_logs_order
  ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_table
  ON order_logs(table_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_performer
  ON order_logs(performed_by, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_logs_action
  ON order_logs(business_id, action, performed_at DESC);

-- RLS
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- İşletme üyesi kendi işletmesinin loglarını görebilir
CREATE POLICY "members_read_own_business_logs" ON order_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_id = order_logs.business_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
    )
  );

-- Yazma sadece service_role'den (server actions)
-- Insert client'ten yapılmaz

COMMENT ON TABLE order_logs IS
  'Operasyonel audit log - sipariş/masa/kalem tüm işlemleri izler. payment_logs ile karıştırılmamalı.';
