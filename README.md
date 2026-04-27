# 🎯 HIZLI SATIŞ HESAPPANEL

Hızlı satış akışı tamamen HesapPanel'e geçti. **QuickSaleLanding ekranı kalır**
(yani "Yeni Satış" başlat butonu) — sadece tıklayınca eski composer yerine
**HesapPanel** açılır.

**3 dosya · Migration yok.**

## ✨ Yeni Akış

```
Kasa → Hızlı Satış sekmesi
  ↓
[QuickSaleLanding] - "Yeni Satış" butonu (KORUNDU ✅)
  ↓ tıkla
[HesapPanel - Hızlı Satış Modu]
  ├─ Sol: KALEMLER  (boş başlar)
  ├─ Orta: ÖDEME    (Nakit/Kart, indirim, parçalı)
  └─ Sağ: MENÜ      (kategoriler + ürünler)

→ Sağdan ürün tıkla → arka planda createManualOrder → kalem solda görünür
→ Birkaç ürün ekle → toplam güncellenir
→ Nakit/Kart seç → Öde → tamamlanır
```

## 🎨 Hızlı Satış Modunda HesapPanel

Eskisinden farklar:
- ✅ **Header**: "YENİ SATIŞ — Hızlı Satış" (eski: "HESAP AL — Masa X")
- ✅ **Alt yazı**: "TOPLAM" (eski: "MASA TOPLAM")
- ✅ **Açık Hesap butonu gizli** (`hideOnAccount`) — cari kullanıcı yok
- ✅ **Yöntem grid'i**: 2 sütun (Nakit + Kart) — 3 yerine
- ✅ **Empty state**: "🛒 Sağdaki menüden ürün ekleyin"
- ✅ **Mobile default tab**: Boşken otomatik "+ Ürün" sekmesinde başlar
- ✅ **Menü açık**: `hideMenu={false}` — hızlı satışta gerekli

## 🔧 Teknik Detaylar

### MenuPicker — `quickSale` prop
```typescript
quickSale?: boolean;  // true ise tableId yerine null kullanır
```

`createManualOrder({ tableId: null, orderType: 'pickup' })` ile masasız sipariş.

### onAdded callback signature
```typescript
onAdded: (newOrderId?: string) => void;
```
Yeni sipariş yaratıldığında `orderId` döner — kasa-board bunu state'e ekler.

### HesapPanel — `quickSale` prop
```typescript
quickSale?: boolean;  // tüm hızlı satış UI tweaks
```

### Kasa-board — Yeni state
```typescript
const [quickSaleOpen, setQuickSaleOpen] = useState(false);
const [quickSaleOrders, setQuickSaleOrders] = useState<TableOrderDetail[]>([]);
```

`autoPayOrder` state kaldırıldı — artık ilk başta HesapPanel açılıyor.

## 📦 Dosyalar (3)

```
components/order/menu-picker.tsx       🔄 quickSale prop + onAdded(newOrderId)
components/order/hesap-panel.tsx       🔄 quickSale UI mods
app/kasa/kasa-board.tsx               🔄 handleQuickSale → HesapPanel
```

## 🚀 Push

```powershell
Expand-Archive -Path hizli-satis-hesappanel.zip -DestinationPath . -Force

git add . && git commit -m "feat(kasa): hızlı satış HesapPanel akışı (composer kaldırıldı)" && git push
```

## 🧪 Test Senaryoları

### A) Boş Hızlı Satış Akışı
1. Kasa → "Hızlı Satış" sekme
2. **"Yeni Satış"** butonu (QuickSaleLanding) ✅ kalmış
3. Tıkla → ✅ HesapPanel açılır
   - Header: "YENİ SATIŞ — Hızlı Satış"
   - Sol: "🛒 Sağdaki menüden ürün ekleyin"
   - Orta: TOPLAM ₺0, Nakit/Kart yöntem (Açık Hes yok)
   - Sağ: Menü (kategoriler + ürünler)

### B) Ürün Ekleme
1. Sağdan kategori seç → ürün tıkla
2. ✅ Sağ alt cart'a düşer (sepet)
3. "Ekle" tıkla → arka planda `createManualOrder` çalışır
4. ✅ Sol "KALEMLER" listesinde ürün görünür
5. ✅ Orta "TOPLAM" güncellenir
6. ✅ Toast: "1 ürün eklendi"

### C) Birden Fazla Ürün
1. Aynı şekilde başka ürün ekle (varyantlı veya değil)
2. ✅ Aynı sipariş üzerinde birikiyor (yeni order yaratmıyor — addItemsToOrder)
3. Hayır, **şu anda her ekleme yeni bir order yaratabilir** ⚠️

### D) Ödeme
1. Birkaç ürün eklendi, toplam ₺X
2. Nakit veya Kart seç
3. "Öde" → ✅ ödeme alındı
4. ✅ Modal kapanır, listede sipariş görünür

### E) İndirim / İkram
1. Ürün(ler) ekle
2. "🏷 İndirim" → %10 ver
3. ✅ Toplam düşer
4. "★ İkram" (kalem seç) → ✅ kalem ikram olur

### F) Parçalı Ödeme
1. Birkaç ürün ekle (toplam ₺200)
2. "💸 Parçalı" → ₺100 nakit, ₺100 kart
3. ✅ İki ödeme kaydı oluşur

## ⚠️ Bilinen Davranış

Hızlı satışta her "Ekle" tıklaması **yeni bir order** yaratabilir (mevcut
açık order yoksa). Bu bilinçli — hızlı satışta her sepet ayrı bir satış.
Eğer aynı satış'a daha fazla ürün eklemek istersen MenuPicker zaten
`unpaidOrders[0]?.id` kullanıyor → ilk satış'a ekler.

Pratikte:
- 1. ürün → Order A yaratılır
- 2. ürün → Order A'ya eklenir (targetOrderId set)
- 3. ürün → Order A'ya eklenir
- Öde → Order A paid

## 🗺️ Durum

| | |
|---|---|
| Kasa Overhaul | ✅ |
| **Hızlı Satış HesapPanel** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 |

---

Push → test et → çalışırsa söyle 🚀
