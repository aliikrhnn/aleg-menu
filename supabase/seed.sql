-- ============================================================
-- ALEG - SEED DATA (Test için örnek veri)
-- ============================================================
-- Bu dosya geliştirme ortamında test için çalıştırılır.
-- Production'da KULLANMAYIN.
-- ============================================================

-- ============================================================
-- PLATFORM PLANLARI
-- ============================================================

INSERT INTO platform_plans (slug, name, description, price_monthly, price_yearly, features, max_branches, max_products, max_team_members, sort_order)
VALUES
  ('starter', 'Başlangıç', 'Tek şubeli küçük kafeler için', 299, 2990,
   '{"modules": ["qr_menu", "basic_reports"], "support": "email"}'::jsonb,
   1, 100, 3, 1),

  ('pro', 'Pro', 'Büyüyen kafeler için en popüler plan', 699, 6990,
   '{"modules": ["qr_menu", "pos", "kitchen_display", "loyalty", "reports"], "support": "email,phone"}'::jsonb,
   3, 500, 10, 2),

  ('enterprise', 'Kurumsal', 'Zincir işletmeler için sınırsız', 1499, 14990,
   '{"modules": ["all"], "support": "priority,dedicated", "custom_domain": true}'::jsonb,
   999, 9999, 50, 3);

-- ============================================================
-- ÖRNEK İŞLETME
-- ============================================================

INSERT INTO businesses (id, slug, name, city, plan_id, subscription_status)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'karakoy',
  'Aleg Karaköy',
  'İstanbul',
  id,
  'trial'
FROM platform_plans WHERE slug = 'pro';

-- Varsayılan roller
INSERT INTO roles (business_id, name, is_owner, is_default, permissions)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sahip', true, false,
   '{"menu": ["read","write"], "pos": ["read","write"], "reports": ["read","write"], "team": ["read","write"], "settings": ["read","write"]}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'Garson', false, true,
   '{"menu": ["read"], "pos": ["read","write"], "reports": [], "team": [], "settings": []}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'Barista', false, false,
   '{"menu": ["read"], "pos": ["read"], "reports": [], "team": [], "settings": []}'::jsonb);

-- Ana şube
INSERT INTO branches (business_id, name, slug, address, is_main)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Karaköy Merkez', 'karakoy-merkez',
   'Galata Kulesi Yakını, Karaköy, İstanbul', true);

-- Masa bölgeleri
INSERT INTO table_zones (business_id, name, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Salon', 1),
  ('00000000-0000-0000-0000-000000000001', 'Bahçe', 2),
  ('00000000-0000-0000-0000-000000000001', 'Bar', 3);

-- Masalar
INSERT INTO tables (business_id, name, capacity, status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'M' || n,
  CASE WHEN n % 3 = 0 THEN 4 ELSE 2 END,
  'available'
FROM generate_series(1, 15) n;

-- ============================================================
-- ÖRNEK KATEGORİLER
-- ============================================================

INSERT INTO categories (business_id, name, hero_icon, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Espresso Bazlı","en":"Espresso Based"}', 'coffee', 1),
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Filtre & Slow","en":"Filter & Slow"}', 'coffee-filter', 2),
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Mevsim Kahveleri","en":"Seasonal"}', 'seasonal', 3),
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Tatlılar","en":"Desserts"}', 'pastry', 4),
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Brunch","en":"Brunch"}', 'salad', 5),
  ('00000000-0000-0000-0000-000000000001', '{"tr":"Soğuk İçecekler","en":"Cold Drinks"}', 'cold', 6);

-- ============================================================
-- ÖRNEK ÜRÜNLER (subquery ile kategori ID bulunur - DO block yok)
-- ============================================================

INSERT INTO products (business_id, category_id, name, description, price, print_station, status, is_featured, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 1),
   '{"tr":"Flat White","en":"Flat White"}',
   '{"tr":"Ethiopia Yirgacheffe, ipeksi süt dokusu, çift shot","en":"Ethiopia Yirgacheffe, silky microfoam, double shot"}',
   95, 'bar', 'active', true, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 1),
   '{"tr":"Cortado","en":"Cortado"}',
   '{"tr":"1:1 espresso ve ılık süt","en":"1:1 espresso to warm milk"}',
   85, 'bar', 'active', false, 2),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 1),
   '{"tr":"Espresso","en":"Espresso"}',
   '{"tr":"Çift shot, yoğun ve karakterli","en":"Double shot, bold and characterful"}',
   55, 'bar', 'active', false, 3),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 2),
   '{"tr":"Chemex 600ml","en":"Chemex 600ml"}',
   '{"tr":"Kolombiya Huila, kakao ve kiraz notaları","en":"Colombia Huila, cocoa and cherry"}',
   140, 'bar', 'active', false, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 2),
   '{"tr":"V60 Geyşa","en":"V60 Geisha"}',
   '{"tr":"Panama Hartmann, çiçeksi ve bergamot","en":"Panama Hartmann, floral, bergamot"}',
   220, 'bar', 'active', true, 2),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 3),
   '{"tr":"Mor Limonata","en":"Violet Lemonade"}',
   '{"tr":"Ev yapımı ihlamur ve mor havuç şurubu","en":"House linden syrup with purple carrot"}',
   110, 'bar', 'active', false, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 4),
   '{"tr":"Tahinli Cookie","en":"Tahini Cookie"}',
   '{"tr":"Kavurma tahini, çikolata parçaları, deniz tuzu","en":"Roasted tahini, dark chocolate, sea salt"}',
   65, 'kitchen', 'active', false, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 5),
   '{"tr":"Karpuzlu Feta Salata","en":"Watermelon Feta"}',
   '{"tr":"Karpuz, feta, nane, roka, balsamik","en":"Watermelon, feta, mint, rocket, balsamic"}',
   185, 'kitchen', 'soldout', false, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 5),
   '{"tr":"Avokadolu Ekşi Maya","en":"Avocado Sourdough"}',
   '{"tr":"Ekşi maya, avokado püresi, yumurta, acı pul biber","en":"Sourdough, avocado, egg, chili flakes"}',
   165, 'kitchen', 'active', true, 2),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 6),
   '{"tr":"Ice Matcha Latte","en":"Iced Matcha Latte"}',
   '{"tr":"Uji matcha, yulaf sütü, vanilya","en":"Uji matcha, oat milk, vanilla"}',
   115, 'bar', 'active', true, 1),

  ('00000000-0000-0000-0000-000000000001',
   (SELECT id FROM categories WHERE business_id = '00000000-0000-0000-0000-000000000001' AND sort_order = 6),
   '{"tr":"Kombucha Nar","en":"Pomegranate Kombucha"}',
   '{"tr":"Ev yapımı kombucha, nar, zencefil","en":"House kombucha, pomegranate, ginger"}',
   95, 'bar', 'draft', false, 2);

-- İstasyonlar
INSERT INTO stations (business_id, name, kind, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bar', 'bar', 1),
  ('00000000-0000-0000-0000-000000000001', 'Mutfak', 'kitchen', 2);

-- Loyalty config (varsayılan)
INSERT INTO loyalty_config (business_id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Modüller (Pro plan için aktif olanlar)
INSERT INTO business_modules (business_id, module_id, is_on)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'qr_menu', true),
  ('00000000-0000-0000-0000-000000000001', 'pos', true),
  ('00000000-0000-0000-0000-000000000001', 'kitchen_display', true),
  ('00000000-0000-0000-0000-000000000001', 'loyalty', true),
  ('00000000-0000-0000-0000-000000000001', 'delivery', false),
  ('00000000-0000-0000-0000-000000000001', 'stock', false),
  ('00000000-0000-0000-0000-000000000001', 'shifts', false);
