-- ============================================================
-- ALEG - 0004: Modüller (loyalty, delivery, stok, vardiya, değerlendirme)
-- ============================================================

-- ============================================================
-- MODÜL AKTİVASYONU
-- ============================================================
CREATE TABLE business_modules (
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL, -- "loyalty", "delivery", "stock", "shifts", "reviews"
  is_on BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  PRIMARY KEY (business_id, module_id)
);

ALTER TABLE business_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_member" ON business_modules
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

-- ============================================================
-- SADAKAT (LOYALTY)
-- ============================================================

CREATE TABLE loyalty_config (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,

  points_per_tl NUMERIC(6, 3) DEFAULT 1, -- 1 TL = 1 puan
  redemption_rate NUMERIC(6, 3) DEFAULT 0.05, -- 1 puan = 0.05 TL değerinde
  welcome_bonus INTEGER DEFAULT 50,
  birthday_bonus INTEGER DEFAULT 100,

  tiers JSONB DEFAULT '[
    {"id": "bronze", "name": "Bronze", "min_spent": 0, "multiplier": 1},
    {"id": "silver", "name": "Silver", "min_spent": 2000, "multiplier": 1.25},
    {"id": "gold", "name": "Gold", "min_spent": 10000, "multiplier": 1.5}
  ]'::jsonb,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE loyalty_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  birthday DATE,

  points INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  tier TEXT DEFAULT 'bronze',

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ,

  UNIQUE(business_id, phone)
);

CREATE INDEX idx_loyalty_members_business ON loyalty_members(business_id);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES loyalty_members(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  points_delta INTEGER NOT NULL, -- + kazanma, - harcama
  reason TEXT, -- "purchase", "redemption", "birthday", "welcome", "manual"
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_tx_member ON loyalty_transactions(member_id);

CREATE TABLE loyalty_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name JSONB NOT NULL,
  description JSONB,
  campaign_type TEXT DEFAULT 'discount' CHECK (campaign_type IN (
    'discount', 'free_item', 'double_points', 'bundle'
  )),

  conditions JSONB DEFAULT '{}'::jsonb,
  target_segment TEXT, -- "all", "bronze", "silver", "gold", "birthday"

  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DELIVERY (Paket Servis)
-- ============================================================

CREATE TABLE delivery_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  phone TEXT NOT NULL,
  name TEXT,
  addresses JSONB DEFAULT '[]'::jsonb,

  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, phone)
);

CREATE INDEX idx_delivery_customers_business ON delivery_customers(business_id);

CREATE TABLE couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  phone TEXT,
  vehicle TEXT, -- "bike", "scooter", "car"
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  phone TEXT NOT NULL,
  customer_id UUID REFERENCES delivery_customers(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  outcome TEXT, -- "answered", "missed", "new_customer", "order_placed"

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_business ON call_log(business_id, created_at DESC);

-- ============================================================
-- STOK
-- ============================================================

CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- "kg", "g", "L", "ml", "adet", "paket"
  current_qty NUMERIC(10, 3) DEFAULT 0,
  min_qty NUMERIC(10, 3) DEFAULT 0,

  supplier TEXT,
  cost_per_unit NUMERIC(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_stock_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'waste')),
  quantity NUMERIC(10, 3) NOT NULL,
  reason TEXT,

  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES business_members(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_item ON stock_movements(stock_item_id);

-- ============================================================
-- VARDİYA
-- ============================================================

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES business_members(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  role TEXT, -- "garson", "barista", "şef", "kurye"
  phone TEXT,
  photo_url TEXT,

  hourly_rate NUMERIC(10, 2),
  hire_date DATE,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  shift_date DATE NOT NULL,
  template TEXT, -- "morning", "mid", "evening", "custom"
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  actual_clock_in TIMESTAMPTZ,
  actual_clock_out TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shifts_business_date ON shifts(business_id, shift_date);
CREATE INDEX idx_shifts_staff ON shifts(staff_id);

-- ============================================================
-- DEĞERLENDİRMELER
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  customer_name TEXT,
  customer_phone TEXT,

  is_responded BOOLEAN DEFAULT false,
  response TEXT,
  responded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_business ON reviews(business_id, created_at DESC);

-- ============================================================
-- PLATFORM ABONELİK PLANLARI (Süper admin yönetir)
-- ============================================================

CREATE TABLE platform_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2),
  price_yearly NUMERIC(10, 2),

  features JSONB DEFAULT '{}'::jsonb,
  max_branches INTEGER,
  max_products INTEGER,
  max_team_members INTEGER,

  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- businesses.plan_id buraya referans verir
ALTER TABLE businesses ADD CONSTRAINT businesses_plan_fk
  FOREIGN KEY (plan_id) REFERENCES platform_plans(id) ON DELETE SET NULL;

CREATE TABLE platform_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES platform_plans(id) ON DELETE SET NULL,

  invoice_number TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'TRY',

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT,

  period_start DATE,
  period_end DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_business ON platform_invoices(business_id);
CREATE INDEX idx_invoices_status ON platform_invoices(status);

-- ============================================================
-- AUDIT LOG (kim ne yaptı — süper admin görür)
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,

  action TEXT NOT NULL, -- "business.created", "member.invited", "plan.changed"
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,

  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_business ON audit_log(business_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Standart işletme-sahipli tablolar için tekrarlanan politika
CREATE POLICY "loyalty_config_member" ON loyalty_config
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "loyalty_members_member" ON loyalty_members
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "loyalty_tx_member" ON loyalty_transactions
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "loyalty_campaigns_member" ON loyalty_campaigns
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "delivery_customers_member" ON delivery_customers
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "couriers_member" ON couriers
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "call_log_member" ON call_log
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "stock_items_member" ON stock_items
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "stock_movements_member" ON stock_movements
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "staff_member" ON staff
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "shifts_member" ON shifts
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "reviews_member" ON reviews
  FOR SELECT USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE subscription_status IN ('trial', 'active'))
  );

-- Planları herkes okuyabilir (fiyat sayfası için)
CREATE POLICY "plans_public_read" ON platform_plans
  FOR SELECT USING (active = true OR public.is_super_admin());

CREATE POLICY "plans_admin_write" ON platform_plans
  FOR ALL USING (public.is_super_admin());

-- Faturaları sadece ilgili işletme ve süper admin
CREATE POLICY "invoices_member" ON platform_invoices
  FOR SELECT USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "invoices_admin_write" ON platform_invoices
  FOR ALL USING (public.is_super_admin());

-- Audit log sadece süper admin
CREATE POLICY "audit_admin_only" ON audit_log
  FOR ALL USING (public.is_super_admin());
