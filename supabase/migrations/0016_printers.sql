-- ============================================================
-- Migration 0016: Yazıcı Sistemi (ESC/POS)
-- ============================================================

CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Rol
  -- kitchen: mutfak/bar fişi, istasyona bağlı, fiyat YOK
  -- cashier: kasa hesap fişi, fiyatlı
  role TEXT NOT NULL DEFAULT 'kitchen' CHECK (role IN ('kitchen', 'cashier')),

  -- Bağlantı
  connection_type TEXT NOT NULL DEFAULT 'bluetooth' CHECK (connection_type IN ('bluetooth', 'network')),
  bluetooth_device_id TEXT,
  ip_address TEXT,
  port INTEGER DEFAULT 9100,

  -- Fiziksel
  paper_width INTEGER DEFAULT 48 CHECK (paper_width IN (32, 48)),
  model TEXT,

  -- Sadece kitchen için
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,

  -- Davranış
  copies INTEGER DEFAULT 1,
  auto_print_new_orders BOOLEAN DEFAULT true,
  auto_print_takeaway BOOLEAN DEFAULT true,

  -- Durum
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_success BOOLEAN,
  last_test_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printers_business ON printers(business_id);
CREATE INDEX IF NOT EXISTS idx_printers_station ON printers(station_id) WHERE station_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_printers_role ON printers(business_id, role);

CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('kitchen', 'cashier', 'reprint_kitchen', 'reprint_cashier', 'test')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  triggered_by TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_business_date ON print_jobs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);

-- Businesses'e fiş tasarım ayarları
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_settings JSONB DEFAULT '{
  "header_text": "",
  "footer_text": "Tercih ettiginiz icin tesekkurler!",
  "show_logo": true,
  "show_tagline": true,
  "show_phone": true,
  "show_address": true,
  "paper_width": 48,
  "kitchen_show_prices": false,
  "kitchen_big_font": true,
  "kitchen_show_note_highlight": true
}'::jsonb;

-- RLS
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printers_member_read" ON printers;
CREATE POLICY "printers_member_read" ON printers
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP POLICY IF EXISTS "printers_member_write" ON printers;
CREATE POLICY "printers_member_write" ON printers
  FOR ALL TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "print_jobs_member_read" ON print_jobs;
CREATE POLICY "print_jobs_member_read" ON print_jobs
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP POLICY IF EXISTS "print_jobs_member_insert" ON print_jobs;
CREATE POLICY "print_jobs_member_insert" ON print_jobs
  FOR INSERT TO authenticated
  WITH CHECK (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP TRIGGER IF EXISTS printers_updated_at ON printers;
CREATE TRIGGER printers_updated_at
  BEFORE UPDATE ON printers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE printers;
ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
