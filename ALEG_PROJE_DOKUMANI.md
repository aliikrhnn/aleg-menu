# ALEG — Kafe Yönetim Platformu
## Proje Teknik Dökümanı ve Yol Haritası

> **Marka:** Aleg
> **Slogan:** Kafe işletim sistemi
> **Tip:** Multi-tenant SaaS
> **Font sistemi:** Brutalist Spice (Bricolage Grotesque + Instrument Serif + Space Mono)
> **Doküman tarihi:** 18 Nisan 2026

---

## 1. Ürün Vizyonu

Aleg, kafe ve restoran işletmecileri için **uçtan uca yönetim platformu**. Tek bir yazılımla:

- Müşteri QR menüsü ve dijital sipariş
- İşletme paneli (POS, adisyon, masa yönetimi, menü yönetimi)
- Mutfak/bar istasyon ekranları (KDS)
- Sadakat programı (loyalty)
- Paket servis/delivery modülü
- Stok ve vardiya yönetimi
- Çoklu şube ve ekip yönetimi

**Hedef pazar:** Önce Türkiye (bağımsız kafeler ve küçük zincirler), sonra global.

**Rekabet farkı:** Tasarım kalitesi + offline-first işletme paneli + modüler yapı (kafeler ihtiyaç duyduklarını açar).

---

## 2. Sistem Mimarisi

### 2.1 Üç Uygulama Alanı, Tek Kod Tabanı

Tek Next.js projesi altında üç ayrı "yüz":

```
aleg.com                     → Pazarlama sitesi (landing, fiyatlar, iletişim)
admin.aleg.com               → Süper admin paneli (sen girersin)
panel.aleg.com               → İşletme paneli (kafe sahipleri)
[kafe-slug].aleg.com         → Müşteri menüsü (QR yönlendirir)
                               örn: karakoy-aleg.aleg.com
```

İleride premium kafeler kendi domain'ini bağlayabilir (custom domain özelliği):
`menu.buyukkafe.com` → aslında bizim sistemde çalışır.

### 2.2 Teknoloji Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| Frontend | Next.js 14 (App Router) | SSR/SSG, hızlı menü sayfaları, tek kod |
| Dil | TypeScript | Büyük projede hata azaltır, otomatik tamamlama |
| UI | React + Tailwind CSS | Tasarım dosyası zaten React + inline CSS |
| Veritabanı | Supabase (PostgreSQL) | İlişkisel veri + RLS güvenlik + realtime |
| Auth | Supabase Auth | E-mail/şifre, multi-tenant ile uyumlu |
| Depolama | Supabase Storage | Ürün fotoğrafları, logolar |
| Realtime | Supabase Realtime | Sipariş geldiğinde mutfak ekranı anında günceller |
| Offline | IndexedDB (Dexie.js) + Service Worker | İşletme paneli internet olmadan da çalışır |
| PWA | next-pwa | Uygulama gibi kurulum, offline |
| QR üretim | qrcode-generator (zaten tasarımda var) | — |
| Deploy | Vercel | Next.js için native, wildcard subdomain destekli |
| DNS | Mevcut domain sağlayıcın | Wildcard A kaydı |

**Neden Next.js + Supabase?**
Alternatif olarak Laravel/PHP veya Firebase düşünülebilirdi. Ama:
- Senin tasarımın zaten React — Laravel'e çevirmek baştan yazmak demek
- Firebase NoSQL — menü/ürün/sipariş gibi ilişkisel veriyle çalışmak zor
- Supabase açık kaynak, PostgreSQL — ileride self-host edilebilir, vendor lock-in yok
- Next.js'in statik sayfa üretimi müşteri menüsünü CDN'den yarım saniyede açar

### 2.3 Multi-Tenant Güvenlik — Row Level Security (RLS)

Tüm işletme verileri aynı tablolarda durur ama her satırda `business_id` var. PostgreSQL'in RLS özelliği sayesinde:

- Kafe A'nın kullanıcısı giriş yaptığında **sadece** `business_id = A` olan satırları görebilir
- Bu uygulama katmanında değil, **veritabanı katmanında** zorlanır — yani frontend'de bir hata olsa bile veri sızmaz
- Süper admin (sen) özel bir role sahipsin, tüm verileri görebiliyorsun

---

## 3. Veritabanı Şeması

Tasarımdaki seed verilerinden çıkardığım ana tablolar:

### 3.1 Temel Tablolar (Multi-Tenant Çekirdek)

```
businesses (işletmeler)
├── id, name, slug, logo_url
├── plan_id (abonelik planı)
├── subscription_status, subscription_ends_at
├── settings (jsonb — tema, dil, density, font)
├── app_config (jsonb — müşteri menüsü başlıkları)
└── created_at, owner_user_id

users (Supabase auth.users'a bağlı)
├── id, email, full_name, phone
└── avatar_url

business_members (kullanıcı-işletme ilişkisi)
├── business_id → businesses
├── user_id → users
├── role_id → roles
├── branch_id → branches (opsiyonel)
└── status (active/invited/suspended)

branches (şubeler)
├── id, business_id, name, slug
├── address, phone, opening_hours
└── is_main, active

roles (ekip rolleri — her işletmenin kendi rolleri)
├── id, business_id, name
├── permissions (jsonb — hangi ekrana erişebilir)
└── is_default
```

### 3.2 Menü ve Ürünler

```
categories
├── id, business_id, name (jsonb tr/en), hero_icon
├── sort_order, active, badge
└── count (trigger ile otomatik güncellenir)

products
├── id, business_id, category_id
├── name (jsonb), description (jsonb)
├── price, status (active/soldout/draft)
├── hero_image_url
├── print_station (bar/kitchen/...)
├── badge (new/hot/...)
└── sort_order

product_variants (boy, seçenek)
├── id, product_id
├── name (jsonb), price_delta
└── is_default
```

### 3.3 Masa ve POS

```
tables (masalar)
├── id, business_id, branch_id, zone_id
├── name/number, capacity
├── position_x, position_y (masa haritasında konum)
└── status (available/occupied/reserved)

table_zones (salon, bahçe, teras vb.)
├── id, business_id, branch_id, name
└── sort_order

tickets (adisyonlar — açık hesaplar)
├── id, business_id, table_id (opsiyonel)
├── guests, waiter_id
├── opened_at, closed_at
├── discount_pct, discount_flat, tip_pct
├── note, status (open/closed/cancelled)
└── customer_id (loyalty üyesi ise)

ticket_items (adisyon kalemleri)
├── id, ticket_id, product_id
├── variant_id, quantity, unit_price
├── note, status (ordered/preparing/ready/delivered)
└── station (bar/kitchen)
```

### 3.4 Siparişler (Online ve Masa)

```
orders (müşteri QR'dan veya garson açtı)
├── id, business_id, branch_id
├── ticket_id (masa siparişi ise)
├── order_type (dine_in/pickup/delivery)
├── status (received/preparing/ready/delivered/cancelled)
├── total, service_fee, discount
├── payment_status, payment_method
├── customer_info (jsonb — delivery için)
└── created_at

order_items
├── id, order_id, product_id, variant_id
├── quantity, unit_price, note
└── status

stations (bar, mutfak, pastane vb. — KDS ekranları)
├── id, business_id, name, kind
├── categories (hangi kategoriler buraya düşer)
└── staff_ids
```

### 3.5 Sadakat (Loyalty)

```
loyalty_members
├── id, business_id
├── phone, name, email
├── points, total_spent
├── birthday, joined_at
└── tier (bronze/silver/gold)

loyalty_config
├── business_id (unique — her işletmenin tek config'i)
├── points_per_tl, redemption_rate
├── welcome_bonus, birthday_bonus
└── tiers (jsonb)

loyalty_campaigns
├── id, business_id, name
├── type (discount/free_item/double_points)
├── conditions (jsonb)
├── starts_at, ends_at, active
└── target_segment

loyalty_transactions
├── id, member_id, ticket_id (opsiyonel)
├── points_delta, reason
└── created_at
```

### 3.6 Paket Servis (Delivery)

```
delivery_customers
├── id, business_id
├── phone, name
├── addresses (jsonb array)
└── last_order_at

couriers
├── id, business_id
├── name, phone, vehicle
└── status (available/busy/offline)

delivery_orders
├── id, business_id
├── customer_id, courier_id
├── address, notes
├── stage (new/confirmed/preparing/on_way/delivered/cancelled)
└── total, payment_method

call_log (çağrı kayıtları)
├── id, business_id, phone
├── customer_id, duration
└── created_at
```

### 3.7 Operasyon Modülleri

```
staff (personel)
├── id, business_id, user_id (opsiyonel — her personel giriş yapmayabilir)
├── name, role, phone, photo_url
├── hourly_rate, hire_date
└── active

shifts (vardiyalar)
├── id, business_id, staff_id, branch_id
├── date, shift_template (morning/mid/evening/custom)
├── starts_at, ends_at, actual_clock_in, actual_clock_out
└── notes

stock_items
├── id, business_id
├── name, unit (kg/g/L/ml/adet/paket)
├── current_qty, min_qty, supplier
└── cost_per_unit

stock_movements
├── id, stock_item_id
├── type (in/out/adjustment)
├── quantity, reason, ticket_id (opsiyonel)
└── created_at

reviews (değerlendirmeler)
├── id, business_id, branch_id, ticket_id
├── rating, comment, customer_name
└── created_at, is_responded

modules (hangi modüller açık)
├── business_id, module_id
└── is_on, settings (jsonb)
```

### 3.8 QR Kodlar

```
qr_codes
├── id, business_id, branch_id, table_id
├── slug (URL'de görünen kısa kod)
├── design_template, design_config (jsonb)
└── scan_count (istatistik için)

qr_scans (analitik)
├── id, qr_code_id
├── scanned_at, ip_hash, user_agent
└── session_id
```

### 3.9 Süper Admin

```
platform_plans (abonelik planları)
├── id, name, price_monthly, price_yearly
├── features (jsonb — hangi modüller dahil)
├── max_branches, max_products, max_team_members
└── active

platform_invoices
├── id, business_id, plan_id
├── amount, status (pending/paid/failed)
├── paid_at, period_start, period_end
└── stripe_invoice_id (ileride)

platform_audit_log
├── id, user_id, business_id
├── action, details (jsonb)
└── created_at
```

---

## 4. Ekran Haritası (Tasarımdan Çıkardığım)

### 4.1 Süper Admin Paneli (`admin.aleg.com`) — Tasarım BEKLENIYOR

Beklenen ekranlar (sen tasarlayacaksın):
- Login ekranı
- Dashboard (toplam işletme, aktif kullanıcı, ciro, yeni kayıtlar)
- İşletme listesi + detay
- Yeni işletme oluşturma (mail/şifre atama)
- Abonelik planları yönetimi
- Fatura ve ödeme takibi
- Destek talepleri
- Platform istatistikleri ve raporlar

### 4.2 İşletme Paneli (`panel.aleg.com`) — Tasarım HAZIR

Mevcut tasarımdaki ekranlar:

**Genel**
- Gösterge Paneli (dashboard)

**Operasyon**
- Masalar (zone'lu masa haritası)
- Kasa (POS — adisyon, ödeme, indirim, bahşiş)
- Siparişler (QR'dan gelen)
- Garson Çağrıları
- Değerlendirmeler
- Stok Takibi
- Vardiya Planı
- Z Raporu (gün sonu)

**Menü**
- Kategoriler
- Ürünler (+ ürün ekleme modalı)
- Görünüm (4 tema, density)

**Sadakat**
- Loyalty Ana Ekran (üyeler)
- Loyalty Kampanyalar
- Loyalty Ayarları

**Paket Servis**
- Delivery Ana Ekran
- Çağrı gelince otomatik popup (caller ID)
- Kurye yönetimi
- Müşteri veritabanı
- Delivery ayarları

**İstasyonlar (KDS)**
- Bar ekranı (odak modu ile tam ekran)
- Mutfak ekranı
- Dinamik istasyon ekranları (her işletme kendi istasyonunu oluşturabilir)

**Ayarlar**
- Marka (logo, müşteri menüsü metinleri, mobil uygulama görünümü)
- QR Kod (tasarım, üretim, yazdırma)
- Fiş Tasarımı
- Kampanyalar (banner, popup)
- Modüller (hangilerini aç/kapa)

**Yönetim**
- Şubeler
- Ekip & Roller
- İstasyon yönetimi
- Ayarlar

### 4.3 Müşteri Menüsü (`[kafe-slug].aleg.com`) — Tasarım HAZIR

- Hoşgeldin ekranı (loyalty üyelik teklifi)
- Menü ana sayfa (hero, öne çıkanlar, kategoriler)
- Kategori sayfası
- Ürün detay
- Sepet
- Ödeme/onay
- Sipariş takip
- Değerlendirme
- Masa bilgisi (QR'dan geldiyse masa numarası belli)
- Dil değiştirme (TR/EN)

### 4.4 Ortak Ekranlar

- Giriş (login) — işletme paneli için (Tasarım BEKLENIYOR)
- Şifre unuttum
- İşletme kayıt davetiye linki (süper admin mail gönderir)

---

## 5. Subdomain ve DNS Yapılandırması

### 5.1 DNS Kayıtları (Domain sağlayıcında)

```
A      @              76.76.21.21       (Vercel'in IP'si — tanıtım sitesi)
A      *              76.76.21.21       (wildcard — tüm subdomain'ler)
CNAME  www            cname.vercel-dns.com
```

Wildcard (`*`) sayesinde `karakoy-aleg.aleg.com`, `beyoglu-aleg.aleg.com` gibi istediğin kadar subdomain otomatik çalışır — her kafe için ayrıca DNS kaydı açmana gerek yok.

### 5.2 Next.js Middleware ile Yönlendirme

Kod tarafında tek bir middleware subdomain'e bakıp doğru route'a yönlendirir:

```
İstek: admin.aleg.com/dashboard
  → middleware → /admin/dashboard route'una yönlendir

İstek: panel.aleg.com/kasa
  → middleware → /panel/kasa route'una yönlendir

İstek: karakoy-aleg.aleg.com/menu
  → middleware → /menu/[slug]/menu route'una yönlendir (slug=karakoy-aleg)
```

---

## 6. Auth (Kimlik Doğrulama) Akışı

### 6.1 Süper Admin Girişi
- `admin.aleg.com/login` → mail/şifre
- Supabase Auth + `is_super_admin` flag'i kontrol edilir
- RLS politikası: `is_super_admin` ise her şeyi görür

### 6.2 İşletme Kullanıcı Akışı
1. Süper admin "Yeni İşletme" oluşturur → mail atar + geçici şifre üretir
2. Kullanıcı mail'deki linkle `panel.aleg.com/ilk-giris` sayfasına gelir
3. Şifresini belirler, bilgilerini tamamlar
4. `business_members` tablosuna `owner` rolüyle eklenir
5. Sonrasında işletme sahibi kendi ekibini davet eder

### 6.3 Müşteri (QR okutan) — Auth GEREKMEZ
- QR açık menüye gider, üyelik opsiyonel
- Loyalty üyesiyse telefon numarasıyla tanınır (magic link veya OTP)

### 6.4 Rol Bazlı Yetki Kontrolü

Her kullanıcının bir rolü var, her rolün `permissions` objesi var:
```json
{
  "menu": ["read", "write"],
  "pos": ["read", "write"],
  "reports": ["read"],
  "team": [],
  "settings": []
}
```
Frontend'de ekran gizleme + backend'de RLS politikaları birlikte çalışır.

---

## 7. Offline-First İşletme Paneli

### 7.1 Kritik Senaryo

Kafe orta-öğle yoğunluğunda. Siparişler geliyor, adisyonlar açık. İnternet kesildi. **Ne olmalı?**

- Garson yeni sipariş alabilmeli
- Kasa hesap kapatabilmeli
- Mutfak siparişleri görmeye devam etmeli
- İnternet geri geldiğinde her şey buluta senkron olmalı
- Aynı cihaz offline'dayken başka cihaz online kalabilir (aynı kafenin tablet+kasa gibi)

### 7.2 Mimari

**Local-First Pattern:**
1. Tüm yazma işlemleri önce IndexedDB'ye (tarayıcıdaki yerel veritabanı) yazılır
2. Arka planda "sync queue" her değişikliği Supabase'e gönderir
3. Internet yoksa queue birikir, geldiğinde boşaltır
4. Çakışma olursa (iki cihaz aynı adisyonu değiştirdi) `updated_at` ve conflict resolution mantığı devreye girer

**Kullanılan Kütüphaneler:**
- `Dexie.js` — IndexedDB için güçlü bir wrapper
- `next-pwa` — Service Worker otomasyonu, offline cache
- Supabase'in `realtime` aboneliği — online'ken anlık güncelleme

### 7.3 Hangi Ekranlar Offline Çalışacak?

**Tam offline:**
- POS/Kasa, Adisyonlar
- Masalar
- Mutfak/Bar KDS
- Menü görüntüleme (okuma)
- Stok (değişiklikler queue'ya düşer)

**Internet gerektirir:**
- Dashboard raporları (güncel veri için)
- QR kod üretimi/yazdırma
- Ekip daveti/rol yönetimi
- Abonelik ve fatura

---

## 8. Faz Planı (MVP → Tam Ürün)

### 🎯 FAZ 1 — Temel Ürün (4-6 hafta)

**Amaç:** Satılabilir MVP. "Menübir.com rakibi" seviyesi.

- [x] Proje kurulumu (Next.js + Supabase + TS + Tailwind)
- [ ] Subdomain yönlendirme middleware
- [ ] Veritabanı şeması (tüm tablolar, RLS politikaları)
- [ ] Supabase Auth entegrasyonu
- [ ] Süper admin paneli iskeleti + işletme oluşturma
- [ ] İşletme paneli: Giriş, Dashboard (basit), Kategoriler, Ürünler, Ayarlar, Marka
- [ ] QR üretim ekranı (tasarım dosyasında var)
- [ ] Müşteri menüsü (QR'dan açılan, sipariş YOK, sadece görüntüleme + sepet + garson çağırma)
- [ ] Landing page (`aleg.com`)
- [ ] Vercel deploy + DNS kurulumu

**Bu fazın sonunda:** Bir kafeye "al kullan" diyebileceğin bir ürünün olur.

### 🎯 FAZ 2 — Operasyon (4-6 hafta)

**Amaç:** Gerçek kafe yönetim platformu. "Adisyo/iKas seviyesi."

- [ ] Masa yönetimi + zone'lar + masa haritası
- [ ] POS/Kasa (adisyon aç/kapat, indirim, bahşiş, çoklu ödeme)
- [ ] Sipariş akışı (müşteri sipariş verir → mutfağa düşer)
- [ ] Bar/Mutfak KDS ekranları + istasyon yönetimi
- [ ] Garson çağrı sistemi
- [ ] Ekip & Roller & İzinler
- [ ] Şube yönetimi
- [ ] **Offline-first katmanı** (kritik!)
- [ ] PWA kurulumu (ana ekrana ekle, offline ikon vs.)
- [ ] Z Raporu (gün sonu)
- [ ] Fiş tasarımı ve yazdırma (termal yazıcı desteği)

### 🎯 FAZ 3 — Büyüme Modülleri (4-8 hafta)

**Amaç:** Premium özellikler, ek gelir.

- [ ] Loyalty (sadakat) programı — üyeler, puan, kampanyalar
- [ ] Delivery/Paket servis modülü (caller ID entegrasyonu)
- [ ] Stok takibi (minimum seviye uyarıları)
- [ ] Vardiya planlama
- [ ] Değerlendirme yönetimi
- [ ] Gelişmiş raporlar ve analitik
- [ ] Kampanya sistemi (popup, banner)

### 🎯 FAZ 4 — Platformlaşma

- [ ] Abonelik ve ödeme (Stripe veya iyzico)
- [ ] Plan yükseltme/düşürme
- [ ] Faturalama otomasyonu
- [ ] Custom domain özelliği (premium kafeler için)
- [ ] Çoklu dil (TR/EN ötesinde)
- [ ] Mobil uygulama (isteğe bağlı — PWA zaten yeterli olabilir)
- [ ] API açılımı (entegrasyon isteyen zincirler için)

---

## 9. Klasör Yapısı (Next.js Projesi)

```
aleg/
├── app/
│   ├── (marketing)/              # aleg.com
│   │   ├── page.tsx              # ana sayfa
│   │   ├── fiyatlar/
│   │   └── iletisim/
│   ├── admin/                    # admin.aleg.com
│   │   ├── layout.tsx            # admin guard
│   │   ├── dashboard/
│   │   ├── isletmeler/
│   │   └── planlar/
│   ├── panel/                    # panel.aleg.com
│   │   ├── layout.tsx            # business member guard
│   │   ├── (dashboard)/
│   │   ├── menu/
│   │   │   ├── kategoriler/
│   │   │   └── urunler/
│   │   ├── kasa/
│   │   ├── masalar/
│   │   ├── siparisler/
│   │   ├── loyalty/
│   │   ├── delivery/
│   │   └── ayarlar/
│   ├── menu/                     # [slug].aleg.com
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       ├── kategori/[cat]/
│   │       ├── urun/[id]/
│   │       └── sepet/
│   └── api/                      # API routes
│       ├── auth/
│       └── webhooks/
├── components/
│   ├── ui/                       # Primitives (Button, Card, Input...)
│   ├── panel/                    # İşletme paneli bileşenleri
│   ├── admin/                    # Süper admin bileşenleri
│   └── menu/                     # Müşteri menüsü bileşenleri
├── lib/
│   ├── supabase/                 # Client, server, admin clients
│   ├── db/                       # Dexie offline DB
│   ├── sync/                     # Sync queue manager
│   └── utils/
├── hooks/
├── types/                        # TypeScript tipleri
├── styles/
│   └── fonts.css                 # Bricolage + Instrument Serif
├── public/
│   ├── manifest.json             # PWA
│   └── icons/
├── middleware.ts                 # Subdomain routing
├── next.config.js
├── tailwind.config.ts
└── supabase/
    ├── migrations/               # SQL migration dosyaları
    └── seed.sql                  # Test verisi
```

---

## 10. Tasarım Sistemi (Mevcut Tasarımdan)

### 10.1 Renkler (Warm Tema — varsayılan)

```
--paper:       #F4EEE2   /* arka plan */
--paper-2:     #EDE4D3   /* vurgulu arka plan */
--ink:         #2A1F18   /* ana yazı */
--ink-2:       #5A4A3D   /* ikincil yazı */
--ink-3:       #8C7A69   /* soluk yazı */
--line:        #D6C9B2   /* çizgi */
--accent:      #C4553A   /* terracotta — vurgu */
--accent-ink:  #8A3822   /* koyu vurgu */
--olive:       #6B7A4B   /* zeytin yeşili */
--gold:        #B08A3E   /* altın */
--ok:          #4F7C4C   /* başarı */
--warn:        #B07A2E   /* uyarı */
--danger:      #B84A3A   /* tehlike */
--card:        #FAF5EA
```

Diğer temalar: `espresso` (koyu), `swiss` (minimal), `editorial`.

### 10.2 Font Sistemi — Brutalist Spice (Seçilen)

```
Display: Bricolage Grotesque (başlıklar)
Body:    Bricolage Grotesque (metinler)
Serif:   Instrument Serif (özel vurgu için)
Mono:    Space Mono (kod, sayılar, küçük etiketler)
```

Google Fonts'tan yüklenir, CSS değişkenleriyle her tema için ayarlanır.

### 10.3 Tasarım Prensipleri

- Yumuşak gölgeler (2 katman: yakın + uzak)
- Köşe yuvarlaklığı: 8px (küçük), 14px (normal), 22px (büyük)
- Kağıt dokusu (warm ve editorial temalarda, CSS radial-gradient ile)
- Yoğunluk (density) ayarı: comfortable / compact
- TR/EN anında dil değiştirme (her metin `{tr: "...", en: "..."}` formatında)

---

## 11. Sonraki Adımlar — Başlarken Yapılacaklar Listesi

### Sen (kullanıcı):
1. ✅ Domain sağlayıcında giriş bilgilerini hazırla (wildcard DNS için)
2. ⏳ Supabase hesabı aç (supabase.com — GitHub ile ücretsiz)
3. ⏳ GitHub hesabı aç (yoksa)
4. ⏳ Süper admin paneli tasarımını Claude Design'da bitir
5. ⏳ Giriş ekranları tasarımını bitir (işletme paneli için login)
6. ⏳ Vercel hesabı aç (GitHub ile bağlanır — ücretsiz)

### Ben (Claude):
1. ⏳ Next.js projesinin iskeletini kur
2. ⏳ Supabase migration dosyalarını yaz (tüm tablolar + RLS)
3. ⏳ Middleware ile subdomain yönlendirmesi
4. ⏳ Tasarımdan `primitives.jsx` → Tailwind component'lere dönüşüm
5. ⏳ Auth akışlarını kur
6. ⏳ İlk çalışan demo

### Birlikte:
- Her faz sonunda birlikte test ederiz
- Kod GitHub'a push edilir, Vercel otomatik deploy eder
- Gerçek kafede deneme (bir tanıdığın varsa muhteşem olur)

---

## 12. Risk ve Notlar

**Risk:** Proje büyük, tek kişi yapınca tükenme olabilir.
**Çözüm:** Faz planına sıkı sıkı bağlı kal. MVP = Faz 1 + küçük Faz 2. Geriye bırak.

**Risk:** Offline-first karmaşık.
**Çözüm:** Faz 2'ye bırakıyoruz. Faz 1 tamamen online olacak.

**Risk:** Supabase ücretsiz planı 500 MB veritabanı + 50k aktif kullanıcı.
**Çözüm:** MVP için fazlasıyla yeterli. 10+ gerçek kafe olunca Pro plana geçeriz ($25/ay).

**Risk:** Müşterilerin bir kısmının termal yazıcıları eski.
**Çözüm:** Faz 2'de fiş yazdırma için ESC/POS protokolü. Yaygın desteklenir.

**Not:** Bu döküman yaşayan bir belge. Her fazı bitirdikçe güncelleriz.

---

*Döküman versiyonu: 1.0 — 18 Nisan 2026*
