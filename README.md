# Aleg Süper Admin — Paket 2: İşletmeler Komple

## Bu pakette neler var?

Süper admin panelinin **işletme yönetimi** modülü baştan sona yenilendi.

### Yeni özellikler

1. **Liste sayfası** (`/isletmeler`)
   - Tablo ↔ Kart view toggle
   - Bulk select + bulk action bar (askıya al / plan değiştir / iptal)
   - 4 filtre: arama / durum / plan / şehir + filter chips
   - CSV indir butonu
   - MRR, sipariş 30g, son giriş kolonları
   - Son giriş 7 gün geçtiyse warn rengi

2. **Detay sayfası** (`/isletmeler/[id]`)
   - 6 tab: Özet · Kullanıcılar · Abonelik · Faturalar · Aktivite · Ayarlar
   - Header'da 4 metric (Plan / MRR / Sipariş 30G / Son giriş)
   - Son 30 gün ciro sparkline
   - Onayla / Askıya al / Geri aç / Plan değiştir / Panele gir butonları
   - Kullanıcılar tab'ı `business_members` view'ından çekiyor

3. **Yeni işletme wizard'ı** (`/isletmeler/yeni`)
   - 5-step (İşletme / Sahip / Plan / Modüller / Özet)
   - Sağda canlı önizleme paneli
   - 6 işletme tipi (kafe/restoran/bar/fırın/fast food/diğer)
   - 8 modül toggle (menu zorunlu)
   - Başarı ekranında geçici şifre gösterimi

4. **Onay bekleyenler** (`/isletmeler/bekleyen`)
   - `subscription_status = 'pending_approval'` olan işletmeler
   - Hızlı onayla butonu (14 gün trial başlatır)

## Migration ne yapıyor?

`migrations/0031_admin_paket_2.sql`:

- `businesses` tablosuna 4 kolon eklendi:
  - `last_login_at` — son giriş zamanı (auth.users sync trigger ile)
  - `approved_at` — onay zamanı
  - `suspended_at` — askı zamanı
  - `suspended_reason` — askı sebebi
- `subscription_status` check güncellendi: `pending_approval` eklendi
- `auth.users` UPDATE trigger → `businesses.last_login_at` otomatik sync
- `v_admin_dashboard` güncellendi (gerçek churn risk + pending count)
- 3 yeni view eklendi:
  - `v_admin_business_list` — liste sayfası için zengin veri
  - `v_admin_business_revenue_30d` — detay sparkline için
  - `v_admin_business_members` — kullanıcılar tab'ı için

## Kurulum

### 1. Migration'ı çalıştır
Supabase Studio → SQL Editor → `migrations/0031_admin_paket_2.sql` içeriğini yapıştır → Run.

### 2. Dosyaları kopyala
```
lib/actions/admin-businesses.ts          # YENİ
lib/actions/businesses.ts                # GÜNCELLE (business_type insert eklendi)
components/admin/business-list-client.tsx # YENİ
components/admin/business-detail-client.tsx # YENİ
components/admin/pending-businesses-client.tsx # YENİ
components/admin/new-business-wizard.tsx # YENİ
app/admin/(shell)/isletmeler/page.tsx    # GÜNCELLE
app/admin/(shell)/isletmeler/[id]/page.tsx # GÜNCELLE
app/admin/(shell)/isletmeler/yeni/page.tsx # GÜNCELLE
app/admin/(shell)/isletmeler/yeni/form.tsx # ARTIK GEREKSİZ — silebilirsin (yeni wizard component'a taşındı)
app/admin/(shell)/isletmeler/bekleyen/page.tsx # YENİ
```

### 3. Eski form'u sil
`app/admin/(shell)/isletmeler/yeni/form.tsx` artık kullanılmıyor (yeni wizard `components/admin/new-business-wizard.tsx`'te).

### 4. Lint + build
```bash
npm run lint
npm run build
```

### 5. Push
Pre-push hook lint+build çalıştırır, hatalar varsa söyler.

## Test senaryoları

**Liste:**
- [ ] `/isletmeler` açılıyor, işletmeler MRR ile listeleniyor
- [ ] Tablo/Kart toggle çalışıyor
- [ ] Filtreler URL'ye yansıyor (refresh sonrası kalıyor)
- [ ] Bulk select → askıya al modal açılıyor → 1 sebep yazılabiliyor
- [ ] CSV indir Excel'de Türkçe karakterleri doğru gösteriyor

**Detay:**
- [ ] `/isletmeler/[id]` 6 tab açılıyor
- [ ] Sparkline son 30 gün ciroyu gösteriyor (eğer sipariş varsa)
- [ ] "Panele gir" butonu impersonate API'ye gidiyor
- [ ] Plan değiştir → modal'dan plan seç → güncelleniyor
- [ ] Askıya al → tabel anında pill rengi değişiyor

**Yeni:**
- [ ] `/isletmeler/yeni` wizard açılıyor
- [ ] Step1: İşletme tipi 6 kart, biri seçili olmalı
- [ ] Slug auto-generate çalışıyor, manuel yazılırsa kilitleniyor
- [ ] Sağda önizleme her input'ta güncelleniyor
- [ ] Step5 özet doğru bilgiyi gösteriyor
- [ ] Oluşturma sonrası geçici şifre ekranı çıkıyor

**Bekleyen:**
- [ ] `/isletmeler/bekleyen` boşsa "✓ Yok" mesajı
- [ ] Onayla → işletme listede `trial` olarak görünüyor

## Sorun çıkarsa

- **"v_admin_business_list yok"** → Migration çalışmadı, önce 0031 SQL'i çalıştır
- **"Stepper component bulunamadı"** → `components/admin/primitives.tsx` mevcut olmalı (Paket 1'den)
- **"createBusiness business_type kabul etmiyor"** → `lib/actions/businesses.ts` patch'lendi mi kontrol et
- **last_login_at hep null görünüyor** → Trigger sadece UPDATE'te tetikleniyor; manuel sync için:
  ```sql
  UPDATE businesses b SET last_login_at = u.last_sign_in_at
  FROM auth.users u WHERE u.id = b.owner_user_id;
  ```
