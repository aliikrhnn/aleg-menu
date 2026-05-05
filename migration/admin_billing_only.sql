-- ZATEN UYGULANDI Supabase'de (4 Mayıs 2026)
-- Bu sadece referans/dokümantasyon

-- 1) v_admin_business_list: orders_30d kolonu kaldırıldı
DROP VIEW IF EXISTS v_admin_business_list CASCADE;
CREATE VIEW v_admin_business_list AS
SELECT b.id, b.slug, b.name, b.city, b.email, b.phone,
    b.subscription_status, b.trial_ends_at, b.created_at, b.last_login_at,
    b.approved_at, b.suspended_at, b.suspended_reason, b.owner_user_id,
    b.plan_id, p.name AS plan_name, p.slug AS plan_slug,
    COALESCE(p.price_monthly, 0::numeric) AS plan_price,
    upper("left"(regexp_replace(b.name, '[^a-zA-ZığüşöçĞÜŞÖÇ]'::text, ''::text, 'g'), 2)) AS logo,
    COALESCE(u.email, b.email::varchar) AS owner_email,
    COALESCE((u.raw_user_meta_data ->> 'full_name'), '') AS owner_name
FROM ((businesses b
    LEFT JOIN platform_plans p ON p.id = b.plan_id)
    LEFT JOIN auth.users u ON u.id = b.owner_user_id);

-- 2) Operasyonel revenue view DROP edildi
DROP VIEW IF EXISTS v_admin_business_revenue_30d CASCADE;

-- 3) v_admin_pending_invoices yeniden yaratıldı (cascade'den dolayı)
CREATE OR REPLACE VIEW v_admin_pending_invoices AS
SELECT id, invoice_no, business_id, business_name, business_slug, business_logo,
       amount, currency, status, payment_method, period_start, period_end,
       due_at, paid_at, retry_count, notes, created_at, days_overdue, due_soon
FROM v_admin_invoices_list
WHERE status = ANY(ARRAY['pending','failed'])
ORDER BY due_at;

-- 4) v_admin_system_health: orders_24h ve revenue_24h kaldırıldı
DROP VIEW IF EXISTS v_admin_system_health CASCADE;
CREATE VIEW v_admin_system_health AS
SELECT 
    (SELECT count(*) FROM businesses) AS total_businesses,
    (SELECT count(*) FROM businesses WHERE subscription_status = 'active') AS active_businesses,
    (SELECT count(*) FROM auth.users) AS total_users,
    (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - '24:00:00'::interval) AS active_users_24h,
    (SELECT count(*) FROM print_jobs WHERE created_at >= now() - '24:00:00'::interval) AS print_jobs_24h,
    (SELECT count(*) FROM print_jobs WHERE status = 'failed' AND created_at >= now() - '24:00:00'::interval) AS failed_jobs_24h,
    (SELECT count(*) FROM support_tickets WHERE status = ANY(ARRAY['open','in_progress','waiting_user'])) AS open_tickets,
    (SELECT pg_database_size(current_database())) AS db_size_bytes;
