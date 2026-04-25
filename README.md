# 🧾 HESAP PANELİ — İSKELET (Paket A)

Yan panel layout (C3) — masa hesabı sürekli yan tarafta, ödeme paneli yanında. Mevcut PaymentModal yerine **dedikli HesapPanel** kullanılır.

**2 dosya · Migration yok · Mevcut `takePayment` + `splitItemsFromMultipleOrders` action'larını kullanır.**

> **Bu paket A** — sol kalemler + orta ödeme. Sağ menü tab'ı + mobile responsive **Paket B**'de.

## 🎨 Layout

```
┌──────────────────────────────────────────────────────────────┐
│ HESAP AL · Masa B5                  MASA TOPLAM ₺630   [✕] │
├──────────────────────────────────┬───────────────────────────┤
│ KALEMLER (sol — esnek)           │ ÖDEME (orta — 340px)      │
│                                  │                           │
│ ☐ 8 kalem        × TEMİZLE      │ TÜM MASA ÖDEMESİ          │
│                                  │                           │
│ ☐ 2× Latte (Büyük) YENİ  ₺120   │ ┌─────────────────────┐  │
│ ☐ 1× Cheesecake    HAZIR  ₺95   │ │ ÖDENECEK TUTAR      │  │
│ ☐ 3× Espresso      ONAY  ₺180   │ │ ₺630                │  │
│ ☐ 1× Tiramisu      YENİ   ₺85   │ └─────────────────────┘  │
│ ☐ 1× Pizza      HAZIRLANIYOR ₺110│                          │
│ ☐ 2× Çay         ✓ ÖDENDİ  ₺40 │ YÖNTEM                    │
│                                  │ [💵 Nakit] [💳 Kart]      │
│                                  │ [↗ Havale] [📱 Online]   │
│                                  │                           │
│                                  │ ─────────────────────     │
│                                  │ [Tüm Masayı Öde · ₺630]  │
│                                  │ Tüm açık siparişler...   │
└──────────────────────────────────┴───────────────────────────┘
```

## 🎯 İki Mod

### Mod 1: Tüm Masa Ödemesi (default)
- Hiçbir kalem seçili değil
- Buton: **"Tüm Masayı Öde · ₺630"**
- Davranış: tüm ödenmemiş siparişler için sırayla `takePayment` çağrılır
- Tek seferde tüm masa kapatılır → modal otomatik kapanır

### Mod 2: Seçili Ödeme (parsiyel)
- 1+ kalem seçili
- Sol footer: **"★ Seçili Kalemleri İkram Et"** butonu
- Orta buton: **"Seçili Öde · ₺215"**
- Davranış: 
  1. `splitItemsFromMultipleOrders` ile kalemler aynı masada yeni siparişe ayrılır
  2. Yeni sipariş için `takePayment` çağrılır
  3. Kalemler ödendi olarak işaretlenir, kalan kalemler bağımsız kalır

## ✨ Özellikler

### Dinamik Üst Bar
- Mod göstergesi (TÜM MASA / SEÇİLİ N KALEM)
- Tutar gerçek zamanlı değişir (seçim sayısına göre)

### 4 Ödeme Yöntemi
- 💵 Nakit
- 💳 Kart  
- ↗ Havale (transfer)
- 📱 Online

Seçili olan accent border + accent renk.

### Kalem Listesi
- Aynı flat liste TableDetailModal'daki gibi
- Status rozetleri (YENİ/ONAY/HAZIRLANIYOR/HAZIR/TESLİM/İPTAL)
- ✓ ÖDENDİ rozeti (paid kalemler, opacity düşük)
- ★ İKRAM rozeti (line-through fiyat)
- Müşteri notu italic
- Checkbox sadece ödenmemiş kalemlerde

### Toplu İkram
- Sol alt sticky footer'da görünür (sadece seçim varsa)
- "★ Seçili Kalemleri İkram Et"
- OrderId bazında grupla → her sipariş için ayrı `makeItemsComplimentary`

### Tüm Masa Ödendiğinde
- Buton "Tüm Masa Ödendi ✓" disabled
- Otomatik 600ms delay sonra panel kapanır

## 🔧 Akış

```
TableDetailModal (mevcut, küçük modal)
   ↓
[ Hesap Al · ₺630 ] butonuna bas
   ↓
HesapPanel açılır (büyük yan panel, üstte z-index 95)
   ↓
Default: "Tüm Masayı Öde" butonu hazır
   veya
Kullanıcı kalem seçer → "Seçili Öde" moduna geçer
   ↓
Yöntem seç → Öde
   ↓
Confirm dialog → Onayla → İşlem
   ↓
Toast → siparişler refresh → 
   - Tüm masa ödendiyse panel kapanır
   - Parsiyel ise panelde kalır, kalemler ödendi olarak güncellenir
```

## 📦 Dosyalar (2)

```
components/order/hesap-panel.tsx      (yeni - 750 satır, paylaşılan)
app/kasa/table-detail-modal.tsx       (Hesap Al → HesapPanel açılır)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(kasa): hesap paneli iskelet (yan panel C3 layout - sol kalemler + orta ödeme)"
git push
```

## 🧪 Test

### A) Tüm Masa Ödemesi
1. 3 farklı siparişi olan masaya tıkla
2. **Hesap Al · ₺630** butonuna bas → ✅ HesapPanel açılır
3. Sol: tüm kalemler liste halinde
4. Orta: "TÜM MASA ÖDEMESİ" mod, tutar ₺630
5. Yöntem **Kart** seç → ✅ butonun active state'i
6. **"Tüm Masayı Öde · ₺630"** bas
7. Confirm → onayla
8. ✅ Toast: "3 sipariş ödendi · ₺630"
9. ✅ Panel kapanır (600ms delay)
10. TableDetailModal'a geri dönmüş, tüm kalemler ✓ ÖDENDİ ✅

### B) Parsiyel Ödeme
1. Hesap Al → HesapPanel
2. 2 kalem seç (₺215 toplam)
3. ✅ Mod değişir: "SEÇİLİ ÖDEME · 2 KALEM"
4. ✅ Tutar ₺215'e düşer
5. ✅ Sol alt: "★ Seçili Kalemleri İkram Et" görünür
6. ✅ Orta buton: "Seçili Öde · ₺215"
7. Yöntem Nakit seç → **Seçili Öde**
8. Confirm → onayla
9. ✅ Toast: "₺215 ödendi"
10. Seçili kalemler ✓ ÖDENDİ rozeti aldı
11. Kalan kalemler bağımsız, başka seçim yapılabilir

### C) Toplu İkram
1. Hesap Al → 3 kalem seç
2. **★ Seçili Kalemleri İkram Et**
3. Confirm → onayla
4. ✅ Toast: "3 kalem ikram edildi"
5. ✅ Kalemler ★ İKRAM rozeti, line-through fiyat
6. Selection temizlenir
7. Toplam düştü ✅

### D) Yöntem Değiştirme
1. Cash → Card → Online tıkla
2. ✅ Active border + renk değişiyor
3. Confirm dialog'da "Yöntem: Kart" gösterilir

### E) Ödeme Sırası Hata
1. Bir sipariş ödenmiş ama frontend bilmiyor (eski state)
2. **Tüm Masayı Öde** → kısmi başarı
3. Toast: "Bazı ödemeler başarısız: #42: zaten ödenmiş"
4. Panel açık kalır, refresh yapılır

### F) Kapatma
1. HesapPanel açıkken backdrop'a tıkla → ✅ kapanır
2. ✕ butonu → ✅ kapanır
3. İşlem sırasında (submitting) backdrop tıklanırsa → ✅ kapanmaz

## 💡 Mimari

### Backend Strateji (Loop)
Şu an `takePayment` tek sipariş ödüyor. Çoklu sipariş için **frontend loop**:

```typescript
for (const o of unpaidOrders) {
  const r = await takePayment({ orderId: o.id, ... });
}
```

**Sınırlamalar:**
- Atomik değil — bir başarısız olursa diğerleri ödenmiş olabilir
- Network hatası → tutarsızlık riski

**Sonra**: backend'de `payTableAllOrders` action yazılabilir (tek transaction).

### Parsiyel Ödeme Akışı
1. `splitItemsFromMultipleOrders({ itemIds, targetTableId: tableId, cashierId })`
   - Aynı masada **yeni sipariş** yarat
   - Seçili kalemleri yeni siparişe taşı
   - Eski siparişlerin total'ı düşer
2. `takePayment({ orderId: newOrderId, amount: selectedTotal, paymentMethod })`
   - Yeni sipariş ödenir
3. Refresh → ödenen kalemler ✓ ÖDENDİ rozeti

### Layout Sistemi
- **Sol** (`flex-1`) → kalem listesi, esnek genişlik
- **Orta** (`width: 340px`) → sabit ödeme paneli
- **Sağ** (Paket B'de) → menü tab'ı

Mobile için tab bazlı sistem Paket B'de (`<768px`).

### State Management
- **selectedItems**: `Set<string>` (`orderId__itemId` keyleri)
- **paymentMethod**: `PaymentMethod` enum
- **submitting**: işlem sürerken UI lock

## ⚠️ Bilinen Sınırlamalar

1. **Mobile yok** — şu an sadece desktop layout. Mobile'da sıkışık görünür → Paket B
2. **Sağ menü tab YOK** — kasiyer ekstra ürün eklemek için TableDetailModal'a dönmeli (Quick Add ile)
3. **Para üstü hesabı YOK** — sadece direkt ödeme. Mevcut PaymentModal'daki "verilen / üstü" akışı şu an yok
4. **İndirim/Bahşiş YOK** — temel akış. Sonra eklenebilir
5. **Kısmi ödemeler atomik değil** — loop bazlı (yukarıda detay)

## 🗺️ Durum

| | |
|---|---|
| Garson sipariş alma + varyant | ✅ |
| Paylaşılan masa tasarımı | ✅ |
| Kasa hızlı ürün ekle | ✅ |
| Kasa flat list + bulk actions | ✅ |
| **HesapPanel iskelet (sol+orta)** | **✅ BU PAKET** |
| HesapPanel sağ menü tab + mobile | 🔜 Paket B |
| Backend `payTableAllOrders` (atomik) | 🔜 |
| İndirim/bahşiş/para üstü | 🔜 |
| Süper admin paneli | 🔜 |

## 🔮 Sonraki Paket — HesapPanel B

- 🍽 **Sağ menü tab** — embedded OrderTakingModal (search + kategori + grid)
- 🛒 **Sepet** sticky bottom + **+ Masaya Ekle** butonu
- 📱 **Mobile responsive** — tab bazlı `[Kalemler] [Ödeme] [+ Ürün]`
- ⌨️ **Keyboard shortcuts** — Ctrl+A (tümünü seç), Esc (kapat), Enter (öde)

Push → test → çalışırsa **"hesap panel B (sağ menü)"** veya başka iş söyle 🚀
