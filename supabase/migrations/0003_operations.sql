-- ============================================================
-- ALEG - 0003: Operasyon (masalar, adisyonlar, siparişler)
-- ============================================================
--   - table_zones (salon, bahçe, teras)
--   - tables (masalar)
--   - tickets (açık hesaplar / adisyonlar)
--   - ticket_items (adisyon kalemleri)
--   - orders (QR'dan gelen online siparişler)
--   - order_items
--   - stations (bar, mutfak KDS)
--   - qr_codes (masa ve genel QR'lar)
-- ============================================================

-- ============================================================
-- MASA BÖLGELERİ (Salon, Bahçe, Teras)
-- ============================================================
CREATE TABLE table_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT, -- görsel ayrım için
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_business ON table_zones(business_id);

-- ============================================================
-- MASALAR
-- ============================================================
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES table_zones(id) ON DELETE SET NULL,

  name TEXT NOT NULL, -- "14", "Salon 3", "Teras B2"
  capacity INTEGER DEFAULT 2,

  -- Masa haritasında konum (opsiyonel)
  position_x INTEGER,
  position_y INTEGER,
  shape TEXT DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rect')),

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'inactive')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tables_business ON tables(business_id);
CREATE INDEX idx_tables_zone ON tables(zone_id);

CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADİSYONLAR (açık hesaplar)
-- ============================================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

  -- Müşteri bilgileri
  guests INTEGER DEFAULT 1,
  customer_name TEXT,
  customer_id UUID, -- loyalty_members tablosundan (ileride)

  -- Personel
  waiter_id UUID REFERENCES business_members(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES business_members(id) ON DELETE SET NULL,

  -- Zaman
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  -- Finansal
  subtotal NUMERIC(10, 2) DEFAULT 0,
  discount_pct NUMERIC(5, 2) DEFAULT 0,
  discount_flat NUMERIC(10, 2) DEFAULT 0,
  service_pct NUMERIC(5, 2) DEFAULT 0,
  tip NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,

  -- Ödeme
  payment_status TEXT DEFAULT 'open' CHECK (payment_status IN ('open', 'paid', 'partial', 'void')),
  payment_method TEXT, -- "cash", "card", "online", "split"
  payment_details JSONB, -- split ödeme için detaylar

  -- Durum ve notlar
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_business ON tickets(business_id);
CREATE INDEX idx_tickets_table ON tickets(table_id);
CREATE INDEX idx_tickets_status ON tickets(business_id, status);
CREATE INDEX idx_tickets_opened_at ON tickets(business_id, opened_at DESC);

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ADİSYON KALEMLERİ
-- ============================================================
CREATE TABLE ticket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Snapshot (ürün silinse bile adisyon korunsun)
  product_name TEXT NOT NULL,
  product_snapshot JSONB, -- tam ürün bilgisi

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  options JSONB DEFAULT '[]'::jsonb, -- seçilen ek seçenekler
  note TEXT,

  -- Durum ve yönlendirme
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'preparing', 'ready', 'delivered', 'cancelled')),
  station TEXT, -- "bar", "kitchen"

  -- Personel
  added_by UUID REFERENCES business_members(id) ON DELETE SET NULL,

  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_ticket_items_ticket ON ticket_items(ticket_id);
CREATE INDEX idx_ticket_items_status ON ticket_items(status);
CREATE INDEX idx_ticket_items_station ON ticket_items(station, status);

-- ============================================================
-- İSTASYONLAR (Bar, Mutfak, Pastane — KDS ekranları)
-- ============================================================
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  kind TEXT DEFAULT 'kitchen' CHECK (kind IN ('bar', 'kitchen', 'pastry', 'other')),

  -- Bu istasyona hangi kategoriler düşer
  category_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Renk, ikon
  color TEXT,
  icon TEXT,

  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stations_business ON stations(business_id);

-- ============================================================
-- ONLINE SİPARİŞLER (QR'dan, paket servis)
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  -- Sipariş tipi
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'pickup', 'delivery')),

  -- Masa siparişi ise adisyona bağlı
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

  -- Müşteri (opsiyonel — QR anonim olabilir)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  delivery_address JSONB, -- delivery için

  -- Durum akışı
  status TEXT DEFAULT 'received' CHECK (status IN (
    'received', 'confirmed', 'preparing', 'ready', 'on_way', 'delivered', 'cancelled'
  )),

  -- Finansal
  subtotal NUMERIC(10, 2) DEFAULT 0,
  service_fee NUMERIC(10, 2) DEFAULT 0,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,

  -- Ödeme
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,

  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_status ON orders(business_id, status);
CREATE INDEX idx_orders_created ON orders(business_id, created_at DESC);
CREATE INDEX idx_orders_table ON orders(table_id);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SİPARİŞ KALEMLERİ
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  product_name TEXT NOT NULL,
  product_snapshot JSONB,

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  note TEXT,

  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'preparing', 'ready', 'delivered', 'cancelled'))
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================
-- QR KODLAR
-- ============================================================
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,

  slug TEXT NOT NULL, -- URL'de görünen kısa kod
  purpose TEXT DEFAULT 'table' CHECK (purpose IN ('table', 'general', 'delivery')),

  -- Tasarım
  design_template TEXT DEFAULT 'default',
  design_config JSONB DEFAULT '{}'::jsonb,

  -- İstatistik
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, slug)
);

CREATE INDEX idx_qr_business ON qr_codes(business_id);
CREATE INDEX idx_qr_table ON qr_codes(table_id);

-- ============================================================
-- GARSON ÇAĞRILARI
-- ============================================================
CREATE TABLE waiter_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

  call_type TEXT DEFAULT 'waiter' CHECK (call_type IN ('waiter', 'bill', 'water', 'other')),
  note TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  resolved_by UUID REFERENCES business_members(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_calls_business_status ON waiter_calls(business_id, status);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE table_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls ENABLE ROW LEVEL SECURITY;

-- Sadece işletme üyeleri
CREATE POLICY "zones_member" ON table_zones
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "tables_member" ON tables
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "tickets_member" ON tickets
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "ticket_items_inherit" ON ticket_items
  FOR ALL USING (
    ticket_id IN (SELECT id FROM tickets WHERE business_id IN (SELECT public.user_businesses()))
    OR public.is_super_admin()
  );

CREATE POLICY "stations_member" ON stations
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "orders_member" ON orders
  FOR SELECT USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

-- Online sipariş: anonim müşteri ekleyebilir
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE subscription_status IN ('trial', 'active'))
  );

CREATE POLICY "orders_member_update" ON orders
  FOR UPDATE USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "order_items_read" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE business_id IN (SELECT public.user_businesses()))
    OR public.is_super_admin()
  );

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders)
  );

CREATE POLICY "qr_member" ON qr_codes
  FOR ALL USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "qr_public_read" ON qr_codes
  FOR SELECT USING (active = true);

CREATE POLICY "calls_member" ON waiter_calls
  FOR SELECT USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());

CREATE POLICY "calls_public_insert" ON waiter_calls
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE subscription_status IN ('trial', 'active'))
  );

CREATE POLICY "calls_member_update" ON waiter_calls
  FOR UPDATE USING (business_id IN (SELECT public.user_businesses()) OR public.is_super_admin());
