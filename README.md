# 🔧 LINT FIX — Push Hatası

UX Paket 1B push'unda lint **error** çıktı:

```
./app/panel/(shell)/pos/cash-session-modal.tsx
3:35  Error: 'useEffect' is defined but never used
```

## Sebep
Paket 1B'de `useEffect` ile yazılmış eski ESC handler kaldırıldı, ama
`useEffect` import'u temizlenmedi.

## Çözüm
1 dosya, 1 satır değişiklik:

```typescript
- import { useState, useTransition, useEffect } from 'react';
+ import { useState, useTransition } from 'react';
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(lint): unused useEffect import in cash-session-modal" && git push
```

## Diğer Warning'ler

Geri kalan 6 warning **error değil**, push'u engellemiyor:
- `kasa-board.tsx` — useEffect missing dep (4 yer, eski kod)
- `receipt-preview.tsx` — `<img>` yerine `<Image />` öneri
- `advanced-tab.tsx` — useEffect missing dep
- `toast.tsx` — ref cleanup uyarısı

İstersen bunları **UX Paket 3 (Kod Kalitesi)** için saklarız, hepsini birden
düzeltiriz.
