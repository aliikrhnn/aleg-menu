# 🔧 TS FIX — Cari Build Hatası

TypeScript build hatası — Supabase'den dönen `txs` tipi kısıtlı geliyor (sadece `id`).

**1 dosya.**

## 🐛 Hata

```
./lib/actions/customers.ts:252:11
Type error: Type '{ amount: number; order_info: ... }[]' is not assignable
to type 'CustomerTransaction[]'.
  ...is missing the following properties from type 'CustomerTransaction':
  business_id, customer_id, type, order_id, and 7 more.
```

## ✅ Düzeltme

Supabase JS client'ın schema infer'ı bazen kolonları doğru çıkaramıyor.
Type assertion ile force cast:

```typescript
const recentTransactions: CustomerTransaction[] = ((txs || []) as Array<
  Record<string, unknown> & {
    id: string;
    amount: number | string;
    order_id: string | null;
    cashier_id: string | null;
  }
>).map((t) => ({
  ...(t as unknown as CustomerTransaction),
  amount: Number(t.amount),
  order_info: t.order_id ? ordersMap.get(t.order_id) || null : null,
  cashier_name: t.cashier_id ? cashierMap.get(t.cashier_id) || null : null,
}));
```

`txs`'yi önce minimum gerekli alanlarla typed array'e cast ediyoruz, sonra
`...t` spread'ini `unknown as CustomerTransaction` ile zorluyoruz.

## 🚀 Push

```powershell
git add . && git commit -m "fix(ts): cari customer_transactions tip cast" && git push
```

## 💡 Bonus

Diğer warning'ler (push'u engellemiyor):
- `kasa-board.tsx` deps
- `receipt-preview.tsx` `<img>`
- `advanced-tab.tsx` deps
- `toast.tsx` ref cleanup

Bunlar warning, sonra ayrı paketle.
