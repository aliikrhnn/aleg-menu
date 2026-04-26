# 🚨 FULL SYNC — Tüm Güncel Dosyalar

Şu ana kadar tüm sohbette değiştirilen / eklenen **TÜM** dosyalar bu pakette.
Lokal kopyandaki eski sürüm sorunlarını **kalıcı olarak çözer**.

**28 dosya · 1 migration.**

## 🐛 Sorun

Önceki paketler `Expand-Archive` `-Force` flag'i olmadan çıkarıldığında
**eski dosyalar üzerine yazılmadı** → her push'ta başka bir lint/build hatası
çıktı:

1. `useEffect` unused → cash-session-modal.tsx
2. `PrintButton` unused → table-detail-modal.tsx
3. `businessName` Props yok → z-report-modal.tsx
4. `cancelOrderItems` export yok → tables-status.ts
5. `setFillColor` 4 arg → z-report-pdf.ts  ← bu seferki

Bu paket **bütün lokal dosyaları güncel sürümle değiştirir** → tek seferde tüm
sorunları çözer.

## 📦 İçerik (28 dosya + 1 migration)

### Backend / Actions
- `lib/actions/customers.ts` — Cari sistemi (3 paket)
- `lib/actions/payments.ts` — Z rapor cari entegrasyonu
- `lib/actions/tables-status.ts` — `cancelOrderItems` + `closeOrderOnAccount` zorunlu customerId

### Utility
- `lib/utils/z-report-pdf.ts` — Açık Hesap bölümü + source label, **`setFillColor` düzeltildi**

### Hooks (yeni)
- `lib/hooks/use-escape-key.ts` — Modal ESC

### UI Helpers (yeni)
- `components/ui/skeleton.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/spinner.tsx`
- `components/ui/index.ts`

### Order Components
- `components/order/hesap-panel.tsx` — HesapPanel B + ESC + tüm submodaller
- `components/order/menu-picker.tsx` — embedded picker + ESC
- `components/order/customer-picker.tsx` — açık hesap kullanıcı seçici

### Kasa
- `app/kasa/kasa-board.tsx` — flash bildirim + tab pulse
- `app/kasa/kasa-tabs.tsx` — flashing prop + animasyon
- `app/kasa/order-composer.tsx` — ESC
- `app/kasa/register-panel.tsx` — hasData cari aktivite dahil
- `app/kasa/table-detail-modal.tsx` — ESC + unpaidTotal + flat satır click
- `app/kasa/tables-grid.tsx` — Skeleton iskelet

### Menu (QR)
- `app/menu/[slug]/cart-drawer.tsx` — ESC

### Panel POS
- `app/panel/(shell)/pos/cash-session-modal.tsx` — ESC, `useEffect` import temiz
- `app/panel/(shell)/pos/orders-board.tsx` — Yeni Sipariş kolonu silindi + auto-confirm
- `app/panel/(shell)/pos/payment-modal.tsx` — ESC hook
- `app/panel/(shell)/pos/split-payment-modal.tsx` — ESC hook
- `app/panel/(shell)/pos/z-report-modal.tsx` — Açık Hesap bölümü + source badge

### Cari Hesaplar
- `app/panel/(shell)/cari-hesaplar/customer-detail-modal.tsx` — Filter + CSV + ESC
- `app/panel/(shell)/cari-hesaplar/customer-form-modal.tsx` — ESC
- `app/panel/(shell)/cari-hesaplar/customers-manager.tsx` — Skeleton

### Migration
- `supabase/migrations/0030_customers.sql` — customers tablosu

## 🚀 Push (KRİTİK — Force Şart!)

```powershell
# 1. Force ile extract
Expand-Archive -Path full-sync.zip -DestinationPath . -Force

# 2. Migration daha önce uygulandıysa atla, yoksa Supabase'e uygula
# (panel → SQL editor)

# 3. Commit + push
git add .
git commit -m "sync: tüm güncel dosyalar (cari + ux paket 1B + lint fix)"
git push
```

## ✅ Beklenen Sonuç

Push edince **build başarılı** olmalı. Geri kalan **6 warning** error değil:
- 4× `kasa-board.tsx` useEffect missing dep
- `receipt-preview.tsx` `<img>` öneri
- `advanced-tab.tsx` useEffect missing dep
- `toast.tsx` ref cleanup öneri

Bunlar sonra UX Paket 3'te toplu temizlenecek.

## 💡 İleride

Bundan sonra her paket için:

```powershell
Expand-Archive -Path PAKET.zip -DestinationPath . -Force
```

`-Force` **şart**. Yoksa eski dosyalar kalır, yine bu sorun döner.

## 🗺️ Durum

Bu paket'le tüm bekleyen değişiklikler senkron olur:
- ✅ Cari Paket 1, 2, 3
- ✅ Cari Manuel Paket A
- ✅ Z Raporu Tüm Modül
- ✅ Kasa Empty Fix
- ✅ Paket B (yeni sipariş + flash)
- ✅ UX Paket 1 (helpers)
- ✅ UX Paket 1B (yayma)
- ✅ Tüm lint fix'ler
