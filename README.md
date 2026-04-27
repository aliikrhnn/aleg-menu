# 🔧 HIZLI SATIŞ FIX — Header + Parsiyel Ödeme Bug

İki sorun çözüldü:

## 🐛 Sorun 1 — Header "Masa Hızlı Satış" Yazıyordu

**Önce:** `Masa Hızlı Satış` (yanlış görünüm)
**Sonra:** Sadece `Hızlı Satış` (quickSale modu için temiz başlık)

Bu önceki "Hızlı Satış HesapPanel" paketinde zaten kodda vardı ama
push edilmemiş olabilir — bu paket'te dahil.

## 🐛 Sorun 2 — Parsiyel Ödeme "Hedef masa bulunamadı"

**Önce:** Hızlı satışta kalem seçip "Seçili Öde" → backend
`splitItemsFromMultipleOrders({ targetTableId: '__quick__' })` çağırıyordu
→ "__quick__" UUID değil → "Hedef masa bulunamadı" hatası.

**Sonra:** Backend `targetTableId: string | null` destekliyor.
Frontend hızlı satışta `null` geçiyor → masasız split sipariş yaratılır.

## ✅ Değişiklikler

### Backend (`lib/actions/tables-status.ts`)
- `splitItemsFromMultipleOrders`: `targetTableId: string | null` desteklendi
  - Null ise hedef masa kontrolü atlanır
  - Null ise yeni siparişin `table_id` null kalır (masasız)
  - Null ise tables.update çağrısı yapılmaz

### Frontend (`components/order/hesap-panel.tsx`)
- 4 yerde `splitItemsFromMultipleOrders` çağrısı: `targetTableId: quickSale ? null : tableId`
- Header zaten `quickSale ? 'YENİ SATIŞ — Hızlı Satış' : 'HESAP AL — Masa X'`

### MenuPicker (zaten önceki pakette var)
- `quickSale` prop ile `createManualOrder({ tableId: null })`

## 📦 Dosyalar (4)

```
lib/actions/tables-status.ts          🔄 splitItemsFromMultipleOrders null support
components/order/hesap-panel.tsx      🔄 4 yerde quickSale ? null check
components/order/menu-picker.tsx      📋 (önceki paketten - tutarlılık için)
app/kasa/kasa-board.tsx              📋 (önceki paketten - tutarlılık için)
```

## 🚀 Push

```powershell
Expand-Archive -Path hizli-satis-fix.zip -DestinationPath . -Force

git add . && git commit -m "fix(kasa): hızlı satış parsiyel ödeme + header" && git push
```

## 🧪 Test Senaryoları

### A) Header
1. Kasa → Hızlı Satış → "Yeni Satış"
2. ✅ Üst başlık: "YENİ SATIŞ — _Hızlı Satış_" (Masa prefix YOK)
3. ✅ Alt yazı: "TOPLAM" (MASA TOPLAM YOK)

### B) Parsiyel Ödeme (Bug Fix)
1. Hızlı satış aç → 2-3 ürün ekle (toplam ₺245)
2. 1 kalem seç (₺115)
3. ✅ "SEÇİLİ ÖDEME · 1 KALEM" görünür
4. **"Seçili Öde · ₺115"** tıkla
5. **Onay**: "Ayır ve Öde"
6. ✅ Toast: "₺115 ödendi" (eski: "Hedef masa bulunamadı" hatası)
7. ✅ O kalem listede ödendi olarak işaretlenir
8. Geri kalan ₺130 ödenmemiş kalır → tekrar parsiyel olabilir

### C) Tüm Ödeme
1. Aynı satış'ta tüm kalemleri öde (Nakit/Kart)
2. ✅ Sipariş kapanır

## 💡 Mantık

### Backend `splitItemsFromMultipleOrders` Yeni Davranış

```typescript
// Önce
targetTableId: string  // mutlaka geçerli UUID

// Sonra
targetTableId: string | null  // null = masasız sipariş yaratır
```

Hızlı satışta kullanıcı kalemler seçtiğinde **arka planda** yeni bir
`table_id: null` order yaratılır. Bu yeni order ödenir, kaynak order'da
kalanlar için kullanıcı devam edebilir.

### `__quick__` Placeholder Artık Sorun Değil

Frontend'de `tableId='__quick__'` HesapPanel için sadece **görsel/UI** placeholder
(MenuPicker ve UI tarafından kullanılır). Backend'e gönderilmiyor — `quickSale`
flag'i ile bypass ediliyor.

## 🗺️ Durum

| | |
|---|---|
| Hızlı Satış HesapPanel | ✅ |
| **Header + Parsiyel Fix** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 |

---

Push → test et → çalışırsa söyle 🚀
