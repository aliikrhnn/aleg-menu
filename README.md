# Aleg Süper Admin — Paket 3: Billing

Bu paket: Planlar, Faturalar (liste + detay), Ödemeler, Bekleyen Ödemeler — toplam 5 sayfa, yeni `platform_payments` tablosu, 6 yeni view.

## ⚠️ Kurulum sırası

### 1) Migration ÖNCE çalıştır

```bash
# Supabase Studio → SQL Editor → yapıştır → Run
migrations/0033_billing_module.sql
```

Bu migration:
- ✅ `platform_payments` tablosunu oluşturur (RLS aktif, sadece super admin)
- ✅ `platform_invoices` için auto-`paid_at` trigger ekler (status=paid olunca)
- ✅ 6 view oluşturur: `v_admin_invoices_list`, `v_admin_payments_list`, `v_admin_pending_invoices`, `v_admin_billing_metrics`, `v_admin_payments_monthly`, `v_admin_plan_subscriber_count`

Tamamlandığında console'da 4 satır NOTICE göreceksin.

### 2) Dosyaları yerleştir

```
lib/actions/admin-billing.ts                                 → YENİ
components/admin/plans-client.tsx                            → YENİ
components/admin/invoices-list-client.tsx                    → YENİ
components/admin/invoice-detail-client.tsx                   → YENİ
components/admin/payments-list-client.tsx                    → YENİ
components/admin/pending-invoices-client.tsx                 → YENİ
app/admin/(shell)/planlar/page.tsx                           → YENİ
app/admin/(shell)/faturalar/page.tsx                         → YENİ
app/admin/(shell)/faturalar/[id]/page.tsx                    → YENİ
app/admin/(shell)/odemeler/page.tsx                          → YENİ
app/admin/(shell)/odemeler/bekleyen/page.tsx                 → YENİ
```

Hepsi yeni — eski dosya silmen gerekmiyor.

### 3) Push

```bash
git add .
git commit -m "feat(admin): paket 3 — billing modülü"
git push
```

Pre-push hook lint + build koşacak. Migration uygulanmadan push'larsan TypeScript şikayet etmez ama runtime'da view'ler bulunamaz.

## Sayfa rehberi

### `/planlar`
Plan CRUD + sıralama + arşiv. Yeni işletmelerin seçebileceği ücretlendirme planlarını burada yönetiyorsun.
- Üst panel: aktif plan / abone / MRR
- Yukarı-aşağı oklarıyla sıralama (drag-drop yok, basit ve hızlı)
- Modal'da: slug, ad, açıklama, aylık/yıllık fiyat, özellikler (chip listesi), max şube/ürün/ekip limitleri
- Arşivleme: yeni işletmeler seçemez, mevcut aboneler etkilenmez
- Plan başına abone/trial sayısı + MRR katkısı kartta

### `/faturalar`
- 4 üst metrik: bu ay tahsil edilen (MoM yüzde), bekleyen tutar, vade geçmiş tutar, bu ay ödeme sayısı
- Filtreler: arama, durum, işletme
- Tablo: fatura no, işletme (logo + isim), tutar, durum (retry rozetli), dönem, vade (gecikmiş kırmızı)
- Toplu seçim → hatırlatma gönder (audit log + retry_count++)
- CSV indir (UTF-8 BOM'lu, Excel uyumlu)
- + Manuel fatura modal (işletme, tutar, dönem, vade, not)

### `/faturalar/[id]`
- Header: fatura no, tutar (büyük), durum, gecikme/vade pillsları, retry sayısı
- 4 metrik strip: vade, ödeme tarihi, yöntem, oluşturma
- İşletme kartı (link) + tahsilat özeti (fatura/tahsil edilen/kalan)
- Ödeme hareketleri listesi (her satır: yöntem, TX ID, tarih, kim kaydetti, tutar)
- Aksiyonlar: ✓ Ödendi işaretle (otomatik payment kaydı oluşur), + Manuel ödeme kaydet, ✗ İptal et (sebep alanı)

### `/odemeler`
- Üst: son 12 ay sparkline (gold renk) + bu ay tahsil + bekleyen
- Filtreler: arama, yöntem, durum
- Tablo: tarih, işletme, fatura, tutar, yöntem, durum, TX

### `/odemeler/bekleyen`
- 3 grup, vurgulu border:
  - **Vade geçmiş** (kırmızı) — acil
  - **Vade yaklaşıyor** (sarı) — 7 gün
  - **Sonraki dönem** (gri) — 7+ gün
- Grup başlığında: "Bu grubu seç" butonu
- Toplu hatırlatma + satır bazlı ✓ Ödendi quick action

## Test senaryoları

### Plan CRUD
1. `/planlar` aç → Yeni plan: ad="Standart", slug="standart", aylık=499, 3 özellik ekle, max ürün 100
2. Liste → Düzenle → fiyatı 599 yap → Kaydet
3. Yukarı/aşağı oklarla sırayı değiştir, sayfayı yenile → sıra korundu mu?
4. Arşivle → Pill "ARŞİV" gözükmeli, yeni kayıt formunda görünmemeli (paket 2'deki wizard)
5. Geri aç → tekrar aktif

### Manuel fatura + ödendi
1. `/faturalar` → + Manuel fatura → bir işletme seç, 1500 TRY, 14 gün vade
2. Listede gözüktü mü? Vade tarihi sarı (yaklaşıyor) mu?
3. Detaya tıkla → ✓ Ödendi işaretle → Yöntem=Havale → onayla
4. Detayda: ödeme hareketleri listesinde 1500 TRY havale kaydı + Pill yeşil
5. `/odemeler` → ödeme listesinde gözüktü mü? Aylık grafikte tutar arttı mı?

### Vade gruplandırma
1. Vade tarihi 5 gün önce olan bir fatura bırak (manuel oluşturduğunda dueAt'i geriye al)
2. `/odemeler/bekleyen` aç → "Vade geçmiş" kırmızı grupta görünmeli, "Xg" yazmalı

### Toplu hatırlatma
1. `/odemeler/bekleyen` → 2-3 fatura seç → Hatırlatma gönder
2. Her fatura için retry_count +1 olmalı (listede ⟳ rozet)
3. Audit log'da `invoice.reminder_sent` görünmeli

### CSV
1. `/faturalar` → CSV indir
2. Excel'de aç → Türkçe karakterler düzgün, başlıklar var

## Şema notları

`platform_payments` constraint'leri:
- `status IN ('succeeded','pending','failed','refunded')`
- `payment_method IN ('card','bank_transfer','cash','manual','other')`
- `invoice_id` SET NULL (fatura silinirse ödeme kalır, audit için)
- `business_id` CASCADE (işletme silinirse ödemeler de silinir)
- `recorded_by` SET NULL (admin kullanıcı silinirse)

`v_admin_invoices_list` türetilen alanlar:
- `business_logo`: işletme adının ilk 2 harfi (Türkçe karakter desteği)
- `days_overdue`: bekleyen + vade geçmiş ise gün sayısı
- `due_soon`: bekleyen + vade 7 gün içinde

## Sonraki paket

Paket 4 (son): Support tickets, Notifications, Users (admin team), Audit logs, System status, Settings, ⌘K command palette.
