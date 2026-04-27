# 🎯 KASA OVERHAUL — Bug Fix + Ödeme Akışı Birleşmesi + Tam Ekran

5 büyük iş tek pakette:

1. 🐛 **Bug Fix**: Açık hesaba yazınca masa otomatik boşalır
2. ⚡ **Hızlı Satış Ödeme**: Eski PaymentModal yerine HesapPanel
3. 💳 **Parsiyel Ödeme**: Eski Split/PaymentModal yerine HesapPanel preselect
4. 🖥️ **Desktop-First**: Kasa modal'ları mobil'de küçültmüyor (UX Paket 2 reverse)
5. ⛶ **Tam Ekran Butonu**: Kasa üst bar'a F11

**10 dosya · Migration yok.**

## ✨ Detaylar

### 1. 🐛 Bug Fix — Masa Otomatik Boşalır

**Önce:** Açık hesaba yazıldı → sipariş `paid` oldu ama **masa hâlâ açık** görünüyordu.

**Sonra:** `closeOrderOnAccount` artık `closeOrderAndMaybeFreeTable` helper'ını
çağırıyor → masada başka aktif sipariş yoksa `tables.status='available'`.

**Backend değişiklik:**
- `closeOrderAndMaybeFreeTable` artık **export** edilmiş (payments.ts'ten)
- `closeOrderOnAccount` sonunda çağırıyor + `revalidatePath`

### 2. ⚡ Hızlı Satış → HesapPanel

**Önce:** Hızlı satış sonrası eski `PaymentModal` açılıyordu (basit, sınırlı).

**Sonra:** Yeni `HesapPanel` açılıyor. Avantajları:
- ✅ Aynı görsel dil masalardakiyle
- ✅ İndirim, ikram, parçalı ödeme destekli
- ✅ `hideMenu={true}` → "+Ürün" sütunu yok (zaten satış tamamlandı)
- ✅ `hideOnAccount={true}` → Açık Hesap yok (cari kullanıcı yok)
- ✅ Yöntem grid'i 3 yerine 2 sütunlu (Nakit + Kart)

### 3. 💳 Parsiyel Ödeme → HesapPanel

**Önce:** Masa Detay → kalem seç → "Seçili Öde" → split + eski PaymentModal.

**Sonra:** Kalem seç → "Seçili Öde" → HesapPanel `initialSelectedItemIds` ile açılır.
Kalemler önceden seçili → kullanıcı orada parsiyel öder, indirim uygular, vs.

**HesapPanel yeni props:**
```typescript
hideMenu?: boolean;              // "+Ürün" sütunu gizle
hideOnAccount?: boolean;         // Açık Hesap butonu gizle
initialSelectedItemIds?: string[]; // "orderId__itemId" formatında preselect
```

### 4. 🖥️ Desktop-First Modal CSS

UX Paket 2'de `aleg-modal-mobile-fullscreen` çok agresifti — desktop'ta bile
küçültüyordu. Yeni `aleg-modal-desktop-first` utility:

```css
.aleg-modal-desktop-first {
  max-height: 95dvh;          /* Desktop: normal */
}
@media (max-width: 640px) {
  max-height: 92dvh;            /* Mobile: küçük ama agresif değil */
}
```

**Hangi modal'lar desktop-first oldu:**
- HesapPanel (kasa ana ödeme)
- CustomerPicker (açık hesap kullanıcı seçim)
- ZReportModal (Z raporu)
- CustomerFormModal (panel cari)
- CustomerDetailModal (panel cari)

**`aleg-modal-mobile-fullscreen` korundu:**
- Cart Drawer (QR menü müşteri)
- Menu Picker (QR varyant seçim)

### 5. ⛶ Tam Ekran Butonu

Kasa üst bar'a (PrinterStatusWidget yanında) yeni buton:
- ⛶ ikonu — tıklayınca tam ekran (`requestFullscreen`)
- Tam ekrandayken accent rengi
- ✕ ikonu — çıkarmak için (Escape veya butonla)
- `fullscreenchange` event'i state'i otomatik senkronize eder

Klavye kısayolu: F11 zaten browser'da çalışır, butondan da erişilir.

## 📦 Dosyalar (10)

```
lib/actions/payments.ts                            🔄 closeOrderAndMaybeFreeTable export
lib/actions/tables-status.ts                       🔄 closeOrderOnAccount fix + getOrderAsDetail
app/globals.css                                    🔄 aleg-modal-desktop-first utility
components/order/hesap-panel.tsx                   🔄 hideMenu/hideOnAccount/initialSelectedItemIds
components/order/customer-picker.tsx               🔄 desktop-first
app/kasa/kasa-board.tsx                           🔄 PaymentModal → HesapPanel + tam ekran btn
app/kasa/table-detail-modal.tsx                    🔄 parsiyel → HesapPanel preselect
app/panel/(shell)/pos/z-report-modal.tsx           🔄 desktop-first
app/panel/(shell)/cari-hesaplar/
  customer-form-modal.tsx                          🔄 desktop-first
  customer-detail-modal.tsx                        🔄 desktop-first
```

## 🚀 Push

```powershell
Expand-Archive -Path kasa-overhaul.zip -DestinationPath . -Force

git add .
git commit -m "feat(kasa): payment flow unification + table free fix + fullscreen + desktop-first"
git push
```

## 🧪 Test Senaryoları

### A) 🐛 Açık Hesap Bug Fix
1. Kasa → Boş masa → "Yeni Sipariş" → ürün ekle → "Sipariş Ver"
2. Masa **dolu** (kırmızı) gözükür
3. Aynı masaya tekrar gir → "Hesap Al" → 📒 Açık Hes → kullanıcı seç → "Yaz"
4. ✅ Toast: "Ahmet hesabına yazıldı"
5. Masaya bak: ✅ **BOŞ** (yeşil) gözüksün
6. Cari kullanıcı detayı: ✅ Borç olarak ekli

### B) ⚡ Hızlı Satış Yeni Akış
1. Kasa → "Hızlı Satış" tab
2. Bir kategori seç → ürünler tıkla → "Sepet Tamamla"
3. ✅ Eski PaymentModal yerine **HesapPanel** açılır
4. ✅ "Hızlı Satış" başlık
5. ✅ Sadece Nakit/Kart yöntem (Açık Hesap yok)
6. ✅ "+Ürün" sütunu yok
7. ✅ İndirim, ikram, parçalı çalışır
8. Nakit öde → ✅ tamamlanır

### C) 💳 Parsiyel Ödeme Yeni Akış
1. Masada 5 kalem var (toplam ₺250)
2. Hesap Al → 2 kalemi seç (toplam ₺80)
3. ✅ "Seçili Öde · ₺80" butonu görünür
4. Tıkla → ✅ HesapPanel açılır, **2 kalem önceden seçili**
5. Aşağı bak: "Parçalı Mod" aktif
6. Nakit öde → ✅ sadece o 2 kalem ödenir, geri kalan ₺170 açık kalır
7. ✅ Masa hâlâ dolu (kalan sipariş için)

### D) 🖥️ Desktop'ta Modal Boyutu
1. **1920×1080** ekranda kasaya gir
2. Hesap Al → ✅ Modal **eskisi gibi büyük** (1400px max-w, 95vh)
3. Eskiden mobile-fullscreen utility ile bile büyüktü ama **mobil-first** mantıkla
   bazı yerler agresifleşmişti — şimdi temiz

### E) ⛶ Tam Ekran
1. Kasa üst bar → printer ikonu yanında ⛶ butonu
2. Tıkla → ✅ tam ekran
3. Buton ikonu değişir → ✕ (çıkış) + accent rengi
4. F11 veya butona tıkla → ✅ çıkar

## 💡 Mantık Notları

### `closeOrderAndMaybeFreeTable` Helper
Tek bir yerden kontrol — bu masada başka açık sipariş var mı:
- `inProcess` (received/confirmed/preparing/ready/on_way)
- `deliveredUnpaid` (delivered ama paid değil)

İkisi de boşsa → `tables.status='available'`. Aksi halde başka sipariş var, masa açık kalır.

### HesapPanel'in Hızlı Satış'ta Davranışı
Hızlı satışta `tableId='__quick__'` placeholder. HesapPanel içindeki:
- `splitItemsFromMultipleOrders({targetTableId: '__quick__'})` parsiyel modda
- `addItemsToOrder` MenuPicker üstünden

İkisi de zaten `hideMenu` ve `hideOnAccount` ile gizlendiği için tetiklenmez.
Hızlı satışta sadece **ödeme + indirim + ikram** çalışır.

### Tam Ekran API
```typescript
document.documentElement.requestFullscreen();
document.exitFullscreen();
document.fullscreenElement; // null = normal, element = fullscreen
```

iOS Safari `requestFullscreen` desteklemiyor — try/catch ile sessizce yoksayar.

## 🗺️ Durum

| | |
|---|---|
| UX Paket 1+1B+1C | ✅ |
| UX Paket 2 (Mobile/Tablet) | ✅ |
| **Kasa Overhaul** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 Sıradaki |

## 🔮 Sonraki

UX Paket 3:
- 6 lint warning'i temizle
- 38 console.log temizle
- 44 setInterval optimize
- register-panel 3079 satır bölme

---

Push → tüm akışları test et → ne sorun varsa söyle 🚀
