# 🔧 BUILD FIX — `fmt` Cannot Find Name

TypeScript build hatası çözüldü.

## 🐛 Hata

```
./app/kasa/table-detail-modal.tsx:356:26
Type error: Cannot find name 'fmt'.
```

## 🧠 Neden

Eski paketlerden gelen `fmt` (para formatlama) helper'ı sadece dosya sonundaki `FlatItemRow` component içinde tanımlıydı. Ana `TableDetailModal` fonksiyonu da `fmt` kullanıyordu (7 yerde), ama scope dışındaydı.

## ✅ Çözüm

`fmt` helper'ı **module-level**'a taşındı (dosya başında, import'lardan sonra):

```typescript
import { OrderTakingModal } from '@/components/order/order-taking-modal';
import { HesapPanel } from '@/components/order/hesap-panel';

const fmt = (n: number) =>
  `₺${Math.round(n).toLocaleString('tr-TR')}`;

type Props = { ... };
```

`FlatItemRow` içindeki duplicate tanım silindi.

## 📦 Dosya (1)

```
app/kasa/table-detail-modal.tsx
```

## 🚀 Push

```powershell
npm run build  # ✅ başarılı
git add .
git commit -m "fix(build): fmt helper module-level"
git push       # ✅ pre-push geçer
```

Push ✓
