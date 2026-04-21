-- ============================================================
-- Migration 0008: QR Codes için RLS + Public Read
-- ============================================================
-- Müşteri QR tarayınca slug'dan table_id bulmamız lazım.
-- Bu yüzden qr_codes anon için okunabilir olmalı (ama sadece aktif olanlar).
-- ============================================================

-- İşletme üyeleri kendi işletmelerinin QR kodlarını görebilir
DROP POLICY IF EXISTS "qr_codes_member_read" ON qr_codes;
CREATE POLICY "qr_codes_member_read" ON qr_codes
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

-- İşletme üyeleri QR kod ekleyebilir/güncelleyebilir
DROP POLICY IF EXISTS "qr_codes_member_write" ON qr_codes;
CREATE POLICY "qr_codes_member_write" ON qr_codes
  FOR ALL
  TO authenticated
  USING (
    public.has_permission(business_id, 'pos', 'write')
    OR public.is_super_admin()
  );

-- Anon müşteriler aktif QR kodları okuyabilir (slug -> table_id için)
DROP POLICY IF EXISTS "qr_codes_public_read" ON qr_codes;
CREATE POLICY "qr_codes_public_read" ON qr_codes
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true
    AND business_id IN (
      SELECT id FROM businesses
      WHERE subscription_status IN ('trial', 'active')
    )
  );

-- Slug sorgusu hızlı olsun
CREATE INDEX IF NOT EXISTS idx_qr_codes_slug ON qr_codes(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_qr_codes_table ON qr_codes(table_id);
