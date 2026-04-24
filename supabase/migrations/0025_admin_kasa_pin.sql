-- ============================================================
-- 0025 — ADMIN KASA PIN
-- ============================================================
-- Kasa sekmesine giriş için yönetici tarafından belirlenen 4-6
-- haneli PIN. Hash edilmiş olarak businesses.admin_kasa_pin_hash'te
-- saklanir. Kasiyer bu PIN ile kasa sekmesine girer.
--
-- Yeni alan: businesses.admin_kasa_pin_hash TEXT (SHA-256 hex)
-- Ayar sayfasinda belirlenir, kasa sekmesinde her girişte istenir.
-- ============================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS admin_kasa_pin_hash TEXT;

COMMENT ON COLUMN businesses.admin_kasa_pin_hash IS
  'Kasa ekranı admin girişi için PIN hash (SHA-256). NULL ise PIN yok, sekme kilitsiz.';
