-- ============================================================
-- Migration 0017 FIXED: Müşteri Değerlendirmeleri
-- ============================================================
-- Eski/yarım reviews tablosu varsa temizle
DROP TABLE IF EXISTS reviews CASCADE;

-- Mevcut businesses receipt_settings'e yeni alanları ekle
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
-- Reviews tablosu (TEMIZ)
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  redirected_to_google BOOLEAN DEFAULT false,
  reply_text TEXT,
  reply_at TIMESTAMPTZ,
  reply_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_business_date ON reviews(business_id, created_at DESC);
CREATE INDEX idx_reviews_business_rating ON reviews(business_id, rating);
CREATE INDEX idx_reviews_order ON reviews(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_business_member_read" ON reviews
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "reviews_business_member_update" ON reviews
  FOR UPDATE TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
