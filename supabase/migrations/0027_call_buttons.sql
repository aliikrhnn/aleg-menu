-- ============================================================
-- ALEG - 0027: Çağrı butonları (özel garson çağırma butonları)
-- ============================================================
-- Her işletme istediği kadar farklı isimde çağrı butonu oluşturabilir.
-- Örnek: Nargile Yenile, Garson Çağır, Hesap İste, Su Getir, Çakmak
--
-- Müşteri QR menüden butona basınca waiter_calls'a kayıt düşer
-- ve kasada anlık uyarı gider.
-- ============================================================

-- Çağrı butonları tablosu
CREATE TABLE IF NOT EXISTS call_buttons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                    -- Örnek: Garson Cagir, Nargile Yenile
  emoji TEXT,                             -- Opsiyonel: ☕ 💨 🍽 🧾
  color TEXT DEFAULT 'accent',            -- accent / gold / ok / super / danger
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_buttons_business
  ON call_buttons(business_id, is_active, sort_order);

-- waiter_calls tablosunu esnekleştir
-- call_type enum'unu kaldır (button_id ile referans tutacak), button_name snapshot ekle
ALTER TABLE waiter_calls
  DROP CONSTRAINT IF EXISTS waiter_calls_call_type_check;

ALTER TABLE waiter_calls
  ADD COLUMN IF NOT EXISTS button_id UUID REFERENCES call_buttons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS button_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS button_emoji_snapshot TEXT;

-- ============================================================
-- RLS - call_buttons
-- ============================================================
ALTER TABLE call_buttons ENABLE ROW LEVEL SECURITY;

-- Üyeler her şeyi yapabilir
CREATE POLICY "call_buttons_member" ON call_buttons
  FOR ALL USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

-- Anonim okuma (QR menü için aktif butonlari listeleme)
-- Sadece aktif aboneligi olan isletmeler
CREATE POLICY "call_buttons_public_read" ON call_buttons
  FOR SELECT USING (
    is_active = true
    AND business_id IN (
      SELECT id FROM businesses WHERE subscription_status IN ('trial', 'active')
    )
  );

-- ============================================================
-- TRIGGER - updated_at otomatik
-- ============================================================
CREATE TRIGGER update_call_buttons_updated_at
  BEFORE UPDATE ON call_buttons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DEFAULT BUTON - mevcut tum isletmelere "Garson Cagir" ekle
-- ============================================================
INSERT INTO call_buttons (business_id, name, emoji, color, sort_order)
SELECT id, 'Garson Cagir', NULL, 'accent', 0
FROM businesses
WHERE NOT EXISTS (
  SELECT 1 FROM call_buttons WHERE call_buttons.business_id = businesses.id
);
-- Emoji NULL: panelden UI ile eklenir/düzenlenir, varsayilan icon SVG zil kullanilacak

-- ============================================================
-- REALTIME - waiter_calls icin publication ekle (zaten varsa noop)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'waiter_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
  END IF;
END $$;
