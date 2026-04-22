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
-- ============================================================
-- Migration 0017: Müşteri Değerlendirmeleri + Receipt Settings genişlemesi
-- ============================================================

-- Mevcut businesses receipt_settings'e yeni alanları ekle (varsayılan değerlerle merge)
UPDATE businesses
SET receipt_settings = COALESCE(receipt_settings, '{}'::jsonb)
  || jsonb_build_object(
    'review_qr_enabled', COALESCE(receipt_settings->'review_qr_enabled', 'false'::jsonb),
    'review_qr_text', COALESCE(receipt_settings->'review_qr_text', '"Deneyiminizi değerlendirin"'::jsonb),
    'review_smart_redirect', COALESCE(receipt_settings->'review_smart_redirect', 'false'::jsonb),
    'google_place_id', COALESCE(receipt_settings->'google_place_id', '""'::jsonb)
  );

-- Default'u güncelle
ALTER TABLE businesses ALTER COLUMN receipt_settings SET DEFAULT '{
  "header_text": "",
  "footer_text": "Tercih ettiginiz icin tesekkurler!",
  "show_logo": true,
  "show_tagline": true,
  "show_phone": true,
  "show_address": true,
  "paper_width": 48,
  "kitchen_show_prices": false,
  "kitchen_big_font": true,
  "kitchen_show_note_highlight": true,
  "review_qr_enabled": false,
  "review_qr_text": "Deneyiminizi degerlendirin",
  "review_smart_redirect": false,
  "google_place_id": ""
}'::jsonb;

-- ============================================================
-- Reviews tablosu
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  -- Smart redirect davranışı
  redirected_to_google BOOLEAN DEFAULT false,
  -- İşletme cevabı
  reply_text TEXT,
  reply_at TIMESTAMPTZ,
  reply_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Durum
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_business_date
  ON reviews(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_business_rating
  ON reviews(business_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_order
  ON reviews(order_id) WHERE order_id IS NOT NULL;

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_business_member_read" ON reviews;
CREATE POLICY "reviews_business_member_read" ON reviews
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP POLICY IF EXISTS "reviews_business_member_update" ON reviews;
CREATE POLICY "reviews_business_member_update" ON reviews
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

-- Public can insert (anonymous customer reviews)
DROP POLICY IF EXISTS "reviews_public_insert" ON reviews;
CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
-- ============================================================
-- Migration 0018: Printer Agents (Network Yazıcı Bridge)
-- ============================================================

CREATE TABLE IF NOT EXISTS printer_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- "Kasa Bilgisayarı" gibi
  version TEXT,                              -- "1.0.0"
  last_seen_at TIMESTAMPTZ,
  last_job_at TIMESTAMPTZ,
  jobs_processed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  token TEXT NOT NULL UNIQUE,                -- Agent auth token
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_business
  ON printer_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_agents_token
  ON printer_agents(token);

-- RLS
ALTER TABLE printer_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_business_read" ON printer_agents;
CREATE POLICY "agents_business_read" ON printer_agents
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP POLICY IF EXISTS "agents_business_write" ON printer_agents;
CREATE POLICY "agents_business_write" ON printer_agents
  FOR ALL TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

-- Agent bir print_job'ı "claim" edince status 'printing' yapabilsin diye
-- RLS: anon + service_role üzerinden çalışır, agent service_role key kullanır

-- printer_agent_id kolonu print_jobs'a
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES printer_agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_print_jobs_agent ON print_jobs(agent_id);
