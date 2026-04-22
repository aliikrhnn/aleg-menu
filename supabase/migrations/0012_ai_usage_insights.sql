-- ============================================================
-- Migration 0012: AI usage feature enum genişletme
-- 'variation' ve 'insights' feature'larını ekle
-- ============================================================

-- Önce eski CHECK constraint'i kaldır
ALTER TABLE ai_usage DROP CONSTRAINT IF EXISTS ai_usage_feature_check;

-- Yeni CHECK constraint ekle (insights dahil tüm feature'lar)
ALTER TABLE ai_usage ADD CONSTRAINT ai_usage_feature_check
  CHECK (feature IN ('slogan', 'monogram', 'chat', 'variation', 'insights'));
