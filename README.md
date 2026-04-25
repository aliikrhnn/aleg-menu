# 🔧 GARSON TYPE FİX

```
Type error: Property 'unpaid_total' does not exist on type 'TableWithStatus'.
```

`TableWithStatus` tipinde `unpaid_total` yok — doğru alan adı `total_amount`.

**1 dosya.**

## ✅ Fix

```diff
- {table.unpaid_total != null && table.unpaid_total > 0 && (
+ {table.total_amount > 0 && (
    <div ...>
-     ₺{Math.round(table.unpaid_total)}
+     ₺{Math.round(table.total_amount)}
    </div>
  )}
```

## 📦 Dosya

```
app/garson/waiter-board.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(garson): TableWithStatus uses total_amount not unpaid_total" && git push
```
