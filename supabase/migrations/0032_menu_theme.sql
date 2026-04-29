-- Migration 0032: QR menüsü tema kişiselleştirme
-- 
-- businesses tablosuna menu_theme kolonu ekle (jsonb).
-- Şema:
-- {
--   "preset": "brutalist" | "elite" | "modern" | "vintage" | "minimal",
--   "accent_override": "#C4553A" | null  -- preset'in accent rengini override eder
-- }
--
-- Default: preset="brutalist", accent_override=null (mevcut davranış)

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS menu_theme jsonb DEFAULT '{"preset": "brutalist", "accent_override": null}'::jsonb;

COMMENT ON COLUMN businesses.menu_theme IS
  'QR menü tema ayarı: preset (brutalist/elite/modern/vintage/minimal) ve opsiyonel accent_override (#hex)';

-- Mevcut işletmeler için default değer ata (eklemiş olabileceğimiz kayıtlar için)
UPDATE businesses
SET menu_theme = '{"preset": "brutalist", "accent_override": null}'::jsonb
WHERE menu_theme IS NULL;
