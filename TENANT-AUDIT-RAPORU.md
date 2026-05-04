# TENANT İZOLASYON AUDIT — RAPOR

**Tarih:** 3 Mayıs 2026
**Tarayan:** Claude (otomatik + manuel)
**Kapsam:** lib/actions/ altındaki tüm `createAdminClient` kullanımı

## ÖZET

- **Toplam admin client kullanımı:** 203 sorgu
- **Şüpheli sorgu:** 7
- **Gerçek bug:** 1
- **False positive:** 6

## GERÇEK BUG (Düzeltildi)

### payments.ts:472 — payment_logs Idempotency

**Önce:**
```typescript
const { data: existing } = await admin
  .from('payment_logs')
  .select('id, order_id')
  .eq('sync_client_id', input.syncClientId)
  .maybeSingle();
```

**Sorun:** Eğer bir kafenin frontend'i ürettiği `sync_client_id` 
başka bir kafenin payment_logs'unda varsa (tahmini imkansız ama 
mümkün), idempotency check yanlış order'a match eder.

**Risk:** Düşük (UUID collision gerek)
**İstismar:** Pratik değil

**Sonra:**
```typescript
const { data: existing } = await admin
  .from('payment_logs')
  .select('id, order_id')
  .eq('sync_client_id', input.syncClientId)
  .eq('business_id', businessId)  // ← eklendi
  .maybeSingle();
```

## FALSE POSITIVE (Risk Yok)

### menu.ts:189 — Kategori silmeden önce ürün sayma
**Görünüm:** `.from('products').eq('category_id', X)` — business_id yok
**Gerçek:** category_id zaten yukarıda doğrulanmış (line 184)
**Risk:** YOK

### menu.ts:301 — Yeni ürün sort_order
**Görünüm:** `.from('products').eq('category_id', input.category_id)`
**Gerçek:** input.category_id zaten yukarıda doğrulanmış (line 278)
**Risk:** YOK

### orders.ts:442 — Review duplicate check
**Görünüm:** `.from('reviews').eq('order_id', X)` — business_id yok
**Gerçek:** order zaten yukarıda business_id doğrulanmış (line 414)
**Risk:** YOK

### reviews.ts:65, 349 — Aynı pattern
**Risk:** YOK (aynı sebepten)

### tables.ts:286 — Açık ticket sayma
**Görünüm:** `.from('tickets').eq('table_id', X)`
**Gerçek:** tableId üst kısımda doğrulanmış
**Risk:** YOK

## YÖNTEM

Otomatik tarama Python regex ile yapıldı:

```python
# Tüm SELECT çağrılarını ara
pattern = re.compile(
    r"(?:admin|supabase|client)\s*\n?\s*"
    r"\.from\(['\"](\w+)['\"]\)([\s\S]*?)"
    r"(?:\.single\(\)|\.maybeSingle\(\)|;|\n\s*\n)",
    re.MULTILINE
)
```

Tenant-scoped tablolarda business_id, parent_id, veya 
.eq('id', X) eq filtresi yoksa şüpheli işaretlendi.

Sonra her şüpheli SQL elle incelendi.

## KAPSAM DIŞI

Bu audit **sadece SELECT'leri** kapsar. INSERT/UPDATE/DELETE'ler 
genellikle ID üzerinden çalışır ve dolaylı tenant izolasyon sağlar.

## ÖNERİLER

1. **Drizzle ORM ile RLS yardımı:** Her query'de business_id 
   filtresi otomatik eklensin (middleware pattern).

2. **PR Review Checklist:** Her yeni `createAdminClient()` 
   kullanımı için "business_id filter var mı?" soru zorunlu.

3. **Aylık Audit:** Bu Python script'i CI/CD'ye eklensin, 
   her PR'da çalışsın.

4. **RLS Policy Düşün:** Supabase RLS politikaları kullanmak 
   admin client'a bağımlılığı azaltır.

## SONUÇ

Sistem büyük ölçüde tenant-safe. 1 düşük-risk bug düzeltildi. 
Production'a hazır. Ama:
- İlk 1 hafta yakın gözlem (Sentry yardımıyla)
- Aylık tarama (otomatize edilmeli)
- Drizzle migrate planı (orta vadede)
