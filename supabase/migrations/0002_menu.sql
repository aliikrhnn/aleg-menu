-- ============================================================
-- ALEG - 0002: Menü sistemi
-- ============================================================
--   - categories (kategoriler)
--   - products (ürünler)
--   - product_variants (ürün varyantları)
--   - product_options (ek seçenekler - şekersiz, az şekerli vs.)
-- ============================================================

-- ============================================================
-- KATEGORİLER
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- İsim (çok dilli)
  name JSONB NOT NULL DEFAULT '{"tr":"","en":""}'::jsonb,
  description JSONB DEFAULT '{"tr":"","en":""}'::jsonb,

  -- Görsel
  hero_icon TEXT, -- "coffee", "pastry", "salad" gibi
  image_url TEXT,

  -- Sıralama ve durum
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  badge TEXT, -- "new", "hot", null

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_business ON categories(business_id);
CREATE INDEX idx_categories_sort ON categories(business_id, sort_order);

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ÜRÜNLER
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- İsim ve açıklama (çok dilli)
  name JSONB NOT NULL DEFAULT '{"tr":"","en":""}'::jsonb,
  description JSONB DEFAULT '{"tr":"","en":""}'::jsonb,

  -- Fiyat ve durum
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'soldout', 'draft', 'archived')),

  -- Görsel
  hero_image_url TEXT,
  hero_icon TEXT, -- placeholder için

  -- Operasyon
  print_station TEXT, -- "bar", "kitchen", "pastry"
  prep_time_minutes INTEGER,

  -- Rozet ve öne çıkarma
  badge TEXT, -- "new", "hot", "chef"
  is_featured BOOLEAN DEFAULT false,

  -- Besin değerleri ve alerjenler
  allergens TEXT[] DEFAULT ARRAY[]::TEXT[],
  dietary_tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- "vegan", "vegetarian", "gluten_free"

  -- Sıralama
  sort_order INTEGER DEFAULT 0,

  -- İstatistik (denormalize — trigger ile güncellenir)
  sales_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(business_id, status);
CREATE INDEX idx_products_featured ON products(business_id, is_featured) WHERE is_featured = true;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ÜRÜN VARYANTLARI (boy, seçenek)
-- ============================================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  name JSONB NOT NULL, -- {"tr": "Küçük", "en": "Small"}
  price_delta NUMERIC(10, 2) DEFAULT 0, -- ana fiyata eklenecek/çıkarılacak fark
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ============================================================
-- ÜRÜN SEÇENEKLERİ (ek seçenekler - "Az şekerli", "Sütsüz" vs.)
-- ============================================================
CREATE TABLE product_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  name JSONB NOT NULL,
  price_delta NUMERIC(10, 2) DEFAULT 0,
  group_name TEXT, -- "Şeker Miktarı", "Süt Tipi" — aynı grup içinde tekli seçim
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_options_product ON product_options(product_id);

-- ============================================================
-- RLS — MENÜ TABLOLARI
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;

-- Kategoriler
CREATE POLICY "categories_member_read" ON categories
  FOR SELECT USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

CREATE POLICY "categories_member_write" ON categories
  FOR ALL USING (
    public.has_permission(business_id, 'menu', 'write')
    OR public.is_super_admin()
  );

-- Ürünler
CREATE POLICY "products_member_read" ON products
  FOR SELECT USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

CREATE POLICY "products_member_write" ON products
  FOR ALL USING (
    public.has_permission(business_id, 'menu', 'write')
    OR public.is_super_admin()
  );

-- Varyantlar ve seçenekler — ürünün iznini takip eder
CREATE POLICY "variants_inherit" ON product_variants
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products
      WHERE business_id IN (SELECT public.user_businesses())
    )
    OR public.is_super_admin()
  );

CREATE POLICY "options_inherit" ON product_options
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products
      WHERE business_id IN (SELECT public.user_businesses())
    )
    OR public.is_super_admin()
  );

-- ============================================================
-- MÜŞTERİ MENÜSÜ İÇİN PUBLIC OKUMA
-- ============================================================
-- QR'dan menüye bakan müşteri anonim. Aktif menüyü görebilmeli.
-- Ama sadece published olanı.

CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (
    active = true
    AND business_id IN (
      SELECT id FROM businesses
      WHERE subscription_status IN ('trial', 'active')
    )
  );

CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (
    status IN ('active', 'soldout')
    AND business_id IN (
      SELECT id FROM businesses
      WHERE subscription_status IN ('trial', 'active')
    )
  );

CREATE POLICY "variants_public_read" ON product_variants
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE status IN ('active', 'soldout'))
  );

CREATE POLICY "options_public_read" ON product_options
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE status IN ('active', 'soldout'))
  );
