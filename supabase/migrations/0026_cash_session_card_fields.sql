-- ============================================================
-- 0026 — KASA KAPANIŞ: KART TUTARI + AYRINTILI MUTABAKAT
-- ============================================================
-- Mevcut alanlar:
--   counted_amount = sayılan nakit (kasiyer girer)
--   expected_amount = hesaplanan nakit (sistem üretir)
--   difference = counted - expected (nakit farkı)
--
-- Yeni alanlar:
--   declared_card = kasiyerin girdiği günün kart tutarı
--   card_expected = sistem hesabındaki kart toplamı
--   card_difference = declared_card - card_expected
--
-- Not: View/mevcut kullanım bozulmasın diye _amount ismindekilere
-- dokunmuyoruz, kart için ayrı alan açıyoruz.
-- ============================================================

ALTER TABLE cash_drawer_sessions
  ADD COLUMN IF NOT EXISTS declared_cash NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS declared_card NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS card_expected NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS cash_variance NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS card_variance NUMERIC(10, 2);

COMMENT ON COLUMN cash_drawer_sessions.declared_cash IS
  'Kasa kapanışında kasiyerin beyan ettiği nakit tutar (sayılan).';
COMMENT ON COLUMN cash_drawer_sessions.declared_card IS
  'Kasa kapanışında kasiyerin beyan ettiği POS kart tutarı.';
COMMENT ON COLUMN cash_drawer_sessions.card_expected IS
  'Sistemin hesabındaki kart ödeme toplamı (kapanış anında snapshot).';
COMMENT ON COLUMN cash_drawer_sessions.cash_variance IS
  'declared_cash - expected_amount (nakit farkı, + fazla / - eksik).';
COMMENT ON COLUMN cash_drawer_sessions.card_variance IS
  'declared_card - card_expected (kart farkı, + fazla / - eksik).';
