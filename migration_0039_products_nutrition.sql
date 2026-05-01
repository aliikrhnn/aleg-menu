-- Sprint 1: Beslenme & Alerjen kolonları
ALTER TABLE products ADD COLUMN IF NOT EXISTS calories integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_size text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '{"tr":"","en":""}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS contains_alcohol boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_ai_generated boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_verified_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_verified_by uuid REFERENCES business_members(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_notes text;
COMMENT ON COLUMN products.allergens IS '14 ana alerjen (EU 1169/2011)';
COMMENT ON COLUMN products.calories IS 'Porsiyon başına kcal — Tarım Bakanlığı 1 Temmuz 2026';
