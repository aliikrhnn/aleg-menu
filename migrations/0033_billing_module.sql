-- =============================================================================
-- Migration: 0033_billing_module
-- Süper admin Paket 3: Billing modülü (Planlar + Faturalar + Ödemeler + Bekleyen)
--
-- Eklenenler:
--   1. platform_payments tablosu (yeni)
--   2. paid_at otomatik set trigger (status='paid' olunca)
--   3. v_admin_invoices_list  (faturalar listesi - işletme join'li)
--   4. v_admin_payments_list  (ödemeler listesi - invoice + business join'li)
--   5. v_admin_pending_invoices (bekleyen faturalar — vade sıralı)
--   6. v_admin_billing_metrics (üst panel için: bu ay tahsilat, bekleyen vs)
--   7. v_admin_payments_monthly (son 12 ay grafik için)
--   8. v_admin_plan_subscriber_count (her planda kaç işletme aktif)
-- =============================================================================

-- ============================================================
-- 1. platform_payments tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid REFERENCES platform_invoices(id) ON DELETE SET NULL,
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  amount          numeric NOT NULL,
  currency        text NOT NULL DEFAULT 'TRY',

  -- Ödeme yöntemi: card / bank_transfer / cash / manual / other
  payment_method  text NOT NULL DEFAULT 'manual',

  -- Ödeme durumu: succeeded / pending / failed / refunded
  status          text NOT NULL DEFAULT 'succeeded',

  -- Stripe/iyzico/diğer geçit ID'si
  transaction_id  text,

  -- Ödeme zamanı (banka veya kart geçişi)
  paid_at         timestamptz NOT NULL DEFAULT now(),

  -- Manuel kaydedildiyse kim, ne notla
  recorded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT platform_payments_status_check
    CHECK (status IN ('succeeded','pending','failed','refunded')),
  CONSTRAINT platform_payments_method_check
    CHECK (payment_method IN ('card','bank_transfer','cash','manual','other'))
);

CREATE INDEX IF NOT EXISTS idx_pp_business      ON platform_payments(business_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_pp_invoice       ON platform_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pp_status        ON platform_payments(status);
CREATE INDEX IF NOT EXISTS idx_pp_paid_at       ON platform_payments(paid_at DESC);

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION pp_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pp_updated_at ON platform_payments;
CREATE TRIGGER trg_pp_updated_at
  BEFORE UPDATE ON platform_payments
  FOR EACH ROW EXECUTE FUNCTION pp_touch_updated_at();

-- RLS — sadece super admin
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_payments_super_admin" ON platform_payments;
CREATE POLICY "platform_payments_super_admin" ON platform_payments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
  ));

-- ============================================================
-- 2. platform_invoices.paid_at auto-set trigger
-- status='paid' olduğunda paid_at otomatik dolar
-- ============================================================
CREATE OR REPLACE FUNCTION inv_auto_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  -- status değişti ve paid'e geçtiyse, paid_at boşsa şimdi yaz
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;
  -- updated_at her durumda touch
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inv_auto_paid_at ON platform_invoices;
CREATE TRIGGER trg_inv_auto_paid_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION inv_auto_paid_at();

-- ============================================================
-- 3. v_admin_invoices_list — işletme bilgisi join'li
-- ============================================================
CREATE OR REPLACE VIEW v_admin_invoices_list AS
SELECT
  i.id,
  i.invoice_no,
  i.business_id,
  b.name              AS business_name,
  b.slug              AS business_slug,
  UPPER(LEFT(REGEXP_REPLACE(b.name, '[^a-zA-ZığüşöçĞÜŞÖÇ]', '', 'g'), 2)) AS business_logo,
  i.amount,
  i.currency,
  i.status,
  i.payment_method,
  i.period_start,
  i.period_end,
  i.due_at,
  i.paid_at,
  i.retry_count,
  i.notes,
  i.created_at,
  -- Kaç gün gecikti? (sadece pending/failed için anlamlı)
  CASE
    WHEN i.status IN ('pending','failed') AND i.due_at < now()
      THEN EXTRACT(EPOCH FROM (now() - i.due_at))::int / 86400
    ELSE 0
  END AS days_overdue,
  -- Vade yakın mı (bekleyen ve 7 gün içinde)
  CASE
    WHEN i.status IN ('pending','failed') AND i.due_at >= now() AND i.due_at < now() + INTERVAL '7 days'
      THEN true ELSE false
  END AS due_soon
FROM platform_invoices i
LEFT JOIN businesses b ON b.id = i.business_id;

-- ============================================================
-- 4. v_admin_payments_list — ödeme + invoice + business
-- ============================================================
CREATE OR REPLACE VIEW v_admin_payments_list AS
SELECT
  p.id,
  p.invoice_id,
  p.business_id,
  b.name                AS business_name,
  b.slug                AS business_slug,
  UPPER(LEFT(REGEXP_REPLACE(b.name, '[^a-zA-ZığüşöçĞÜŞÖÇ]', '', 'g'), 2)) AS business_logo,
  i.invoice_no,
  p.amount,
  p.currency,
  p.payment_method,
  p.status,
  p.transaction_id,
  p.paid_at,
  p.notes,
  p.created_at,
  COALESCE(u.email, '[manuel]') AS recorded_by_email
FROM platform_payments p
LEFT JOIN businesses b        ON b.id = p.business_id
LEFT JOIN platform_invoices i ON i.id = p.invoice_id
LEFT JOIN auth.users u        ON u.id = p.recorded_by;

-- ============================================================
-- 5. v_admin_pending_invoices — bekleyen + gecikmiş, vade sıralı
-- ============================================================
CREATE OR REPLACE VIEW v_admin_pending_invoices AS
SELECT *
FROM v_admin_invoices_list
WHERE status IN ('pending','failed')
ORDER BY due_at ASC;

-- ============================================================
-- 6. v_admin_billing_metrics — üst panel istatistikleri
-- ============================================================
CREATE OR REPLACE VIEW v_admin_billing_metrics AS
WITH this_month AS (
  SELECT
    COALESCE(SUM(amount), 0) AS collected_this_month,
    COUNT(*)                 AS payment_count_this_month
  FROM platform_payments
  WHERE status = 'succeeded'
    AND paid_at >= date_trunc('month', CURRENT_DATE)
),
last_month AS (
  SELECT COALESCE(SUM(amount), 0) AS collected_last_month
  FROM platform_payments
  WHERE status = 'succeeded'
    AND paid_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND paid_at <  date_trunc('month', CURRENT_DATE)
),
pending AS (
  SELECT
    COUNT(*)                       AS pending_count,
    COALESCE(SUM(amount), 0)       AS pending_amount,
    COUNT(*) FILTER (WHERE due_at < now()) AS overdue_count,
    COALESCE(SUM(amount) FILTER (WHERE due_at < now()), 0) AS overdue_amount
  FROM platform_invoices
  WHERE status IN ('pending','failed')
),
failed AS (
  SELECT COUNT(*) AS failed_count
  FROM platform_invoices
  WHERE status = 'failed'
)
SELECT
  t.collected_this_month,
  t.payment_count_this_month,
  l.collected_last_month,
  CASE
    WHEN l.collected_last_month > 0
      THEN ((t.collected_this_month - l.collected_last_month) / l.collected_last_month * 100)::numeric(10,1)
    ELSE NULL
  END AS mom_change_pct,
  p.pending_count,
  p.pending_amount,
  p.overdue_count,
  p.overdue_amount,
  f.failed_count
FROM this_month t
CROSS JOIN last_month l
CROSS JOIN pending p
CROSS JOIN failed f;

-- ============================================================
-- 7. v_admin_payments_monthly — son 12 ay grafik
-- ============================================================
CREATE OR REPLACE VIEW v_admin_payments_monthly AS
WITH months AS (
  SELECT date_trunc('month', generate_series(
    date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
    date_trunc('month', CURRENT_DATE),
    INTERVAL '1 month'
  ))::date AS month_start
)
SELECT
  m.month_start,
  TO_CHAR(m.month_start, 'YYYY-MM') AS month_label,
  COALESCE(SUM(p.amount), 0)::numeric AS amount,
  COUNT(p.id)::int AS payment_count
FROM months m
LEFT JOIN platform_payments p
  ON p.status = 'succeeded'
  AND p.paid_at >= m.month_start
  AND p.paid_at <  m.month_start + INTERVAL '1 month'
GROUP BY m.month_start
ORDER BY m.month_start;

-- ============================================================
-- 8. v_admin_plan_subscriber_count — plan başına abone sayısı
-- ============================================================
CREATE OR REPLACE VIEW v_admin_plan_subscriber_count AS
SELECT
  p.id AS plan_id,
  p.slug,
  p.name,
  COUNT(b.id) FILTER (WHERE b.subscription_status = 'active')::int AS active_count,
  COUNT(b.id) FILTER (WHERE b.subscription_status = 'trial')::int  AS trial_count,
  COUNT(b.id) FILTER (WHERE b.subscription_status IN ('active','trial'))::int AS total_count,
  COALESCE(SUM(p.price_monthly) FILTER (WHERE b.subscription_status = 'active'), 0)::numeric AS mrr_contribution
FROM platform_plans p
LEFT JOIN businesses b ON b.plan_id = p.id
GROUP BY p.id, p.slug, p.name, p.price_monthly;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT ON v_admin_invoices_list,
                v_admin_payments_list,
                v_admin_pending_invoices,
                v_admin_billing_metrics,
                v_admin_payments_monthly,
                v_admin_plan_subscriber_count
  TO authenticated;

-- ============================================================
-- ✓ BAŞARI
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✓ platform_payments tablosu kuruldu (RLS aktif, sadece super admin)';
  RAISE NOTICE '✓ platform_invoices auto-paid_at trigger çalışıyor (status=paid olunca)';
  RAISE NOTICE '✓ 6 view oluşturuldu: invoices_list, payments_list, pending_invoices, billing_metrics, payments_monthly, plan_subscriber_count';
  RAISE NOTICE '✓ Migration 0033 başarılı!';
END $$;
