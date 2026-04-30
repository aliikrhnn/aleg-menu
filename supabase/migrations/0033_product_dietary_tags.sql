-- Migration 0033: Ürünlere allergen/diet badge alanları + chef recommend
--
-- Şu alanları ekler:
--   • dietary_tags: text[] — örn ARRAY['vegan','vegetarian','gluten_free']
--   • spicy_level: smallint — 0..3 (0 yok, 1 az, 2 orta, 3 acı)
--   • is_chef_recommend: boolean — şefin önerisi (is_featured'dan ayrı)
--
-- Not: dietary_tags PostgreSQL native text array (text[]) olarak tanımlı.
-- Mevcut kayıtlarda bu kolon zaten varsa (önceki migration tarafından),
-- IF NOT EXISTS sayesinde yeniden eklenmez.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS dietary_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS spicy_level smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_chef_recommend boolean DEFAULT false;

COMMENT ON COLUMN products.dietary_tags IS
  'Ürünün diyet etiketleri (text[]): vegan, vegetarian, gluten_free, lactose_free, halal, organic, homemade';

COMMENT ON COLUMN products.spicy_level IS
  'Acılık seviyesi: 0=yok, 1=az, 2=orta, 3=acı';

COMMENT ON COLUMN products.is_chef_recommend IS
  'Şefin önerisi rozeti — is_featured''dan ayrı, sadece menüde özel rozet için';

-- Spicy level constraint
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_spicy_level_check;
ALTER TABLE products
  ADD CONSTRAINT products_spicy_level_check CHECK (spicy_level >= 0 AND spicy_level <= 3);

-- Mevcut kayıtlar için NULL'ları varsayılana çevir (text[] uyumlu)
UPDATE products
SET dietary_tags = '{}'::text[]
WHERE dietary_tags IS NULL;

UPDATE products
SET spicy_level = 0
WHERE spicy_level IS NULL;

UPDATE products
SET is_chef_recommend = false
WHERE is_chef_recommend IS NULL;
