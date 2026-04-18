-- ============================================================
-- ALEG - 0001: Temel multi-tenant çekirdek tablolar
-- ============================================================
-- Bu migration aşağıdaki tabloları oluşturur:
--   - businesses (işletmeler)
--   - branches (şubeler)
--   - roles (rol ve izinler)
--   - business_members (kullanıcı-işletme ilişkisi)
--   - super_admins (platform yöneticileri)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SÜPER ADMİN (Platform yöneticileri — Aleg ekibi)
-- ============================================================
CREATE TABLE super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE super_admins IS 'Platform yöneticileri. Bu tabloda olanlar admin.alegstudio.com''a erişebilir.';

-- ============================================================
-- İŞLETMELER
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,

  -- Abonelik ve durum
  plan_id UUID,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Ayarlar (JSON — tema, dil, density, font)
  settings JSONB DEFAULT '{
    "theme": "warm",
    "lang": "tr",
    "density": "comfortable",
    "font": "brutal",
    "accent": "#C4553A"
  }'::jsonb,

  -- Müşteri menüsü içerik ayarları
  app_config JSONB DEFAULT '{}'::jsonb,

  -- Meta
  owner_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_owner ON businesses(owner_user_id);
CREATE INDEX idx_businesses_status ON businesses(subscription_status);

COMMENT ON COLUMN businesses.slug IS 'URL''de kullanılan kısa kod: karakoy, beyoglu-aleg gibi. Subdomain olarak erişilir.';
COMMENT ON COLUMN businesses.trial_ends_at IS 'Deneme süresi bitiş — 30 gün ücretsiz';

-- ============================================================
-- ŞUBELER
-- ============================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  opening_hours JSONB,
  is_main BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, slug)
);

CREATE INDEX idx_branches_business ON branches(business_id);

-- ============================================================
-- ROLLER
-- ============================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- İzinler (her alan için read/write dizisi)
  permissions JSONB DEFAULT '{}'::jsonb,

  is_default BOOLEAN DEFAULT false,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, name)
);

CREATE INDEX idx_roles_business ON roles(business_id);

COMMENT ON COLUMN roles.permissions IS 'Örnek: {"menu": ["read","write"], "pos": ["read"], "reports": []}';

-- ============================================================
-- İŞLETME ÜYELERİ (kullanıcı-işletme ilişkisi)
-- ============================================================
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,

  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,

  status TEXT DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_members_business ON business_members(business_id);
CREATE INDEX idx_members_user ON business_members(user_id);
CREATE INDEX idx_members_role ON business_members(role_id);

-- ============================================================
-- UPDATED_AT TRIGGER — tüm tablolar için otomatik güncelleme
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- YARDIMCI FONKSİYONLAR
-- ============================================================

-- Mevcut kullanıcının hangi işletmelere üye olduğunu döndürür
CREATE OR REPLACE FUNCTION public.user_businesses()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND status = 'active'
$$;

-- Mevcut kullanıcı süper admin mi?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM super_admins WHERE user_id = auth.uid())
$$;

-- Kullanıcının belirli bir işletmedeki rolünün iznini kontrol eder
CREATE OR REPLACE FUNCTION public.has_permission(
  p_business_id UUID,
  p_resource TEXT,
  p_action TEXT DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM business_members bm
    JOIN roles r ON r.id = bm.role_id
    WHERE bm.user_id = auth.uid()
      AND bm.business_id = p_business_id
      AND bm.status = 'active'
      AND (
        r.is_owner = true
        OR r.permissions->p_resource ? p_action
      )
  )
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — ÇOK KRİTİK
-- ============================================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

-- super_admins: sadece süper admin görür
CREATE POLICY "super_admins_self_read" ON super_admins
  FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin());

-- businesses: kullanıcı üye olduğu işletmeyi görür, süper admin hepsini
CREATE POLICY "businesses_member_read" ON businesses
  FOR SELECT USING (
    id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

CREATE POLICY "businesses_owner_update" ON businesses
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "businesses_admin_insert" ON businesses
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "businesses_admin_delete" ON businesses
  FOR DELETE USING (public.is_super_admin());

-- branches: sadece işletme üyeleri
CREATE POLICY "branches_member_all" ON branches
  FOR ALL USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

-- roles: sadece işletme üyeleri
CREATE POLICY "roles_member_read" ON roles
  FOR SELECT USING (
    business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

CREATE POLICY "roles_admin_write" ON roles
  FOR INSERT WITH CHECK (
    public.has_permission(business_id, 'team', 'write')
    OR public.is_super_admin()
  );

CREATE POLICY "roles_admin_update" ON roles
  FOR UPDATE USING (
    public.has_permission(business_id, 'team', 'write')
    OR public.is_super_admin()
  );

CREATE POLICY "roles_admin_delete" ON roles
  FOR DELETE USING (
    public.has_permission(business_id, 'team', 'write')
    OR public.is_super_admin()
  );

-- business_members: kendini görür + işletme yöneticileri tümünü
CREATE POLICY "members_self_read" ON business_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR business_id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );

CREATE POLICY "members_admin_write" ON business_members
  FOR INSERT WITH CHECK (
    public.has_permission(business_id, 'team', 'write')
    OR public.is_super_admin()
  );

CREATE POLICY "members_admin_update" ON business_members
  FOR UPDATE USING (
    public.has_permission(business_id, 'team', 'write')
    OR user_id = auth.uid()
    OR public.is_super_admin()
  );

CREATE POLICY "members_admin_delete" ON business_members
  FOR DELETE USING (
    public.has_permission(business_id, 'team', 'write')
    OR public.is_super_admin()
  );
