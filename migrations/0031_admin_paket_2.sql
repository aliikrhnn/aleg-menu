-- =============================================================================
-- Migration: 0031_admin_paket_2
-- Süper admin Paket 2: İşletmeler komple
--
-- Eklenen şeyler:
--   1. businesses.last_login_at      (churn risk + son giriş için)
--   2. businesses.last_login_at sync trigger (auth.users.last_sign_in_at)
--   3. businesses.approved_at        (onay zamanı)
--   4. businesses.suspended_at       (askı zamanı)
--   5. businesses.suspended_reason   (askı sebebi)
--   6. subscription_status check'i  ('pending_approval' eklendi)
--   7. v_admin_business_metrics      (her işletmenin MRR/sipariş30g/son giriş)
--   8. v_admin_business_revenue_30d  (detay sayfası ciro sparkline)
-- =============================================================================

-- ============================================================
-- 1. last_login_at kolonu (yoksa ekle)
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_login_at  timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS approved_at    timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS suspended_at   timestamptz;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE INDEX IF NOT EXISTS idx_businesses_last_login
  ON businesses(last_login_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_businesses_status
  ON businesses(subscription_status);

-- ============================================================
-- 2. subscription_status check'ini güncelle
-- ============================================================
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Eski check varsa düşür
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'businesses'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%subscription_status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE businesses DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  -- Yeni check ekle (pending_approval eklendi)
  ALTER TABLE businesses
    ADD CONSTRAINT businesses_subscription_status_check
    CHECK (subscription_status IN (
      'pending_approval','trial','active','past_due','suspended','cancelled'
    ));
END $$;

-- ============================================================
-- 3. last_login_at SYNC trigger
-- auth.users tablosu güncellendiğinde businesses.last_login_at de güncellenir
-- ============================================================
CREATE OR REPLACE FUNCTION sync_business_last_login()
RETURNS TRIGGER AS $$
BEGIN
  -- last_sign_in_at değiştiyse, ilgili işletmenin last_login_at'i güncellensin
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE businesses
    SET last_login_at = NEW.last_sign_in_at
    WHERE owner_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_business_last_login ON auth.users;
CREATE TRIGGER trg_sync_business_last_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_business_last_login();

-- Mevcut kullanıcıların last_login_at'ini hemen senkronize et
UPDATE businesses b
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE u.id = b.owner_user_id
  AND b.last_login_at IS NULL;

-- ============================================================
-- 4. Churn risk view'ını güncelle (v_admin_dashboard'da kullanılıyordu)
-- ============================================================
DROP VIEW IF EXISTS v_admin_dashboard CASCADE;

CREATE VIEW v_admin_dashboard AS
WITH
  totals AS (
    SELECT
      COUNT(*)                                                   AS total_businesses,
      COUNT(*) FILTER (WHERE subscription_status IN ('active','trial'))
                                                                 AS active_subscriptions,
      COUNT(*) FILTER (WHERE subscription_status = 'trial')      AS trial_count,
      COUNT(*) FILTER (WHERE subscription_status = 'active')     AS paid_count,
      COUNT(*) FILTER (WHERE subscription_status IN ('past_due','suspended'))
                                                                 AS at_risk_count,
      COUNT(*) FILTER (WHERE subscription_status = 'pending_approval')
                                                                 AS pending_approval_count,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)    AS new_today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
                                                                 AS new_7d,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
                                                                 AS new_30d,
      -- Churn risk: aktif/trial olup 7 gündür giriş yapmamış
      COUNT(*) FILTER (
        WHERE subscription_status IN ('active','trial')
          AND (last_login_at IS NULL
               OR last_login_at < now() - INTERVAL '7 days')
      )                                                          AS churn_risk_count
    FROM businesses
  ),
  mrr_calc AS (
    SELECT COALESCE(SUM(p.price_monthly), 0) AS mrr
    FROM businesses b
    LEFT JOIN platform_plans p ON p.id = b.plan_id
    WHERE b.subscription_status = 'active'
  ),
  collected AS (
    SELECT COALESCE(SUM(amount), 0) AS this_month_paid
    FROM platform_invoices
    WHERE status = 'paid'
      AND paid_at >= date_trunc('month', CURRENT_DATE)
  ),
  pending AS (
    SELECT
      COUNT(*) AS pending_count,
      COALESCE(SUM(amount), 0) AS pending_amount
    FROM platform_invoices
    WHERE status = 'pending'
  )
SELECT
  t.total_businesses,
  t.active_subscriptions,
  t.trial_count,
  t.paid_count,
  t.at_risk_count,
  t.pending_approval_count,
  t.new_today,
  t.new_7d,
  t.new_30d,
  m.mrr,
  c.this_month_paid,
  p.pending_count,
  p.pending_amount,
  t.churn_risk_count
FROM totals t
CROSS JOIN mrr_calc m
CROSS JOIN collected c
CROSS JOIN pending p;

-- ============================================================
-- 5. v_admin_business_list — liste sayfası için zengin veri
-- Her işletmenin: plan adı, MRR (ödeme yapan), sipariş30g, son giriş
-- ============================================================
CREATE OR REPLACE VIEW v_admin_business_list AS
SELECT
  b.id,
  b.slug,
  b.name,
  b.city,
  b.email,
  b.phone,
  b.subscription_status,
  b.trial_ends_at,
  b.created_at,
  b.last_login_at,
  b.approved_at,
  b.suspended_at,
  b.suspended_reason,
  b.owner_user_id,
  b.plan_id,
  p.name                        AS plan_name,
  p.slug                        AS plan_slug,
  COALESCE(p.price_monthly, 0)  AS plan_price,
  COALESCE((
    SELECT COUNT(*) FROM orders o
    WHERE o.business_id = b.id
      AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ), 0)::int                    AS orders_30d,
  -- Logo (kısaltma — name'in ilk harfleri)
  UPPER(LEFT(REGEXP_REPLACE(b.name, '[^a-zA-ZığüşöçĞÜŞÖÇ]', '', 'g'), 2)) AS logo,
  -- Sahibi
  COALESCE(u.email, b.email)    AS owner_email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') AS owner_name
FROM businesses b
LEFT JOIN platform_plans p ON p.id = b.plan_id
LEFT JOIN auth.users u      ON u.id = b.owner_user_id;

-- ============================================================
-- 6. v_admin_business_revenue_30d — detay sayfası için ciro sparkline
-- ============================================================
CREATE OR REPLACE VIEW v_admin_business_revenue_30d AS
WITH days AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '29 days')::date,
    CURRENT_DATE::date,
    INTERVAL '1 day'
  )::date AS day
),
revenue AS (
  SELECT
    o.business_id,
    o.created_at::date AS day,
    COALESCE(SUM(o.total), 0)::numeric AS amount
  FROM orders o
  WHERE o.created_at::date >= CURRENT_DATE - INTERVAL '29 days'
    AND o.status NOT IN ('cancelled','draft')
  GROUP BY 1, 2
)
SELECT
  b.id   AS business_id,
  d.day,
  COALESCE(r.amount, 0) AS amount
FROM businesses b
CROSS JOIN days d
LEFT JOIN revenue r
  ON r.business_id = b.id AND r.day = d.day
ORDER BY b.id, d.day;

-- ============================================================
-- 7. business_users tab'ı için yardımcı (placeholder şimdilik)
-- v_admin_business_members → mevcut business_members + auth.users join
-- ============================================================
CREATE OR REPLACE VIEW v_admin_business_members AS
SELECT
  bm.business_id,
  bm.user_id,
  bm.full_name,
  bm.phone,
  bm.status,
  bm.joined_at,
  r.name        AS role_name,
  r.is_owner,
  u.email,
  u.last_sign_in_at,
  u.created_at  AS user_created_at
FROM business_members bm
LEFT JOIN roles r      ON r.id = bm.role_id
LEFT JOIN auth.users u ON u.id = bm.user_id;

-- ============================================================
-- GRANT
-- ============================================================
GRANT SELECT ON v_admin_business_list,
                v_admin_business_revenue_30d,
                v_admin_business_members
  TO authenticated;

-- ============================================================
-- ✓ BAŞARI
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✓ businesses tablosuna 4 kolon eklendi (last_login_at, approved_at, suspended_at, suspended_reason)';
  RAISE NOTICE '✓ subscription_status check güncellendi (pending_approval eklendi)';
  RAISE NOTICE '✓ Auth users login sync trigger kuruldu';
  RAISE NOTICE '✓ v_admin_dashboard güncellendi (gerçek churn risk + pending_approval count)';
  RAISE NOTICE '✓ v_admin_business_list, v_admin_business_revenue_30d, v_admin_business_members hazır';
  RAISE NOTICE '✓ Migration 0031 başarılı!';
END $$;
