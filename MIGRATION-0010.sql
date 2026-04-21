-- AI rate limit takibi için ai_usage tablosu
-- Supabase SQL Editor'da çalıştır

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  feature TEXT NOT NULL CHECK (feature IN ('slogan', 'monogram', 'chat')),
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_business_feature_date
  ON ai_usage(business_id, feature, created_at DESC);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_member_read" ON ai_usage;
CREATE POLICY "ai_usage_member_read" ON ai_usage
  FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );
