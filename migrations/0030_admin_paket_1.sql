-- =============================================================================
-- Migration: 0030_admin_paket_1
-- Süper admin paneli - Paket 1 (Dashboard + İstatistikler) için gerekli yapı
--
-- Eklenen şeyler:
--   1. platform_invoices         (faturalar - kritik ödemeler kartı için)
--   2. platform_audit_logs       (aktivite akışı + login-as için)
--   3. v_admin_dashboard         (dashboard metric view'ı - performans)
--   4. v_admin_pending_payments  (bekleyen ödemeler view'ı)
--   5. v_admin_city_dist         (şehir bazlı işletme dağılımı)
--   6. v_admin_signups_7d        (son 7 gün kayıt grafiği)
--   7. log_audit() RPC           (audit log insert helper)
-- =============================================================================

-- =============================================================================
-- 1. PLATFORM_INVOICES — işletmelerin aylık faturaları
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_invoices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_no    text NOT NULL UNIQUE,                              -- INV-2604-0287
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  amount        numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency      text NOT NULL DEFAULT 'TRY',
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  payment_method text,                                              -- iyzico, havale, manuel
  paid_at       timestamptz,
  due_at        timestamptz NOT NULL,
  retry_count   int NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_invoices_business
  ON platform_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status
  ON platform_invoices(status) WHERE status IN ('pending','failed');
CREATE INDEX IF NOT EXISTS idx_platform_invoices_due
  ON platform_invoices(due_at) WHERE status = 'pending';

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_platform_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_platform_invoices_updated_at ON platform_invoices;
CREATE TRIGGER trg_platform_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION set_platform_invoices_updated_at();

-- RLS: sadece super_admin görebilir
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_invoices super admin all" ON platform_invoices;
CREATE POLICY "platform_invoices super admin all" ON platform_invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- =============================================================================
-- 2. PLATFORM_AUDIT_LOGS — append-only platform aktivite günlüğü
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id            bigserial PRIMARY KEY,
  ts            timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   text,                                                -- snapshot
  actor_name    text,                                                -- snapshot
  is_system     boolean NOT NULL DEFAULT false,                      -- system-level event
  action        text NOT NULL,                                       -- business.suspend, plan.upgrade, ...
  target_type   text,                                                -- 'business', 'invoice', 'plan', ...
  target_id     uuid,
  target_label  text,                                                -- snapshot - "Karaköy Kahve Evi"
  business_id   uuid REFERENCES businesses(id) ON DELETE SET NULL,   -- ilgili işletme
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,                  -- {plan_from, plan_to, amount, ...}
  ip_address    inet,
  user_agent    text,
  tone          text DEFAULT 'muted'
    CHECK (tone IN ('ok','warn','danger','super','muted','gold','olive'))
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON platform_audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_business ON platform_audit_logs(business_id, ts DESC)
  WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_actor ON platform_audit_logs(actor_id, ts DESC)
  WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_action ON platform_audit_logs(action);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit super admin read" ON platform_audit_logs;
CREATE POLICY "audit super admin read" ON platform_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- Insert sadece service_role veya RPC üzerinden
DROP POLICY IF EXISTS "audit super admin insert" ON platform_audit_logs;
CREATE POLICY "audit super admin insert" ON platform_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- =============================================================================
-- 3. log_audit() RPC — kolay kullanım için helper
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit(
  p_action       text,
  p_target_type  text DEFAULT NULL,
  p_target_id    uuid DEFAULT NULL,
  p_target_label text DEFAULT NULL,
  p_business_id  uuid DEFAULT NULL,
  p_meta         jsonb DEFAULT '{}'::jsonb,
  p_tone         text DEFAULT 'muted'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     bigint;
  v_email  text;
  v_name   text;
BEGIN
  -- super admin değilse hata
  IF NOT EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Yetkisiz: super admin değil';
  END IF;

  -- actor snapshot
  SELECT u.email, sa.full_name
    INTO v_email, v_name
    FROM auth.users u
    LEFT JOIN super_admins sa ON sa.user_id = u.id
    WHERE u.id = auth.uid();

  INSERT INTO platform_audit_logs(
    actor_id, actor_email, actor_name,
    action, target_type, target_id, target_label,
    business_id, meta, tone
  )
  VALUES(
    auth.uid(), v_email, v_name,
    p_action, p_target_type, p_target_id, p_target_label,
    p_business_id, p_meta, p_tone
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- =============================================================================
-- 4. v_admin_dashboard — Tüm dashboard metric'leri tek view'da
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_dashboard AS
WITH
  totals AS (
    SELECT
      COUNT(*) FILTER (WHERE 1=1)                                AS total_businesses,
      COUNT(*) FILTER (WHERE subscription_status IN ('active','trial'))
                                                                 AS active_subscriptions,
      COUNT(*) FILTER (WHERE subscription_status = 'trial')      AS trial_count,
      COUNT(*) FILTER (WHERE subscription_status = 'active')     AS paid_count,
      COUNT(*) FILTER (WHERE subscription_status IN ('past_due','suspended'))
                                                                 AS at_risk_count,
      COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)    AS new_today,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
                                                                 AS new_7d,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
                                                                 AS new_30d
    FROM businesses
  ),
  -- MRR — aktif aboneliklerin plan ücretlerinin toplamı
  mrr_calc AS (
    SELECT COALESCE(SUM(p.price_monthly), 0) AS mrr
    FROM businesses b
    LEFT JOIN platform_plans p ON p.id = b.plan_id
    WHERE b.subscription_status = 'active'
  ),
  -- Bu ay tahsil edilen
  collected AS (
    SELECT COALESCE(SUM(amount), 0) AS this_month_paid
    FROM platform_invoices
    WHERE status = 'paid'
      AND paid_at >= date_trunc('month', CURRENT_DATE)
  ),
  -- Bekleyen ödemeler
  pending AS (
    SELECT
      COUNT(*) AS pending_count,
      COALESCE(SUM(amount), 0) AS pending_amount
    FROM platform_invoices
    WHERE status = 'pending'
  ),
  -- Churn risk: 7 gündür giriş yapmamış aktif işletmeler
  -- last_login_at için businesses tablosunda kolon yoksa şimdilik 0
  churn AS (
    SELECT 0::bigint AS churn_risk_count
  )
SELECT
  t.total_businesses,
  t.active_subscriptions,
  t.trial_count,
  t.paid_count,
  t.at_risk_count,
  t.new_today,
  t.new_7d,
  t.new_30d,
  m.mrr,
  c.this_month_paid,
  p.pending_count,
  p.pending_amount,
  ch.churn_risk_count
FROM totals t
CROSS JOIN mrr_calc m
CROSS JOIN collected c
CROSS JOIN pending p
CROSS JOIN churn ch;

-- =============================================================================
-- 5. v_admin_pending_payments — Kritik bekleyen ödemeler
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_pending_payments AS
SELECT
  i.id,
  i.invoice_no,
  i.business_id,
  b.name           AS business_name,
  b.slug           AS business_slug,
  i.amount,
  i.currency,
  i.due_at,
  GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - i.due_at)) / 86400))::int AS days_overdue,
  i.retry_count,
  -- logo: name'in baş harfleri
  UPPER(LEFT(REGEXP_REPLACE(b.name, '[^a-zA-ZığüşöçĞÜŞÖÇ]', '', 'g'), 2)) AS logo
FROM platform_invoices i
JOIN businesses b ON b.id = i.business_id
WHERE i.status = 'pending'
ORDER BY i.due_at ASC;

-- =============================================================================
-- 6. v_admin_city_dist — Şehir bazlı dağılım (TurkiyeMap için)
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_city_dist AS
SELECT
  COALESCE(NULLIF(TRIM(city), ''), 'Belirtilmemiş') AS city,
  COUNT(*)::int                                      AS count
FROM businesses
WHERE subscription_status IN ('active','trial')
GROUP BY 1
ORDER BY count DESC;

-- =============================================================================
-- 7. v_admin_signups_7d — Son 7 gün haftalık kayıt grafiği
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_signups_7d AS
WITH days AS (
  SELECT generate_series(
    (CURRENT_DATE - INTERVAL '6 days')::date,
    CURRENT_DATE::date,
    INTERVAL '1 day'
  )::date AS day
),
counts AS (
  SELECT created_at::date AS day, COUNT(*)::int AS cnt
  FROM businesses
  WHERE created_at::date >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY 1
)
SELECT
  d.day,
  COALESCE(c.cnt, 0) AS count,
  TO_CHAR(d.day, 'TMDy') AS label_short
FROM days d
LEFT JOIN counts c ON c.day = d.day
ORDER BY d.day;

-- =============================================================================
-- 8. v_admin_business_growth_12m — son 12 ay büyüme (İstatistikler için)
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_business_growth_12m AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
    date_trunc('month', CURRENT_DATE),
    INTERVAL '1 month'
  )::date AS m
),
cumulative AS (
  SELECT
    m.m AS month,
    (SELECT COUNT(*) FROM businesses WHERE created_at < m.m + INTERVAL '1 month') AS cnt
  FROM months m
)
SELECT month, cnt::int AS count
FROM cumulative
ORDER BY month;

-- =============================================================================
-- 9. v_admin_mrr_growth_12m — son 12 ay MRR büyüme
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_mrr_growth_12m AS
WITH months AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
    date_trunc('month', CURRENT_DATE),
    INTERVAL '1 month'
  )::date AS m
)
SELECT
  m.m AS month,
  COALESCE(
    (
      SELECT SUM(amount)::numeric
      FROM platform_invoices
      WHERE status = 'paid'
        AND paid_at >= m.m
        AND paid_at < m.m + INTERVAL '1 month'
    ),
    0
  ) AS revenue
FROM months m
ORDER BY m.m;

-- =============================================================================
-- 10. v_admin_funnel_30d — kayıt → trial → ödeme hunisi (Login-as ekstra ile)
-- =============================================================================
CREATE OR REPLACE VIEW v_admin_funnel_30d AS
WITH base AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')   AS signups,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                        AND subscription_status IN ('trial','active'))         AS started_trial,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                        AND subscription_status = 'active')                    AS converted,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                        AND subscription_status IN ('cancelled','suspended'))  AS churned
  FROM businesses
)
SELECT * FROM base;

-- =============================================================================
-- GRANT izinleri (RLS zaten var)
-- =============================================================================
GRANT SELECT ON v_admin_dashboard, v_admin_pending_payments, v_admin_city_dist,
               v_admin_signups_7d, v_admin_business_growth_12m,
               v_admin_mrr_growth_12m, v_admin_funnel_30d
  TO authenticated;

GRANT EXECUTE ON FUNCTION log_audit(text, text, uuid, text, uuid, jsonb, text)
  TO authenticated;

-- =============================================================================
-- TEST DATA (opsiyonel — yorum kaldır kullan)
-- =============================================================================
-- INSERT INTO platform_invoices(business_id, invoice_no, period_start, period_end,
--   amount, status, due_at, paid_at)
-- SELECT id, 'INV-' || TO_CHAR(now(), 'YYMM') || '-' || LPAD(((random()*9999)::int)::text, 4, '0'),
--        date_trunc('month', CURRENT_DATE),
--        date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day',
--        CASE WHEN random() < 0.3 THEN 999 WHEN random() < 0.7 THEN 2499 ELSE 7499 END,
--        CASE WHEN random() < 0.7 THEN 'paid' WHEN random() < 0.9 THEN 'pending' ELSE 'failed' END,
--        now() + (random() * 30 || ' days')::interval,
--        CASE WHEN random() < 0.7 THEN now() - (random() * 20 || ' days')::interval ELSE NULL END
-- FROM businesses WHERE subscription_status = 'active' LIMIT 8;

COMMIT;
