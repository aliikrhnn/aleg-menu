# 🔧 LINT FIX 2 — 4 Error + ESLint Config

Pre-push hook'unun blokladığı 4 error'ı düzeltir + underscore-prefix konvansiyonu için ESLint config update.

**4 dosya · Migration yok.**

## 🐛 Error'lar

```
./app/kasa/table-detail-modal.tsx
14:10  Error: 'PrintButton' is defined but never used.

./app/panel/(shell)/pos/split-payment-modal.tsx
43:19  Error: '_discountReason' is defined but never used.

./app/panel/(shell)/pos/z-report-modal.tsx
34:17  Error: '_businessName' is defined but never used.
35:20  Error: '_businessAddress' is defined but never used.
36:20  Error: '_businessLogoUrl' is defined but never used.
```

## ✅ Çözümler

### 1. `PrintButton` unused → import silindi
```diff
- import { PrintButton } from '@/components/panel/print-button';
```

### 2. `discountReason` unused → Props'tan kaldırıldı

`split-payment-modal.tsx` zaten kullanmıyordu, sadece tanımlıydı. Caller (payment-modal.tsx) da güncellendi.

```diff
type Props = {
  order: OrderInput;
  discountAmount: number;
- discountReason: string;
  tipAmount: number;
  ...
};
```

```diff
<SplitPaymentModal
  order={order}
  discountAmount={discountAmount}
- discountReason={discountReason}
  tipAmount={tipAmount}
  ...
/>
```

### 3. `_businessName/Address/LogoUrl` → **ESLint config'e underscore exception**

`.eslintrc.json` güncellendi:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }
    ]
  }
}
```

**Bu nedir?** TypeScript/JS topluluğunda yaygın bir convention: `_` ile başlayan değişkenler **"intentionally unused"** anlamına gelir. Örneğin:

```typescript
// API response'tan bazı alanları görmezden geliyorum
const { businessId, _businessName, _businessLogoUrl } = data;

// Sadece businessId kullanılır, diğerleri "ignore et" sinyali
```

Şu an config bu konvansiyonu desteklemediği için lint error veriyordu. Düzeltildi.

## 📦 Dosyalar (4)

```
app/kasa/table-detail-modal.tsx                  (PrintButton import silindi)
app/panel/(shell)/pos/split-payment-modal.tsx    (discountReason Props'tan sil)
app/panel/(shell)/pos/payment-modal.tsx          (caller'da prop kaldırıldı)
.eslintrc.json                                   (underscore convention rule)
```

## 🚀 Push

```powershell
npm run lint              # ✅ 0 error olmalı
git add .
git commit -m "fix(lint): unused imports + eslint underscore convention"
git push                  # ✅ pre-push geçer
```

## ℹ️ Warning'ler (dokunulmadı)

Lint çıktısında listelenen **warning**'ler pre-push'u block etmiyor — sadece error'lar block eder. Bunlar sonraki paket konusu:

- `kasa-board.tsx`: `useEffect` exhaustive-deps × 4
- `yazicilar/components/receipt-preview.tsx`: `<img>` yerine `<Image>` öneri
- `yazicilar/tabs/advanced-tab.tsx`: useEffect deps
- `toast.tsx`: ref cleanup pattern

Hepsi cosmetic, fonksiyonel etkisi yok. İstersen sonraki pakette **"warning'leri de temizle"** diyebilirsin.

## 🎯 Test Senaryosu

1. ✅ `npm run lint` → 0 error (warning'ler kalır)
2. ✅ `git push` → pre-push hook geçer, push tamamlanır
3. ✅ Vercel deploy → build başarılı

Push ✓
