-- ============================================
-- PAKET 4: Support Tickets + Notifications + Settings
-- (Aynısı Supabase MCP üzerinden uygulandı, repo için saklı kopya)
-- ============================================

-- 1) SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text UNIQUE NOT NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
  business_name_snapshot text,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email text NOT NULL,
  reporter_name text,
  subject text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'feature_request', 'bug', 'account')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  last_reply_at timestamptz DEFAULT now(),
  tags text[] DEFAULT ARRAY[]::text[],
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_business ON support_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- 2) SUPPORT TICKET MESSAGES
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email text,
  author_name text,
  author_type text DEFAULT 'user' CHECK (author_type IN ('user', 'admin', 'system')),
  body text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at);

-- 3) PLATFORM ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'info' CHECK (category IN ('info', 'maintenance', 'feature', 'warning', 'critical')),
  target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'plan', 'business', 'city')),
  target_value text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled')),
  publish_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  recipient_count int DEFAULT 0,
  read_count int DEFAULT 0,
  cta_label text,
  cta_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_status ON platform_announcements(status);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_publish ON platform_announcements(publish_at DESC);

-- 4) PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- 5) RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_all_support_tickets" ON support_tickets;
CREATE POLICY "super_admins_all_support_tickets" ON support_tickets
  FOR ALL USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "super_admins_all_ticket_messages" ON support_ticket_messages;
CREATE POLICY "super_admins_all_ticket_messages" ON support_ticket_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "super_admins_all_announcements" ON platform_announcements;
CREATE POLICY "super_admins_all_announcements" ON platform_announcements
  FOR ALL USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "super_admins_all_settings" ON platform_settings;
CREATE POLICY "super_admins_all_settings" ON platform_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid()));

-- 6) Triggers
CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN NEW.updated_at = now(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_support_ticket ON support_tickets;
CREATE TRIGGER trg_touch_support_ticket BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION touch_support_ticket();

CREATE OR REPLACE FUNCTION public.touch_ticket_on_message()
RETURNS trigger LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE support_tickets
  SET last_reply_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ticket_on_message ON support_ticket_messages;
CREATE TRIGGER trg_touch_ticket_on_message AFTER INSERT ON support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION touch_ticket_on_message();

-- 7) Ticket no generator
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_support_ticket_no()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  yr text := to_char(now(), 'YYYY');
  num int := nextval('support_ticket_seq');
BEGIN
  RETURN 'TKT-' || yr || '-' || lpad(num::text, 4, '0');
END;
$$;

-- 8) Default platform ayarları
INSERT INTO platform_settings (key, value, description, category) VALUES
  ('platform.default_trial_days', '30', 'Yeni işletmelerin trial süresi (gün)', 'subscription'),
  ('platform.default_plan_slug', '"basic"', 'Yeni kayıtlarda atanan varsayılan plan', 'subscription'),
  ('platform.default_currency', '"TRY"', 'Platform varsayılan para birimi', 'general'),
  ('platform.default_lang', '"tr"', 'Platform varsayılan dili', 'general'),
  ('platform.support_email', '"destek@alegstudio.com"', 'Destek e-posta adresi', 'general'),
  ('platform.maintenance_mode', 'false', 'Bakım modu aktif mi', 'system'),
  ('platform.signups_enabled', 'true', 'Yeni kayıtlara izin var mı', 'system'),
  ('feature.ai_assistant', 'true', 'AI asistan özelliği', 'features'),
  ('feature.delivery_module', 'true', 'Delivery modülü', 'features'),
  ('feature.loyalty_module', 'true', 'Loyalty modülü', 'features')
ON CONFLICT (key) DO NOTHING;

-- 9) Views
CREATE OR REPLACE VIEW v_admin_support_tickets_list AS
SELECT 
  t.id, t.ticket_no, t.subject, t.category, t.priority, t.status,
  t.business_id, COALESCE(t.business_name_snapshot, b.name) AS business_name, b.slug AS business_slug,
  t.reporter_email, t.reporter_name,
  t.assignee_id, au.email AS assignee_email, sa.full_name AS assignee_name,
  t.created_at, t.updated_at, t.last_reply_at, t.resolved_at,
  (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = t.id) AS message_count,
  EXTRACT(EPOCH FROM (now() - t.created_at)) / 3600 AS age_hours
FROM support_tickets t
LEFT JOIN businesses b ON b.id = t.business_id
LEFT JOIN auth.users au ON au.id = t.assignee_id
LEFT JOIN super_admins sa ON sa.user_id = t.assignee_id;

CREATE OR REPLACE VIEW v_admin_support_metrics AS
SELECT
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') AS open_count,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress') AS in_progress_count,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'waiting_user') AS waiting_count,
  (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','in_progress','waiting_user') AND priority = 'urgent') AS urgent_count,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved' AND resolved_at >= now() - INTERVAL '7 days') AS resolved_7d,
  (SELECT COUNT(*) FROM support_tickets WHERE created_at >= now() - INTERVAL '7 days') AS created_7d,
  (SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::int FROM support_tickets WHERE status = 'resolved' AND resolved_at >= now() - INTERVAL '30 days') AS avg_resolution_hours;

CREATE OR REPLACE VIEW v_admin_announcements_list AS
SELECT a.*,
  CASE
    WHEN a.target_type = 'all' THEN 'Tüm işletmeler'
    WHEN a.target_type = 'plan' THEN 'Plan: ' || COALESCE(a.target_value, '?')
    WHEN a.target_type = 'business' THEN 'İşletme: ' || COALESCE((SELECT name FROM businesses WHERE id::text = a.target_value), '?')
    WHEN a.target_type = 'city' THEN 'Şehir: ' || COALESCE(a.target_value, '?')
  END AS target_label
FROM platform_announcements a;

CREATE OR REPLACE VIEW v_admin_audit_logs_full AS
SELECT al.id, al.ts, al.actor_id, al.actor_email, al.actor_name, al.is_system,
  al.action, al.target_type, al.target_id, al.target_label,
  al.business_id, COALESCE(b.name, al.target_label) AS business_name, b.slug AS business_slug,
  al.meta, al.ip_address, al.user_agent, al.tone
FROM platform_audit_logs al
LEFT JOIN businesses b ON b.id = al.business_id;

CREATE OR REPLACE VIEW v_admin_super_admins_list AS
SELECT sa.user_id, sa.full_name, u.email, u.created_at AS user_created_at, u.last_sign_in_at,
  sa.created_at AS admin_since,
  (SELECT COUNT(*) FROM platform_audit_logs WHERE actor_id = sa.user_id AND ts >= now() - INTERVAL '30 days') AS actions_30d,
  (SELECT COUNT(*) FROM support_tickets WHERE assignee_id = sa.user_id AND status IN ('open','in_progress','waiting_user')) AS open_tickets
FROM super_admins sa
LEFT JOIN auth.users u ON u.id = sa.user_id;

CREATE OR REPLACE VIEW v_admin_system_health AS
SELECT
  (SELECT COUNT(*) FROM businesses) AS total_businesses,
  (SELECT COUNT(*) FROM businesses WHERE subscription_status = 'active') AS active_businesses,
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= now() - INTERVAL '24 hours') AS active_users_24h,
  (SELECT COUNT(*) FROM orders WHERE created_at >= now() - INTERVAL '24 hours') AS orders_24h,
  (SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= now() - INTERVAL '24 hours') AS revenue_24h,
  (SELECT COUNT(*) FROM print_jobs WHERE created_at >= now() - INTERVAL '24 hours') AS print_jobs_24h,
  (SELECT COUNT(*) FROM print_jobs WHERE status = 'failed' AND created_at >= now() - INTERVAL '24 hours') AS failed_jobs_24h,
  (SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','in_progress','waiting_user')) AS open_tickets,
  (SELECT pg_database_size(current_database())) AS db_size_bytes;
