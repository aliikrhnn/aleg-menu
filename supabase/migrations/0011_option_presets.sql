-- ============================================================
-- Migration 0011: Ürün Varyasyonları (Option Presets)
-- ============================================================

-- Şablon başlığı (Boy, Süt, Şeker vb.)
CREATE TABLE IF NOT EXISTS option_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{"tr": "", "en": ""}'::jsonb,
  type TEXT NOT NULL CHECK (type IN ('single', 'multi')) DEFAULT 'single',
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_option_presets_business
  ON option_presets(business_id, sort_order);

-- Şablon değerleri (Küçük, Orta, Büyük vb.)
CREATE TABLE IF NOT EXISTS option_preset_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preset_id UUID NOT NULL REFERENCES option_presets(id) ON DELETE CASCADE,
  name JSONB NOT NULL DEFAULT '{"tr": "", "en": ""}'::jsonb,
  price_delta NUMERIC(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_option_preset_values_preset
  ON option_preset_values(preset_id, sort_order);

-- Ürün <-> Şablon bağı (çoğa-çoğa)
CREATE TABLE IF NOT EXISTS product_option_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  preset_id UUID NOT NULL REFERENCES option_presets(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, preset_id)
);

CREATE INDEX IF NOT EXISTS idx_product_option_presets_product
  ON product_option_presets(product_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_product_option_presets_preset
  ON product_option_presets(preset_id);

-- ============================================================
-- Trigger: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION touch_option_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_option_presets_updated_at ON option_presets;
CREATE TRIGGER trg_option_presets_updated_at
BEFORE UPDATE ON option_presets
FOR EACH ROW EXECUTE FUNCTION touch_option_presets_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE option_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_preset_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_option_presets ENABLE ROW LEVEL SECURITY;

-- option_presets - business üyeleri okuyabilir/yazabilir
DROP POLICY IF EXISTS "option_presets_member_all" ON option_presets;
CREATE POLICY "option_presets_member_all" ON option_presets
  FOR ALL TO authenticated
  USING (business_id IN (SELECT public.user_businesses()))
  WITH CHECK (business_id IN (SELECT public.user_businesses()));

-- option_presets - anon okuyabilir (müşteri menüsü için)
DROP POLICY IF EXISTS "option_presets_public_read" ON option_presets;
CREATE POLICY "option_presets_public_read" ON option_presets
  FOR SELECT TO anon, authenticated
  USING (true);

-- option_preset_values - owner'ı option_presets üzerinden kontrol et
DROP POLICY IF EXISTS "option_preset_values_member_all" ON option_preset_values;
CREATE POLICY "option_preset_values_member_all" ON option_preset_values
  FOR ALL TO authenticated
  USING (
    preset_id IN (
      SELECT id FROM option_presets
      WHERE business_id IN (SELECT public.user_businesses())
    )
  )
  WITH CHECK (
    preset_id IN (
      SELECT id FROM option_presets
      WHERE business_id IN (SELECT public.user_businesses())
    )
  );

DROP POLICY IF EXISTS "option_preset_values_public_read" ON option_preset_values;
CREATE POLICY "option_preset_values_public_read" ON option_preset_values
  FOR SELECT TO anon, authenticated
  USING (true);

-- product_option_presets
DROP POLICY IF EXISTS "product_option_presets_member_all" ON product_option_presets;
CREATE POLICY "product_option_presets_member_all" ON product_option_presets
  FOR ALL TO authenticated
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE business_id IN (SELECT public.user_businesses())
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM products
      WHERE business_id IN (SELECT public.user_businesses())
    )
  );

DROP POLICY IF EXISTS "product_option_presets_public_read" ON product_option_presets;
CREATE POLICY "product_option_presets_public_read" ON product_option_presets
  FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- order_items tablosuna seçimleri tutmak için options kolonu
-- ============================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;
-- Örnek format: [{"preset_name": "Boy", "value_name": "Büyük", "price_delta": 10}, ...]
