# 🔧 CARİ HESAPLAR — MIGRATION FIX

Önceki paket 1'deki migration ve action hatalarını düzeltir.

**2 dosya · Sadece düzeltme.**

## 🐛 Hata

```
ERROR: 42P01: relation "cash_sessions" does not exist
```

## ✅ Düzeltmeler

### 1. `supabase/migrations/0030_customers.sql`
- ❌ `REFERENCES cash_sessions(id)` → ✅ `REFERENCES cash_drawer_sessions(id)`
- Gereksiz `payment_logs_payment_method_check` drop bloğu silindi
  (enum'da `transfer` zaten mevcut — extra constraint manipülasyonu gereksiz)

### 2. `lib/actions/customers.ts` — `recordCustomerPayment`
| Yanlış | Doğru |
|---|---|
| `from('cash_sessions')` | `from('cash_drawer_sessions')` |
| `.eq('cashier_id', x)` | `.eq('opened_by_cashier', x)` |
| `.eq('status', 'open')` | `.is('closed_at', null)` |
| `session.cashier_id` | `session.opened_by_cashier` |
| `payment_logs.insert({ ... })` (action eksik) | `+ action: 'payment'` (zorunlu kolon) |

## 🚀 Uygulama

### Eğer önceki migration başarısız olduysa:
1. Eski 0030 başarısız oldu, yarısı bile çalışmadı
2. Yeni 0030_customers.sql ile **temiz** çalışacak
3. Supabase Studio → SQL Editor → migration'ı tekrar çalıştır

### Dosyaları kopyala:
```
supabase/migrations/0030_customers.sql   ← yeni hali ile değiştir
lib/actions/customers.ts                 ← yeni hali ile değiştir
```

```powershell
git add .
git commit -m "fix(cari): cash_drawer_sessions tablo/kolon adları"
git push
```

## 🧪 Test

1. Migration başarılı → ✅ tablolar oluşur
2. Panel → Cari Hesaplar → kullanıcı ekle ✓
3. Manuel borç ekle → bakiye düşer ✓
4. **Kasa açıkken** ödeme al:
   - Backend `cash_drawer_sessions` ile `closed_at IS NULL` kontrol eder
   - `payment_logs.insert` artık `action: 'payment'` ile geçer
5. ✅ Z raporunda görünür

## 💡 Backend Değişen Sorgular

```typescript
// Aktif oturum bul (artık doğru)
const { data: session } = await admin
  .from('cash_drawer_sessions')
  .select('id, opened_by_cashier')
  .eq('business_id', businessId)
  .is('closed_at', null)         // ← status='open' yerine
  .order('opened_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// payment_logs insert (action zorunlu)
await admin.from('payment_logs').insert({
  business_id: businessId,
  cashier_id: resolvedCashierId,
  cash_session_id: cashSessionId,
  action: 'payment',              // ← yeni eklendi (CHECK constraint)
  amount: input.amount,
  payment_method: input.paymentMethod,
  note: noteText,
});
```
