-- ============================================================
-- Migration 0009: İşletme Ayarları - ek kolonlar + storage
-- ============================================================

-- businesses tablosuna yeni kolonlar
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline_tr TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline_en TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- Çalışma saatleri JSONB (7 gün, her biri: {open, close, closed})
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
  "mon": {"open": "08:00", "close": "23:00", "closed": false},
  "tue": {"open": "08:00", "close": "23:00", "closed": false},
  "wed": {"open": "08:00", "close": "23:00", "closed": false},
  "thu": {"open": "08:00", "close": "23:00", "closed": false},
  "fri": {"open": "08:00", "close": "23:00", "closed": false},
  "sat": {"open": "09:00", "close": "23:00", "closed": false},
  "sun": {"open": "09:00", "close": "22:00", "closed": false}
}'::jsonb;

-- Sipariş ayarları: hangi modlar aktif, online sipariş açık mı
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS order_config JSONB DEFAULT '{
  "online_enabled": true,
  "modes": {
    "dinein": true,
    "pickup": true,
    "delivery": false
  },
  "langs": {
    "tr": true,
    "en": false
  }
}'::jsonb;

-- Trigger: updated_at otomatik güncellensin
CREATE OR REPLACE FUNCTION touch_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON businesses;
CREATE TRIGGER trg_businesses_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION touch_businesses_updated_at();

-- ============================================================
-- STORAGE: business-assets bucket (logolar, görseller)
-- ============================================================

-- Bucket oluştur (public read, işletme üyesi write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Herkes okuyabilir (menü public görünür)
DROP POLICY IF EXISTS "business-assets public read" ON storage.objects;
CREATE POLICY "business-assets public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'business-assets');

-- İşletme üyeleri yükleyebilir
-- Dosya adı: {business_id}/logo.png, {business_id}/products/xxx.png gibi
DROP POLICY IF EXISTS "business-assets member upload" ON storage.objects;
CREATE POLICY "business-assets member upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );

DROP POLICY IF EXISTS "business-assets member update" ON storage.objects;
CREATE POLICY "business-assets member update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );

DROP POLICY IF EXISTS "business-assets member delete" ON storage.objects;
CREATE POLICY "business-assets member delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );
