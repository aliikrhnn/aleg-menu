-- ============================================================
-- Migration 0015: stations'a slug kolonu ekle
-- URL için: /panel/kds/bar, /panel/kds/mutfak gibi
-- ============================================================

ALTER TABLE stations ADD COLUMN IF NOT EXISTS slug TEXT;

-- Mevcut istasyonlara slug üret (name'den)
UPDATE stations
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(name,
        'ÇĞİıÖŞÜçğiıöşü ',
        'CGIioSuCgIIosu-'
      ),
      '[^a-zA-Z0-9\-]', '', 'g'
    ),
    '\-+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Boşsa id'yi kullan
UPDATE stations
SET slug = SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- İşletme başına unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_business_slug
  ON stations(business_id, slug);
