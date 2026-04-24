# LINT FİX v2 — `_` PREFIX YETMEDİ, DESTRUCTURE KALDIR

Önceki lint-fix paketinde `_` prefix kullandım ama projenin ESLint config'i buna rağmen error veriyor. Tamamen destructure'dan çıkaralım.

**2 dosya.**

## 🐛 Sorun

ESLint `no-unused-vars` kuralı `_` prefix'i otomatik ignore etmiyor:

```
Error: '_discountReason' is defined but never used.
Error: '_businessName' is defined but never used.
Error: '_businessAddress' is defined but never used.
Error: '_businessLogoUrl' is defined but never used.
```

## ✅ Çözüm — Destructure'dan Tamamen Kaldır

Prop **interface**'de kalsın (TypeScript uyumu için), ama destructure'da **alma**:

### 1. `split-payment-modal.tsx`
```diff
  export function SplitPaymentModal({
    order,
    discountAmount,
-   discountReason: _discountReason,
    tipAmount,
    onClose,
    onAllPaid,
  }: Props) {
```

`Props` type'ındaki `discountReason` alanı **TypeScript seviyesinde** kalır — çağıran tarafın kodu bozulmaz. Sadece kullanılmadığı için extract edilmiyor.

### 2. `z-report-modal.tsx`
```diff
  export function ZReportModal({
    open,
    onClose,
-   businessName: _businessName,
-   businessAddress: _businessAddress,
-   businessLogoUrl: _businessLogoUrl,
  }: Props) {
```

Aynı mantık.

## 📦 Dosyalar (2)

```
app/panel/(shell)/pos/split-payment-modal.tsx
app/panel/(shell)/pos/z-report-modal.tsx
```

## 🚀 Kurulum

```powershell
# 2 dosyayı üstüne yaz
git add .
git commit -m "fix(lint): remove unused destructured props"
git push
```

## ⚠️ Uyarılar (Hata Değil)

Bunlar hâlâ warning gösterir ama **push'u bloklamaz**:

- `yazicilar/tabs/advanced-tab.tsx:19` — loadData missing dep
- `yazicilar/components/receipt-preview.tsx:178` — `<img>` → `<Image>` önerisi  
- `components/ui/toast.tsx:68` — timersRef cleanup

Bunlar ileride düzeltilebilir, şu an push geçecek.

## 🧪 Test

```powershell
npm run lint
```

Çıktıda sadece **warning**'ler kalacak (error yok). Push başarılı olur.

## 📍 Durum

| İş | Durum |
|---|---|
| Lint fix v1 | ⚠️ `_` prefix yetmedi |
| **Lint fix v2** | **✅ BU PAKET** |
| QR Menü Paket 1 push | 🔜 (lint geçer geçmez) |
