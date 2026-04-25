# 🛒 KASA — HIZLI ÜRÜN EKLE

Kasiyer hesap alırken müşteri ekstra bir şey isteyince — bardağı su, bir tatlı, vs. — modalı kapatmadan menü açıp anında ekleme.

**3 dosya · Migration yok.**

## 🐛 Eski Akış

```
Masaya tıkla → TableDetailModal açıldı
   ↓
Müşteri "1 su daha"
   ↓
Modal kapat → Sipariş Akışı tab'a geç → composer aç → ürün seç
   ↓
Geri dön → masaya tekrar tıkla → modal aç → hesap al
```

Yavaş, dikkat dağıtan, müşteri bekliyor.

## ✅ Yeni Akış

```
Masaya tıkla → TableDetailModal
   ↓
Header'da "+ Ürün Ekle" (turuncu accent buton)
   ↓
Tıkla → OrderTakingModal üstte açılır (HIZLI EKLE başlık)
   ↓
Ürün seç (varyant + option + not destekli)
   ↓
✓ Mutfağa Gönder → modal kapanır → siparişler refresh
   ↓
Hesap Al butonu güncel tutarla çalışır
```

## ✨ Özellikler

### Akıllı Mod Seçimi (Onaylanmış Plan B)
- **Açık (ödenmemiş) sipariş varsa** → `mode='addToOrder'` → mevcut hesaba eklenir
- **Açık sipariş yoksa** → `mode='new'` → yeni sipariş açar (otomatik fallback)

Sonuç: kasiyer her durumda **tek hesap** alır, kalemleri ayrı modal trafiği yapmaz.

### Modal Üstünde Modal
- TableDetailModal z-index 90, OrderTakingModal z-index 100
- Hesap alma akışı kesintiye uğramaz, sadece üstüne modal açılır
- Kapat → TableDetailModal güncel kalemlerle devam eder

### Header Subtitle Dinamik
- Mevcut siparişe ekleme: **"HIZLI EKLE"**
- Yeni sipariş: **"YENİ SİPARİŞ"**
- (Garson tarafında her zaman: **"YENİ SİPARİŞ"**)

### Paylaşılan Component
`OrderTakingModal` artık `app/garson/` değil `components/order/` altında — hem garson hem kasa kullanır:
- Tek codebase, tek varyant flow, tek option preset
- Bug fix bir yerden, herkes etkilenir
- Bakımı kolay

## 📦 Dosyalar (3)

```
components/order/order-taking-modal.tsx     (yeni paylaşılan, mode + targetOrderId props)
app/garson/waiter-board.tsx                 (import path güncellendi)
app/kasa/table-detail-modal.tsx             (+ Ürün Ekle butonu + render)
```

`app/garson/order-taking-modal.tsx` (eski) **silindi** — yeni paylaşılan path kullanılıyor.

## 🔧 OrderTakingModal API

```tsx
<OrderTakingModal
  table={tableObj}              // TableWithStatus
  cashierId={cashier.id}
  mode="addToOrder"             // 'new' | 'addToOrder'
  targetOrderId={openOrder.id}  // mode='addToOrder' için
  subtitle="HIZLI EKLE"         // header subtitle override
  onClose={() => setOpen(false)}
  onSuccess={() => refresh()}
/>
```

Backend mantığı:
- `mode='new'` → `createManualOrder({ tableId, items, sendToKitchen: true })`
- `mode='addToOrder'` → `addItemsToOrder({ orderId: targetOrderId, items, sendToKitchen: true })`

## 🚀 Push

```powershell
git add .
git commit -m "feat(kasa): hızlı ürün ekle - modal üstünde modal akışı"
git push
```

## 🧪 Test

### A) Kasa - Açık Masada Ekleme
1. Kasa → Masalar → bir **dolu** masaya tıkla
2. TableDetailModal açılır → ✅ header'da turuncu **"+ Ürün Ekle"** butonu
3. Tıkla → OrderTakingModal açılır → ✅ subtitle: **"HIZLI EKLE"**
4. Bir ürün seç (varyantlı bir kahve örnek)
5. Boyut "Orta" + Şeker "Az" seç
6. **+ Sepete Ekle** → sepete eklendi
7. **✓ Mutfağa Gönder** → toast: `Masa X · masaya eklendi`
8. ✅ Modal kapanır
9. ✅ TableDetailModal'daki kalem listesi yenilendi, yeni ürün görünür
10. Tutar güncellenmiş ✅
11. Hesap Al → PaymentModal güncel tutarla açılır ✅

### B) Garson - Hâlâ Çalışıyor mu?
1. Garson → Tüm Masalar → masaya tıkla
2. ✅ OrderTakingModal açılır → subtitle: **"YENİ SİPARİŞ"**
3. Sepet + Mutfağa Gönder → toast: `Masa X · sipariş gönderildi`
4. Garson "Siparişler" sekmesinde yeni sipariş görünür ✅

### C) Edge Case - Tüm Siparişler Ödenmiş
1. Hesap alındıktan sonra modal hâlâ açıkken **+ Ürün Ekle**
2. ✅ Açık sipariş yok → `mode='new'` → subtitle: **"YENİ SİPARİŞ"**
3. Yeni bir sipariş açılır (mevcut paid olanlara dokunulmaz)

### D) Mutfak Tarafı
1. Hızlı eklenen ürün mutfak ekranında görünür ✅
2. Mevcut sipariş'e eklenen kalem ayrı satır gibi görünür (eklenme zamanıyla)

## 💡 Mimari

### Tek Paylaşılan Modal
```
┌─────────────────────────────────────┐
│   components/order/                 │
│     order-taking-modal.tsx          │
│   ↑              ↑                  │
│   import         import             │
│   from kasa      from garson        │
└─────────────────────────────────────┘
```

İleride mutfak/admin tarafında "ürün ekle" gerekirse aynı modal kullanılır — tek koddan üç+ ekran.

### Backend Mantığı
| Mode | Action | Sonuç |
|------|--------|-------|
| `new` | `createManualOrder` | Yeni order kaydı, status='confirmed' |
| `addToOrder` | `addItemsToOrder` | Mevcut order'a kalem eklenir, status korunur |

İkisi de `sendToKitchen: true` → mutfağa basılır.

### Modal Stack Z-Index
- Backdrop overlay: 50
- Layout sticky header: 30
- TableDetailModal: 90
- OrderTakingModal: 100
- ProductOptionsPicker (modal içi): 110
- Toast: 200+

## 🗺️ Durum

| | |
|---|---|
| Paylaşılan masa tasarımı | ✅ |
| **Kasa hızlı ürün ekle** | **✅ BU PAKET** |
| Backend enrichment (waiter+category) | 🔜 |
| Süper admin paneli | 🔜 |

## 🔮 Sonra

- **Açık masaya garson tarafından da ekleme** — şu an garson her zaman yeni sipariş açar; kasa pattern'i garsona da getirilebilir
- **Ürün ekleme + ödeme tek akışta** — eklenen kalemler direkt seçili payment'a yansır
- **Geçmiş hızlı ekleme** — son 5 hızlı ekleme öneri olarak
- **Backend enrichment** — masa kartlarında garson + son kategori

Push → test → çalışırsa "**masa enrichment**" veya **"süper admin paneli"** söyle 🚀
