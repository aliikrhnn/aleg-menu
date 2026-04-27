# 🎯 UX PAKET 1C — Kalan Modal'lara ESC Yayma

UX Paket 1B'den sonra kalan **15 modal**'a ESC tuşu desteği.

**15 dosya · Migration yok.** Yeni dependency yok (Paket 1 helper'larını kullanır).

## ✅ Yayma Detayı (15 modal)

### Order
| # | Modal | Devre Dışı Koşul |
|---|-------|-----------------|
| 1 | `order-taking-modal.tsx` (sipariş alma) | submitting |

### Panel
| # | Modal | Devre Dışı Koşul |
|---|-------|-----------------|
| 2 | `call-buttons-manager.tsx` (ButtonForm) | pending |
| 3 | `cashier-manager.tsx` (CashierFormModal) | pending |
| 4 | `cashier-manager.tsx` (ChangePinModal) | pending |
| 5 | `tables-manager.tsx` (Modal wrapper → tüm submodaller) | her zaman aktif |
| 6 | `preset-form-modal.tsx` (varyasyon) | saving |
| 7 | `attach-products-modal.tsx` (varyasyon) | saving |

### POS
| # | Modal | Devre Dışı Koşul |
|---|-------|-----------------|
| 8 | `sync-panel.tsx` (eski ESC → hook) | open |
| 9 | `pos-topbar.tsx` (DevMenu dropdown) | showDevMenu |

### AI / Image
| # | Modal | Devre Dışı Koşul |
|---|-------|-----------------|
| 10 | `ai-monogram-modal.tsx` | loading |
| 11 | `ai-slogan-modal.tsx` | loading |
| 12 | `product-image-crop-modal.tsx` | loading |
| 13 | `qr-picker-modal.tsx` | busy (PDF üretimi) |

### Kasa & QR Menu
| # | Modal | Devre Dışı Koşul |
|---|-------|-----------------|
| 14 | `day-summary-preview.tsx` (eski ESC → hook) | open |
| 15 | `day-summary-wizard.tsx` (eski ESC → hook, handleCloseAttempt çağırır) | open |
| 16 | `menu-view.tsx` (Çağrı Sheet) | callingButtonId |
| 17 | `menu-view.tsx` (OptionPickerModal) | her zaman aktif |

## 🚀 Push

> ⚠️ UX Paket 1 (helpers) önce push edilmiş olmalı. Paket 1B push'undan sonra
> bu paket gelir.

```powershell
Expand-Archive -Path ux-paket-1C.zip -DestinationPath . -Force

git add .
git commit -m "feat(ux): paket 1C - kalan 15 modal'a esc yayma"
git push
```

## 🧪 Test Senaryoları

### A) Panel Modal'ları
1. **Çağrı Butonları** → + Yeni → ESC → ✅ kapanır
2. **Kasiyerler** → + Yeni Kasiyer → ESC → ✅ kapanır
3. **Kasiyer detay** → "PIN Değiştir" → ESC → ✅ kapanır
4. **Masalar** → + Yeni Masa → ESC → ✅ (tüm modal'larda aynı çalışır - wrapper)
5. **Varyasyonlar** → + Yeni Preset → ESC → ✅ kapanır
6. **Bir preset** → "Ürünleri Bağla" → ESC → ✅ kapanır

### B) AI Modal'ları
1. **İşletme** → "AI Logo Üret" → ESC → ✅ kapanır
2. **AI Slogan** → ESC → ✅ kapanır
3. Üretim sırasında ESC bas → ✅ engellenir

### C) Diğerleri
1. **Ürün resim yükleme** → kırpma modal → ESC → ✅ kapanır
2. **Masalar → QR Yazdır** → QR Picker → ESC → ✅ kapanır (PDF üretim sırasında engellenir)
3. **Kasa → Sync** → ESC → ✅ kapanır
4. **Kasa POS → Top bar ⋯** → DevMenu açıkken ESC → ✅ kapanır
5. **Hızlı Satış / Sipariş Alma** → ESC → ✅ kapanır
6. **Kasa → Gün Sonu Wizard** → ESC → ✅ confirm dialog gösterir (handleCloseAttempt)
7. **Gün Sonu Önizleme** → ESC → ✅ kapanır

### D) QR Menü (Müşteri tarafı)
1. **Çağrı butonu** (✋) → Service Sheet açılır → ESC → ✅ kapanır
2. Çağrı gönderme sırasında ESC → ✅ engellenir
3. **Varyantlı ürün** → + butonu → OptionPicker → ESC → ✅ kapanır

## 💡 Kapsam Bilançosu

| | |
|---|---|
| Paket 1B'de yapılan | 9 modal |
| **Bu pakette yapılan** | **15 modal** |
| **Toplam ESC destekli** | **24 modal** |

Aleg projesindeki **TÜM modal'larda** artık ESC çalışıyor 🎯

### Kapsanmayan
- `confirm-dialog.tsx` zaten ESC desteğine sahipti (Paket 1B'de fark edildi)
- `kasa-board.tsx` ve `register-panel.tsx` içindeki dropdown/popover'lar — bunlar
  modal değil, click-outside ile kapanır

## 🗺️ Durum

| | |
|---|---|
| UX Paket 1 (helpers) | ✅ |
| UX Paket 1B (yayma) | ✅ |
| **UX Paket 1C (kalan modal'lar)** | **✅ TESLİM** |
| UX Paket 2 (Mobile/Tablet) | 🔜 Sıradaki |
| UX Paket 3 (Kod kalitesi) | 🔜 |

---

Push → test → çalışırsa **UX Paket 2 (Mobile/Tablet)** başla 🚀
