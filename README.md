# 🎯 CARİ HESAPLAR — PAKET 3: Z Rapor + İyileştirmeler

Cari sistemini tam olgunlaştırır. Z raporuna açık hesap özeti, cari detayda
tarih filtreleri, CSV export, PDF güncellemesi.

**5 dosya · Migration yok.**

## ✨ Yenilikler

### 1. Z Raporuna "Açık Hesap (Cari)" Bölümü

Modal ve PDF'de yeni satır:
```
╭─────────── 📒 AÇIK HESAP (CARİ) ──────── NET: +₺240 ───╮
│ ➕ Yeni borçlanma                              ₺580   │
│   3 sipariş açık hesaba yazıldı                       │
│ ────────────────                                       │
│ ➖ Tahsilat (kasa girişi)                      ₺820   │
│   5 cari ödeme alındı                                 │
│ ────────────────                                       │
│ Net Değişim                                  +₺240    │
│                                                        │
│ ▼ Hareketleri Göster (8)                              │
│   14:30 · Ahmet Yılmaz                       +₺120    │
│   15:15 · Mehmet Demir (Nakit)               −₺200    │
│   ...                                                  │
╰────────────────────────────────────────────────────────╯
```

**Net Değişim Yorumu:**
- `Pozitif` (yeşil): Bugün borç tahsil edildi (kasa kazandı)
- `Negatif` (kırmızı): Bugün açık hesaba yeni borç eklendi
- `Sıfır`: Bugün giriş-çıkış dengeli

Cari ödemeler **payment_logs**'a `cash/card/transfer` olarak yazıldığı için
**Z raporunun nakit/kart toplamına otomatik dahil**. Açık Hesap bölümü
ek bilgi sağlar.

### 2. Cari Detayda Tarih Filtreleri

```
HAREKETLER (24)                           [📥 CSV İndir]
[Tümü] [Son 7 Gün] [Son 30 Gün] [Son 1 Yıl]
```

- 4 hızlı filter chip
- Filter değişince hareketler yeniden yüklenir (sunucu tarafından)
- Limit 200 (eski 20'den arttı)

### 3. CSV Export

`📥 CSV İndir` butonu cari hareketlerini Excel uyumlu CSV olarak indirir:

```csv
Tarih,Saat,Tip,Tutar,Yon,Yontem,Siparis No,Masa,Urunler,Kasiyer,Not
25.04.2026,14:30,Siparis,120.00,+,,#142,B5,2x Latte; 1x Cheesecake,Mehmet,
25.04.2026,15:15,Odeme,200.00,-,Nakit,,,,Ayşe,Aralık ödemesi
```

- BOM (Byte Order Mark) ile Excel Türkçe karakterleri doğru gösterir
- Dosya adı: `cari_AhmetYilmaz_2026-04-25.csv`
- Filter aktifse sadece görünen hareketler indirilir

### 4. Sipariş Ürün Detayı

`getCustomerTransactions` artık `order_id` olan transaction'lar için ürün
listesini de getirir (cancelled olmayanlar). Önceden boş gözüken kalemler
artık dolu:

```
🍽 Sipariş #142  Masa 5            +₺120
   2× Latte, 1× Cheesecake          ← yeni
```

## 📦 Dosyalar (5)

```
lib/actions/payments.ts                       (ZReport.on_account_summary)
lib/actions/customers.ts                      (getCustomerTransactions: tarih + ürün)
lib/utils/z-report-pdf.ts                     (PDF: Açık Hesap bölümü)
app/panel/(shell)/pos/z-report-modal.tsx      (UI: OnAccountSection)
app/panel/(shell)/cari-hesaplar/
  customer-detail-modal.tsx                   (filter chips + CSV)
```

### Detaylı Değişiklikler

**`payments.ts`**:
- `ZReport` type: `on_account_summary` alanı eklendi
- `getZReport`: `customer_transactions` (charge + payment) sorgulanıyor
- Net değişim hesabı

**`customers.ts`**:
- `getCustomerTransactions`: `fromDate`/`toDate` parametreleri
- Order ürün listesi join'i
- Cashier isim join'i
- Limit 200

**`z-report-pdf.ts`**:
- `on_account_summary` defaults
- ÖDEME YÖNTEMİ DAĞILIMI sonrasında "ACIK HESAP (CARI)" section
- Net değişim göstergesi (renk kodlu)
- Detay listesi (max 12 satır + "+X hareket daha")

**`z-report-modal.tsx`**:
- `OnAccountSection` componenti (dosya sonu)
- Modal'ın by_method sonrasına entegre

**`customer-detail-modal.tsx`**:
- `getCustomerTransactions` import
- `DateFilter` type ve `computeDateRange` helper
- Filter chips UI (Tümü / Son 7 Gün / Son 30 Gün / Son 1 Yıl)
- `📥 CSV İndir` butonu
- `downloadCsv` helper (BOM + Excel uyumlu)
- Filter değişiminde otomatik reload

## 🚀 Push

```powershell
git add .
git commit -m "feat(cari): paket 3 - z rapor + tarih filtre + csv export"
git push
```

## 🧪 Test Senaryoları

### A) Z Raporu Cari Bölümü
**Hazırlık**: Bugün için karışık aktivite oluştur
1. Bir masada sipariş ₺200 → Açık Hesap → Ahmet seç
2. Panel → Cari → Mehmet → + Ödeme Al → ₺150 nakit (kasa açık)
3. Panel → Sipariş Akışı → Z Raporu butonu

**Beklenen**:
- ✅ "📒 AÇIK HESAP (CARİ)" bölümü görünür
- ✅ Yeni borçlanma: 1 sipariş, ₺200 (kırmızı)
- ✅ Tahsilat: 1 ödeme, ₺150 (yeşil)
- ✅ Net Değişim: −₺50 (kırmızı, "bugün ₺50 borç eklendi")
- ✅ "Hareketleri Göster" tıklayınca detay liste

**Veri yokken**: Bu bölüm gizli (no-op)

### B) Z Raporu PDF
1. Aynı veri ile **PDF İndir** tıkla
2. ✅ "ACIK HESAP (CARI)" başlığı
3. ✅ Yeşil/kırmızı renkler
4. ✅ Detay listesi (max 12 satır)
5. ✅ Sayfa taşmasında otomatik yeni sayfa

### C) Cari Detay Filter
1. Panel → Cari Hesaplar → Ahmet (10+ hareketi olan kullanıcı)
2. ✅ Hareketler header: "HAREKETLER (24)" + "📥 CSV İndir"
3. ✅ Chip bar: Tümü / Son 7 Gün / Son 30 Gün / Son 1 Yıl
4. **Son 7 Gün** tıkla → ✅ "Filtreleniyor…" → eski hareketler kaybolur
5. **Tümü** → ✅ hepsi geri gelir
6. **Son 1 Yıl** → 365 gün öncesi dahil

### D) CSV İndirme
1. Detay → 📥 CSV İndir
2. ✅ Dosya: `cari_AhmetYilmaz_2026-04-25.csv` indirilir
3. Excel'de aç:
   - ✅ Türkçe karakterler doğru (Ahmet Yılmaz, Sipariş, vs.)
   - ✅ Sütunlar: Tarih, Saat, Tip, Tutar, Yön, Yöntem, Sipariş No, Masa, Ürünler, Kasiyer, Not
   - ✅ Tutar 2 ondalık basamak (120.00)
   - ✅ Yön: + (borç) veya − (ödeme)
4. Filter aktifken indirme → ✅ sadece filtrelenmiş hareketler

### E) Sipariş Ürün Detayı
1. Cari kullanıcının sipariş hareketine bak
2. ✅ "🍽 Sipariş #142 Masa B5 +₺200"
3. ✅ Altında ürünler: "2× Latte, 1× Cheesecake"
4. ✅ Cancelled kalemler dahil değil

## 💡 Önemli Notlar

### Z Rapor Mantığı

Cari ödeme yapıldığında **3 yere** kayıt gider:
1. `customer_transactions` (type='payment')
2. `payment_logs` (method='cash/card/transfer', cash_session_id=aktif)
3. `customers.balance` güncellenir

Z raporu hem `payment_logs`'tan (ciroya etki için) hem de
`customer_transactions`'tan (Açık Hesap özeti için) okur.

**Avantaj**: Cari ödemeler **otomatik** olarak günün nakit/kart toplamına dahil
olur. "Açık Hesap" bölümü sadece **bilgi amaçlı** ek özet.

### Tarih Filtre Davranışı

`computeDateRange` fonksiyonu **rolling window** kullanır:
- Son 7 Gün = bugün − 7 gün → bugün
- Son 30 Gün = bugün − 30 gün → bugün

Calendar bazlı değil (yani "bu hafta pazartesi → bugün" değil).
İstersen sonraki bir paket'te calendar bazlı opsiyonu da eklenebilir.

### CSV Encoding

Türkçe karakter sorunlarını önlemek için:
- BOM (`\uFEFF`) eklenir → Excel UTF-8 olarak açar
- ASCII'ye dönüştürme YOK — orijinal Türkçe karakterler korunur
- Virgül/tırnak kaçışı yapılır

## 🗺️ Durum

| | |
|---|---|
| Paket 1: Backend + Panel | ✅ |
| Paket 2: Kasa Entegrasyonu | ✅ |
| **Paket 3: Z Rapor + İyileştirmeler** | **✅ TESLİM** |

Cari hesap sistemi **tamamlandı**! 🎉

## 🔮 Gelecek (İsteğe Bağlı)

Paket 3 ile cari sistemi tam fonksiyonel. Eklenebilecek future iyileştirmeler:
- Calendar bazlı tarih filtre (Bu Hafta / Bu Ay)
- Özel tarih aralığı seçici
- Toplu cari ödeme (birden fazla kullanıcı)
- Cari grup/kategori (VIP, Personel, Tedarikçi)
- Borç limit alarmı
- Excel format (.xlsx) export

Push → test → çalışırsa **süper admin paneli** veya başka iş söyle 🚀
