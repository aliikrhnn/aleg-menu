# Süper Admin — Paket 1 (Primitives + Dashboard + İstatistikler)

İlk admin paketi: tasarımdaki tüm temel UI bloklarını (primitives) Next.js'e adapte eder, mevcut basit dashboard'u tasarımdaki zengin versiyona çevirir, ve eksik **İstatistikler** sayfasını ekler.

Bu paketle birlikte: **MRR canlı**, **Funnel hunisi**, **Churn risk**, **Login-as (impersonate)** ekstra özellikleri de hazır.

---

## 📦 Dosyalar

```
out/
├── migrations/
│   └── 0030_admin_paket_1.sql                      ← önce bunu Supabase'e koş
│
├── components/admin/
│   └── primitives.tsx                              ← 17 yeniden kullanılabilir component
│
├── lib/actions/
│   └── admin-dashboard.ts                          ← server actions (dashboard + stats + impersonate)
│
└── app/admin/
    ├── (shell)/
    │   ├── page.tsx                                ← yeni dashboard (mevcut basitin yerine)
    │   └── istatistikler/
    │       └── page.tsx                            ← YENİ ekran
    └── api/
        └── impersonate/
            └── route.ts                            ← login-as endpoint
```

**5 dosya kod, 1 dosya migration.**

---

## 🚀 Kurulum

### 1. Migration'ı çalıştır (ÖNCE BU)

```bash
# Supabase Dashboard → SQL Editor → New Query
# 0030_admin_paket_1.sql içeriğini yapıştır → Run
```

Bu migration şunları ekler:
- 2 yeni tablo: `platform_invoices`, `platform_audit_logs`
- 7 view: `v_admin_dashboard`, `v_admin_pending_payments`, `v_admin_city_dist`, `v_admin_signups_7d`, `v_admin_business_growth_12m`, `v_admin_mrr_growth_12m`, `v_admin_funnel_30d`
- 1 RPC: `log_audit()`
- RLS policies: sadece super_admin görür/yazar

> Migration'ın sonunda yorum satırı halinde test data var. İstersen yorumu kaldırıp çalıştırabilirsin (8 örnek fatura ekler).

### 2. Dosyaları kopyala

| Zip içinde | Nereye |
|---|---|
| `components/admin/primitives.tsx` | `components/admin/primitives.tsx` (yeni) |
| `lib/actions/admin-dashboard.ts` | `lib/actions/admin-dashboard.ts` (yeni) |
| `app/admin/(shell)/page.tsx` | **üstüne yaz** (mevcut basit dashboard'u değiştirir) |
| `app/admin/(shell)/istatistikler/page.tsx` | yeni klasör + dosya |
| `app/admin/api/impersonate/route.ts` | yeni klasör + dosya |

### 3. Test et

```powershell
npm run dev
```

`admin.alegstudio.com` (veya `/admin`) adresine git, süper admin olarak giriş yap.

---

## 🧪 Test Senaryoları

### A) Dashboard hero
1. `/admin` aç
2. ✅ "Günaydın/İyi günler/İyi akşamlar, **{ismin}**." selamı
3. ✅ Tarih satırı (eyebrow): "28 NİSAN 2026 · SALI · 15:30"
4. ✅ Açıklama: "Platformda bugün X yeni işletme... Y fatura ödeme bekliyor..."
5. ✅ Sağda **Detaylı istatistikler** + **+ Yeni işletme** butonları

### B) 4 Metric Kartı
- ✅ TOPLAM İŞLETME — sparkline (mavi/super)
- ✅ AKTİF ABONELİK — sparkline (yeşil/olive), trial ve paid sayısı altta
- ✅ AYLIK GELİR (MRR) — ₺ + serif italic, sparkline (gold)
- ✅ BUGÜN YENİ KAYIT — sparkline son 7 günden, accent renk

Her kartta sağ üstte **▲ %X** trend rozeti.

### C) Funnel Stripi (EKSTRA)
- ✅ SON 30 GÜN HUNİSİ → KAYIT sayısı
- ✅ TRIAL BAŞLATTI → sayı + % oran
- ✅ ÜCRETLİYE GEÇTİ → sayı + % oran
- ✅ CHURN RİSK → 7 gündür giriş yapmamış aktifler (uyarı renkli)

### D) Aktivite Akışı + Kritik Ödemeler
**Sol (1.4fr):**
- ✅ "PLATFORM AKIŞI / Son aktiviteler" başlık + **CANLI** pulse dot
- ✅ Audit log'tan son 8 satır
- ✅ Her satır: yaş (12dk, 2sa, Dün) + işletme adı + actor · action + tone'lu pill
- ✅ Boş ise: "Henüz hiç aktivite yok" mesajı

**Sağ (1fr) — accent border:**
- ✅ "KRİTİK / Ödemesi bekleyenler" başlık (accent renkli)
- ✅ Sağda kırmızı pill: "X adet"
- ✅ Her satır: logo + işletme + INV-no · "Y gün geçti" + ₺ tutar (accent renkli)
- ✅ Boş ise: ✓ "Bekleyen ödeme yok — tüm faturalar zamanında"
- ✅ Alt: "TOPLAM ₺X.XXX" + "Hepsini gör →" linki

### E) 7 Gün Grafik + Türkiye Haritası
**Sol:**
- ✅ "SON 7 GÜN / Yeni kayıtlar" + sağda büyük serif sayı
- ✅ Bar chart (Pt Sa Çr Pr Cu Ct Pa labels)
- ✅ Alt: ORTALAMA / EN YÜKSEK detay

**Sağ:**
- ✅ "COĞRAFİ DAĞILIM / Aktif işletmeler"
- ✅ Sağda TÜR/PLAN filter chips
- ✅ Türkiye silüeti + city dot'lar (büyüklük count'a bağlı)
- ✅ Her dot'un altında "İstanbul 87" gibi etiket
- ✅ Sağ alt köşede "TR · X şehir" mono yazı

### F) İstatistikler (`/istatistikler`)
- ✅ "PLATFORM İSTATİSTİKLERİ / İstatistikler" başlık
- ✅ 2 büyük kart: İşletme Büyümesi (12 ay sparkline) + MRR Büyümesi (12 ay sparkline)
- ✅ Her kartın altında yıllık delta yüzdesi (▲ +37%)
- ✅ 4 detay metric: ARR / Tahsil edilen / Bekleyen / Risk altında
- ✅ Coğrafi dağılım: harita + sağda şehir bar listesi (yatay progress'lerle)

### G) Login-as (Impersonate)
**API endpoint:** `POST /admin/api/impersonate` body `{ businessId: "..." }`
- ✅ super_admin değilse 401
- ✅ Audit log'a `admin.impersonate` kaydı düşer (tone: super)
- ✅ Yanıt: `{ success: true, redirectTo: "/panel?_imp=..." }`

> **NOT:** Paket 1'de impersonate sadece audit kaydı + yönlendirme yapıyor. Gerçek session-tabanlı impersonate (cookie + RLS context) **Paket 2 ya da 4**'te. Şimdilik UI'dan tetiklemek için `fetch('/admin/api/impersonate', {method:'POST', body:JSON.stringify({businessId})})` çalışır.

---

## 🎨 17 Primitive — kullanım

```tsx
import {
  Eyebrow, SerifTitle, PageHeader,         // metin
  Sparkline, BarChart,                      // grafik
  LogoTile, Avatar,                         // görsel
  StatusDot, Pill,                          // durum
  Money, SerifNum,                          // sayı
  MetricCard,                               // büyük metric kart (sparkline'lı)
  SearchInput, FilterChip, Stepper,         // form
  TurkiyeMap, Placeholder,                  // özel
  SectionHead,                              // section header
} from '@/components/admin/primitives';
```

Hepsi mevcut design token'larına bağlı: `var(--super)`, `var(--ink)`, `var(--paper-2)`, `var(--f-serif)`, `var(--r)` vs.

Kart birden fazla yerde kullanılacaksa direkt `<MetricCard>` çağır:

```tsx
<MetricCard
  label="TOPLAM İŞLETME"
  value={247}
  trend={8.2}
  trendLabel="Geçen aya göre"
  sparkline={[180, 185, 188, 194, 201, 208, 215, 222, 228, 234, 240, 247]}
  sparkColor="var(--super)"
/>
```

---

## 🗺️ Durum

| | |
|---|---|
| **Paket 1: Primitives + Dashboard + İstatistikler** | **✅ TESLİM** |
| Paket 2: Businesses (liste view + 6-tab detail + 5-step wizard) | ⏭ Sıradaki |
| Paket 3: Billing (Plans/Invoices/Payments/Pending) | beklemede |
| Paket 4: Support + System (Tickets kanban, Notifications, Users, Audit, Status, Settings) + ⌘K | beklemede |

### Bonus — bu pakete dahil olan ekstra özellikler:
- ✅ **MRR / ARR canlı hesaplama** — aktif aboneliklerin plan ücretlerinden
- ✅ **Funnel hunisi** — kayıt → trial → ücretli → churn (son 30g)
- ✅ **Churn risk göstergesi** — view tarafında stub (henüz `last_login_at` kolonu yok, sonraki paketle gerçek değer gelecek)
- ✅ **Login-as / impersonate** — API endpoint + audit log

---

## ⚠️ Bilinen Sınırlamalar (sonraki paketlerde çözülecek)

1. **`businesses.last_login_at`** — kolon yok, `churn_risk_count` şu an stub'dan 0 dönüyor. Paket 2'de eklenecek (auth.users.last_sign_in_at'tan trigger ile sync).
2. **Aktivite akışı boş gelebilir** — `platform_audit_logs` tablosu yeni eklendi, eski hareketler yok. Yeni admin işlemlerinden itibaren dolacak. Hızlı test için `log_audit('business.signup', 'business', '...', 'Test', null, '{}', 'olive')` SQL'inden tetikleyebilirsin.
3. **Bekleyen ödemeler boş gelebilir** — `platform_invoices` tablosuna ilk fatura kesilene kadar boş. Migration sonundaki `INSERT INTO platform_invoices...` test datasını yorumdan çıkarıp çalıştır.
4. **Trend sparkline'ları** — `v_admin_business_growth_12m` 12 ay önceden başlar. Daha az verisi olan platformlarda sparkline'lar düz/kısa görünebilir, sorun değil.
5. **Login-as gerçek session** — şu an sadece audit + yönlendirme. Cookie-tabanlı impersonate paket 2/4'te.

---

## 🚀 Push (her paketteki rutin)

```powershell
cd C:\Users\aliik\OneDrive\Desktop\aleg-starter

# 1) migration'ı Supabase'de çalıştırdın mı kontrol et
# 2) dosyaları kopyala (zip'ten)

git add .
git commit -m "feat(admin): paket 1 - primitives + dashboard + istatistikler + login-as"
git push origin main
```

Vercel deploy bittikten sonra `admin.alegstudio.com` aç, süper admin login yap, dashboard'u test et.

---

## 🔜 Sıradaki — Paket 2: İşletmeler

Paket 2 büyük olacak çünkü tasarımda:
- **Liste**: tablo/kart view toggle, bulk select + bulk action bar (mail/plan/askıya al), 4 filtre chip, MRR/Sipariş30g/Son giriş sütunları
- **Detay**: 6 tab (Özet/Kullanıcılar/Abonelik/Faturalar/Aktivite/Ayarlar), 4'lü header metric, ciro sparkline'ı, son giriş yapanlar listesi
- **Yeni işletme**: 5-step wizard (İşletme/Sahip/Plan/Modüller/Özet) + canlı önizleme paneli

Paket 1'i test edip onayladığında **"paket 2'yi başlat"** de.
