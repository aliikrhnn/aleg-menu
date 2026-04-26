# 🎯 UX PAKET 1B — Yayma: ESC Tuşu + Skeleton

UX Paket 1'deki primitive'leri kasa & sipariş akışındaki **9 modal**'a ve
**2 listeye** uyguladık.

**11 dosya · Migration yok.** Yeni dependency yok (Paket 1'in helper'larını
kullanır).

> ⚠️ **Önce UX Paket 1 push'lanmalı** (helper'lar olmazsa import hatası).

## ✅ Yayma Detayı

### ESC Tuşu Eklenenler (9 modal)

| # | Modal | Detay |
|---|-------|-------|
| 1 | **`hesap-panel.tsx`** | Ana panel + 3 submodal (Discount, PartialPayment, CancelReason) |
| 2 | **`menu-picker.tsx`** | `ProductOptionsPicker` |
| 3 | **`order-composer.tsx`** | Hızlı satış komposeri |
| 4 | **`table-detail-modal.tsx`** | Masa detayı (iç modal'lar açıkken devre dışı) |
| 5 | **`payment-modal.tsx`** | Ödeme modalı (eski ESC handler değiştirildi) |
| 6 | **`split-payment-modal.tsx`** | Parçalı ödeme (eski ESC değiştirildi) |
| 7 | **`cash-session-modal.tsx`** | Kasa açma/kapama (eski ESC değiştirildi) |
| 8 | **`z-report-modal.tsx`** | Z raporu (eski ESC değiştirildi) |
| 9 | **`cart-drawer.tsx`** | QR menü sepeti (yeni eklendi) |

### Akıllı Devre Dışı Bırakma
Hepsi şu durumlarda ESC'yi devre dışı bırakır:
- 🔒 **`submitting` / `isPending`** → kazara kapanma yok
- 🔒 **İç modal açık** → üst modal kapanmasın (örn. PaymentModal split açıkken)
- 🔒 **Başarı ekranı** → cart-drawer'da `successOrderNo` varken
- 🔒 **Picker açık** → order-composer'da variant veya complimentary picker

### Skeleton Eklenenler (2 yer)

| # | Yer | Eski | Yeni |
|---|-----|------|------|
| 1 | **`tables-grid.tsx`** (Kasa Masalar) | "Masalar yükleniyor…" tek satır | 2 zone × 8 masa iskeleti grid |
| 2 | **`customers-manager.tsx`** (Cari Hesaplar) | "Yükleniyor…" tek satır | `Skeleton.List` 5 satır |

## 📦 Dosyalar (11)

```
components/order/hesap-panel.tsx                         (panel + 3 submodal)
components/order/menu-picker.tsx                         (ProductOptionsPicker)
app/kasa/order-composer.tsx                              (hızlı satış)
app/kasa/table-detail-modal.tsx                          (masa detayı)
app/kasa/tables-grid.tsx                                 (skeleton grid)
app/panel/(shell)/pos/payment-modal.tsx                  (eski ESC → hook)
app/panel/(shell)/pos/split-payment-modal.tsx            (eski ESC → hook)
app/panel/(shell)/pos/cash-session-modal.tsx             (eski ESC → hook)
app/panel/(shell)/pos/z-report-modal.tsx                 (eski ESC → hook)
app/menu/[slug]/cart-drawer.tsx                          (yeni ESC)
app/panel/(shell)/cari-hesaplar/customers-manager.tsx    (skeleton list)
```

## 🚀 Push

**ÖNCE Paket 1'i push et** (helper'lar olmadan import hatası):

```powershell
# Önce Paket 1
git add . && git commit -m "feat(ui): paket 1 helpers" && git push

# Sonra Paket 1B (bu)
git add . && git commit -m "feat(ux): paket 1B - esc + skeleton yayma" && git push
```

## 🧪 Test Senaryoları

### A) ESC ile Modal Kapama Tour
Sırayla aç ve **ESC** ile kapat:

1. **Cart Drawer (QR menü)**: müşteri sepeti açar → ESC → kapanır
2. **Hesap Paneli**: Hesap Al butonu → ESC → kapanır
3. **İndirim Modal**: Hesap → 🏷 İndirim → ESC → kapanır (ana panel açık kalır)
4. **Parçalı Ödeme**: Hesap → 💸 Parçalı → ESC → kapanır
5. **İptal Sebebi**: Hesap → 🚫 İptal → ESC → kapanır
6. **Müşteri Seçici**: Hesap → 📒 Açık Hes → ESC → kapanır
7. **Masa Detay**: Masaya tıkla → ESC → kapanır
8. **Order Composer**: Hızlı Satış → ESC → kapanır
9. **Variant Picker**: Komposerda varyantlı ürün seç → ESC → sadece picker kapanır
10. **Payment Modal**: Sipariş ödeme → ESC → kapanır
11. **Split Payment**: Ödeme → "Parçalı Ode" → ESC → split kapanır
12. **Cash Session**: Kasayı Aç/Kapat → ESC → kapanır
13. **Z Report**: Z Raporu → ESC → kapanır
14. **Product Options Picker**: Hesap → + Ürün → varyantlı seç → ESC → picker kapanır

### B) Submit Sırasında ESC Korumalı
1. Bir ödeme yap → "Ödeme Yapılıyor…" sırasında **ESC bas**
2. ✅ Modal **kapanmaz** (işlem korumalı)
3. İşlem bitince ESC çalışır

### C) Skeleton Yükleme
1. Cari Hesaplar sayfasını yenile
2. ✅ "Yükleniyor…" yerine **5 satır iskelet** (avatar + 2 satır + sağ tutar)
3. Veri gelince gerçek liste

4. Kasa → Masalar tab'ı yenile
5. ✅ "Masalar yükleniyor…" yerine **2 zone × 8 masa iskeleti grid**

### D) İç Modal Üst Modal'ı Kapatmaz
1. Masa Detay aç → 📒 Açık Hes (Customer Picker açıldı) → **ESC**
2. ✅ Sadece picker kapanır, masa detay açık kalır
3. Tekrar **ESC**
4. ✅ Masa detay kapanır

## 💡 Mantık

### `useEscapeKey(onClose, enabled)`

```typescript
useEscapeKey(onClose);                    // her zaman aktif
useEscapeKey(onClose, !submitting);       // submit hariç
useEscapeKey(onClose, open);              // sadece modal açıkken
useEscapeKey(onClose, !innerOpen);        // iç modal açıksa devre dışı
```

Birden fazla useEscapeKey aynı anda aktif olsa bile **`stopPropagation`**
sayesinde sadece **en son register edilen** çalışır → React'ın yönetim
kuralları gereği bu en içteki modal'dır → doğru davranış.

### Eski ESC Handler'ların Değiştirilmesi
4 modal'da zaten manuel `useEffect` + `keydown` listener vardı:
- `payment-modal.tsx`
- `split-payment-modal.tsx`
- `cash-session-modal.tsx`
- `z-report-modal.tsx`

Bunlar `useEscapeKey` hook'una migrate edildi → daha tutarlı + daha kısa.

## 🗺️ Durum

| | |
|---|---|
| UX Paket 1 (helpers) | ✅ |
| **UX Paket 1B (yayma)** | **✅ TESLİM** |
| UX Paket 2 (Mobile/Tablet) | 🔜 |
| UX Paket 3 (Kod kalitesi) | 🔜 |

## 🔮 Hâlâ Kalan Modal'lar (Düşük Öncelik)

Paket'e dahil edilmedi (nadir kullanılır, sonraki paketlerde):
- `qr-picker-modal.tsx` (panel)
- `ai-monogram-modal.tsx` (panel)
- `ai-slogan-modal.tsx` (panel)
- `product-image-crop-modal.tsx` (panel)
- `pos-topbar.tsx` (kasiyer değiştirme)
- `sync-panel.tsx` (offline sync)
- `preset-form-modal.tsx` (varyasyon)
- `attach-products-modal.tsx` (varyasyon)
- `cashier-manager.tsx` modal'ları
- `tables-manager.tsx` modal'ları
- `call-buttons-manager.tsx` modal'ları
- `day-summary-wizard.tsx` (gün sonu)
- `day-summary-preview.tsx` (gün sonu)
- `register-panel.tsx` modal'ları
- `kasa-board.tsx` modal'ları
- `menu-view.tsx` (QR menü iç modal'ları)
- `order-taking-modal.tsx`

Toplam yaklaşık 17+ modal kaldı. **UX Paket 1C** olarak yapılabilir.

---

Push → test → "1C" (kalan modal'lar) veya "2" (Mobile) veya "3" (Kod kalitesi)
söyle 🚀
