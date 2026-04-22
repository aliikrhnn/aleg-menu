-- ============================================================
-- Migration 0013: İstasyon Sistemi (Bar / Mutfak / Pastane)
-- ============================================================

-- Stations tablosu
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '●', -- emoji veya tek karakter
  color TEXT DEFAULT '#C4553A', -- accent varsayılan
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_business
  ON stations(business_id, sort_order);

-- products tablosuna station_id kolonu ekle (nullable - eski ürünler için)
ALTER TABLE products ADD COLUMN IF NOT EXISTS station_id UUID REFERENCES stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_station
  ON products(station_id) WHERE station_id IS NOT NULL;

-- RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

-- İşletme üyeleri okuyabilir
DROP POLICY IF EXISTS "stations_member_read" ON stations;
CREATE POLICY "stations_member_read" ON stations
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

-- İşletme üyeleri yazabilir
DROP POLICY IF EXISTS "stations_member_write" ON stations;
CREATE POLICY "stations_member_write" ON stations
  FOR ALL TO authenticated
  USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

-- Public: menüde gösterilecek (customer-facing)
DROP POLICY IF EXISTS "stations_public_read" ON stations;
CREATE POLICY "stations_public_read" ON stations
  FOR SELECT TO anon
  USING (is_active = true);

-- Updated_at trigger
DROP TRIGGER IF EXISTS stations_updated_at ON stations;
CREATE TRIGGER stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed: Aleg Karaköy için 3 default istasyon
-- ============================================================

INSERT INTO stations (business_id, name, icon, color, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bar', '☕', '#C4553A', 0),
  ('00000000-0000-0000-0000-000000000001', 'Mutfak', '🍳', '#B08A3E', 1),
  ('00000000-0000-0000-0000-000000000001', 'Pastane', '🍰', '#6B8E4E', 2)
ON CONFLICT DO NOTHING;
