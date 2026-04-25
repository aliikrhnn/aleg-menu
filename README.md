# 🎯 HESAP PANEL B — TAM ÖZELLİKLİ

Yan panel C3 layout — tüm istenen özellikler tek pakette.

**3 dosya · Backend'e 2 yeni action eklendi · Migration yok.**

## 🎨 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ HESAP AL · Masa B5                              MASA TOPLAM ₺630 [✕]│
├────────────────────────┬─────────────────────┬──────────────────────┤
│ KALEMLER               │ ÖDEME              │ + ÜRÜN EKLE          │
│ (sol esnek)            │ (orta 340px)       │ (sağ 380px)          │
│                        │                    │                      │
│ ☐ 6 kalem  × TEMİZLE  │ TÜM MASA          │ [search]             │
│                        │                    │                      │
│ ☐ 1× Flat White ₺105  │ ARA TOP. ₺630    │ [Kahveler] [Yemekler] │
│ ☐ 1× Flat White ₺105  │ İNDİRİM −₺63 [✕] │                      │
│ ☐ 1× Matcha     ₺115  │ ─────             │ ┌────┐ ┌────┐         │
│ ...                    │ ₺567              │ │Ürün│ │Ürün│         │
│                        │                    │ └────┘ └────┘         │
│                        │ YÖNTEM             │                      │
│                        │ [💵 Nakit]         │                      │
│                        │ [💳 Kart]          │                      │
│                        │ [📒 Açık Hes.]    │                      │
│                        │                    │                      │
│                        │ [🏷 İndirim]       │ SEPET 2 ürün ₺85    │
│                        │ [💸 Parçalı]       │ + Masaya Ekle        │
│                        │                    │                      │
│ [★ İkram] [🚫 İptal]  │ [TÜM MASAYI ÖDE]   │                      │
└────────────────────────┴─────────────────────┴──────────────────────┘
```

**Mobile (<1024px):** Tab bazlı `[Kalemler] [Ödeme] [+ Ürün]` alt sticky bar.

## ✨ Tüm Özellikler

### 1. ✅ Yeni Ödeme Yöntemleri
- 💵 **Nakit**
- 💳 **Kart**
- 📒 **Açık Hesap (Cari)** — Havale + Online kaldırıldı
- ❌ Eski Havale, Online silindi

### 2. ✅ Açık Hesap Akışı
- "📒 Açık Hes." seç → "Açık Hesap Olarak Kapat" butonu (mor renk - super)
- Tıklayınca modal: müşteri notu (opsiyonel)
- Sipariş `payment_status='paid'` + `payment_method='other'` + note olarak "Açık hesap: Ahmet Bey..."
- Backend: yeni `closeOrderOnAccount` action
- Parsiyel modda da çalışır (kalemleri ayır, sonra cariye aktar)

### 3. ✅ İndirim
- 🏷 **İndirim** butonu → modal:
  - **Yüzde** veya **Sabit Tutar** seçimi
  - Hızlı yüzdeler: %5, %10, %15, %20, %25
  - Sebep alanı (sadakat, personel...)
  - Canlı önizleme: yeni toplam
- Uygulanınca ödeme paneli üstünde gösterilir:
  ```
  ARA TOPLAM    ₺630 (line-through)
  İNDİRİM       −₺63 [✕]
  ─────
  ₺567
  ```
- `takePayment`'a `discountAmount` + `discountReason` geçer
- Çoklu sipariş varsa orantısal dağıtılır

### 4. ✅ Parçalı Ödeme
- 💸 **Parçalı** butonu → mini panel
- "YARI YARI" hızlı buton → ½ Nakit + ½ Kart otomatik
- "½" "⅓" hızlı tutar girişi
- Manuel: yöntem seç + tutar gir + EKLE
- Eklenen parçalar listesi ([×] ile kaldır)
- KALAN: ₺X gerçek zamanlı
- Tamamlanmadan ödeme alınamaz (KALAN > 0)
- Backend: `splitItemsFromMultipleOrders` ile yeni sipariş yarat → her parça için ayrı `takePayment`

### 5. ✅ İptal
- 🚫 **İptal** butonu (sol footer, kalem seçili olunca)
- Modal: sebep seçimi
  - Hızlı seçenekler: "Yanlış sipariş", "Müşteri vazgeçti", "Stokta yok", "Diğer"
  - veya manuel yaz
- Backend: yeni `cancelOrderItems(itemIds, reason)` action
- Kalem `status='cancelled'`, sipariş total güncellenir
- Görsel: line-through + opacity düşük + İPTAL rozeti

### 6. ✅ Sağ Menü (Embedded MenuPicker)
- Search + kategori chip'leri yatay scroll
- 2 sütun ürün grid (compact)
- Varyant/option olan ürünlerde **mini picker modal** (radio + checkbox + not)
- Sticky sepet (alt):
  - Her kalem: − adet + × kaldır
  - Toplam + "+ Masaya Ekle"
- Eklenirken otomatik:
  - Açık sipariş varsa → `addItemsToOrder` (mevcut hesaba ekle)
  - Yoksa → `createManualOrder` (yeni sipariş)

### 7. ✅ Mobile Responsive
- `<1024px` breakpoint
- Alt sticky tab bar:
  - **Kalemler** + sayı badge
  - **Ödeme** + tutar badge
  - **+ Ürün**
- Tek tab görünür, diğerleri hidden
- Aktif tab accent renk + üstte border

### 8. ✅ Korunmuş Özellikler
- Kalem seçim (checkbox)
- Toplu ikram
- Toplu seçim header (× TEMİZLE)
- Tüm masa / Seçili öde mod ayrımı
- Ödeme sonrası 600ms delay → otomatik kapanış
- Tüm masa ödenince butonun "Tüm Masa Ödendi ✓"

## 📦 Dosyalar (3)

```
components/order/menu-picker.tsx           (yeni - embedded ürün ekle paneli)
components/order/hesap-panel.tsx           (tamamen yeniden yazıldı)
lib/actions/tables-status.ts               (cancelOrderItems + closeOrderOnAccount eklendi)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(kasa): hesap paneli B - menü/iptal/indirim/parçalı/açık hesap"
git push
```

## 🧪 Test Senaryoları

### A) Yeni Yöntemler
1. Hesap Al → ödeme paneli
2. ✅ 3 yöntem: Nakit, Kart, Açık Hesap
3. ❌ Havale, Online yok

### B) Açık Hesap (tüm masa)
1. **📒 Açık Hes.** seç
2. Buton "Açık Hesap Olarak Kapat" olur (mor)
3. Tıkla → modal: "Ahmet Bey, sonra ödeyecek"
4. Kaydet → toast "Açık hesap kaydedildi"
5. Masa kapanır (modal kapanır)
6. Sipariş `paid` durumunda görünür ama not kısmında "Açık hesap: ..." yazıyor

### C) Açık Hesap (parsiyel)
1. 2 kalem seç → 📒 Açık Hes. → Kaydet
2. ✅ Kalemler ayrılır + cariye aktarılır
3. Diğer kalemler bağımsız kalır

### D) İndirim
1. 🏷 İndirim → modal
2. %10 hızlı seç → "Sadakat" sebep yaz
3. Uygula → ödeme paneli güncellenir:
   ```
   ARA TOPLAM ₺630 (line-through)
   İNDİRİM −₺63 [✕]
   ₺567
   ```
4. Tüm Masayı Öde → toast "₺567 ödendi"
5. ✅ İndirim sipariş kaydında görünür

### E) Parçalı Ödeme
1. 💸 Parçalı → modal
2. **YARI YARI** bas → 2 parça otomatik (₺315 nakit + ₺315 kart)
3. veya manuel: Nakit ₺200 EKLE, Kart ₺430 EKLE
4. KALAN: ₺0 → buton aktif
5. **Ödemeyi Al** → her parça ayrı `takePayment` kaydı
6. ✅ Toast "Parçalı ödeme tamamlandı"

### F) İptal
1. 2 kalem seç → 🚫 İptal
2. Modal: "Yanlış sipariş" hızlı seç → İptal Et
3. ✅ Kalemler `cancelled`, line-through, "İPTAL" rozeti
4. Toplam tutar düşer (iptal edilen tutar çıkarılır)

### G) Sağ Menü
1. **+ Ürün Ekle** sütunu (sağda)
2. Search "kahve" → ürünler filtrelenir
3. Bir ürüne tıkla → varyant varsa picker, yoksa direkt sepete
4. Sepette − + × kontrolleri
5. **+ Masaya Ekle** → kalem listesi (sol) anında güncellenir

### H) Mobile
1. Tarayıcıyı 800px genişlikte aç
2. ✅ 3 sütun yerine alt tab bar görünür
3. Tab'lara tıkla → görünürlük değişir
4. Tüm fonksiyonlar çalışır

## 💡 Backend Yeni Action'lar

### `cancelOrderItems`
```typescript
cancelOrderItems({
  itemIds: string[],
  reason?: string,
}): Promise<{ success, cancelledCount?, error? }>
```
- Kalem `status='cancelled'`
- Ödenmiş kalemler iptal edilemez
- Sipariş subtotal/total/complimentary_total güncellenir
- Multi-order destekli

### `closeOrderOnAccount`
```typescript
closeOrderOnAccount({
  orderId: string,
  cashierId: string,
  customerNote?: string,
}): Promise<{ success, error? }>
```
- `payment_logs`'a 'other' method ile kayıt
- Sipariş `payment_status='paid'`, `payment_method='other'`
- Note: "Açık hesap: {customerNote}"

## ⚠️ Sınırlamalar

- **Yetki sistemi yok** — herkes iptal/ikram/indirim yapabilir (sonra eklenebilir)
- **Açık hesap raporu yok** — sonra "cari hesap" sayfası eklenmeli
- **Atomik değil** — bazı çoklu işlemler frontend loop (yarıda kalsa tutarsızlık riski)
- **Stok geri iadesi yok** — iptal sadece order_items.status değiştirir

## 🗺️ Durum

| | |
|---|---|
| Hesap Panel A (iskelet) | ✅ |
| **Hesap Panel B (tam özellik)** | **✅ BU PAKET** |
| Yetki sistemi | 🔜 |
| Açık hesap raporu | 🔜 |
| Süper admin paneli | 🔜 |

Push → test → çalışırsa **"süper admin paneli"** veya başka iş söyle 🚀
