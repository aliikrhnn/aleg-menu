-- ============================================================
-- Migration 0018: Printer Agents (Network Yazıcı Bridge)
-- ============================================================

CREATE TABLE IF NOT EXISTS printer_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- "Kasa Bilgisayarı" gibi
  version TEXT,                              -- "1.0.0"
  last_seen_at TIMESTAMPTZ,
  last_job_at TIMESTAMPTZ,
  jobs_processed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  token TEXT NOT NULL UNIQUE,                -- Agent auth token
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_business
  ON printer_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_agents_token
  ON printer_agents(token);

-- RLS
ALTER TABLE printer_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_business_read" ON printer_agents;
CREATE POLICY "agents_business_read" ON printer_agents
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

DROP POLICY IF EXISTS "agents_business_write" ON printer_agents;
CREATE POLICY "agents_business_write" ON printer_agents
  FOR ALL TO authenticated
  USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

-- Agent bir print_job'ı "claim" edince status 'printing' yapabilsin diye
-- RLS: anon + service_role üzerinden çalışır, agent service_role key kullanır

-- printer_agent_id kolonu print_jobs'a
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES printer_agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_print_jobs_agent ON print_jobs(agent_id);
