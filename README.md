# 🔧 LINT FIX — Cari + HesapPanel

Push'u engelleyen 2 error + 1 bonus warning fix.

**2 dosya.**

## ✅ Düzeltmeler

### `lib/actions/customers.ts` (Error)
```
178:9  Error: 'ordersMap' is never reassigned. Use 'const' instead.
243:9  Error: 'cashierMap' is never reassigned. Use 'const' instead.
```
- `let ordersMap` → `const ordersMap`
- `let cashierMap` → `const cashierMap`

(Map'in kendisi const, içine `.set()` ile eklemek const'a aykırı değil)

### `components/order/hesap-panel.tsx` (Warning)
```
315:6  Warning: useCallback has an unnecessary dependency: 'selectedTotal'
```
- `selectedTotal` dep kaldırıldı (zaten `selectedFlatItems`'tan türetilen değer)

## 🚀 Push

```powershell
git add . && git commit -m "fix(lint): cari const + hesap-panel dep" && git push
```

## ℹ️ Diğer Warning'ler

Bu paket kapsamında olmayanlar (eski uyarılar, push'u engellemez):
- `kasa-board.tsx` — playOrderSound/playCallSound deps (eskiden var)
- `receipt-preview.tsx` — `<img>` → `<Image>` (eskiden var)
- `advanced-tab.tsx` — loadData dep (eskiden var)
- `toast.tsx` — timersRef cleanup (eskiden var)

Bunlar warning, push'u engellemez. İstersen sonra ayrı paket halledebiliriz.
