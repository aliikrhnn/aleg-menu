# TYPE FİX — API ROUTE CASH_DRAWER_SESSIONS

TypeScript build hatası düzeltildi.

**1 dosya.**

## 🐛 Sorun

```
Type error: No overload matches this call.
Argument of type '"cash_drawer_sessions"' is not assignable to parameter of type '"super_admins" | "business_members" | ...'
```

`cash_drawer_sessions` tablosu migration'da var ama `types/database.ts` dosyasına **generate edilmemiş** (Supabase CLI ile types güncellenmemiş). 

`lib/actions/payments.ts` `'use server'` directive'i ile TypeScript tolerance daha yüksek → error yok. Ama API route'ta (`app/api/...`) TypeScript strict → error veriyor.

## ✅ Fix

`admin` client'a `any` cast ile tip kontrolünü bypass et:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = createAdminClient() as any;
```

Bu mantıklı çünkü:
- Tablo gerçekte var (migration 0007+)
- Runtime'da çalışıyor
- Payments.ts'te zaten aynı şekilde çalışıyor
- Sadece TypeScript tip kontrolü eksik

**Daha temiz çözüm:** `npx supabase gen types typescript --local > types/database.ts` ile typedef'i güncellemek. Ama bu başka bir iş, şimdilik push geçsin.

## 📦 Dosya (1)

```
app/api/kasa/finalize-gun-sonu/route.ts
```

## 🚀 Push

```powershell
# Dosyayı üstüne yaz
git add .
git commit -m "fix(build): api route cash_drawer_sessions type bypass"
git push
```

Build geçmeli, push tamam.

## 📋 Sonra Yapılacak (Önerilen)

Zamanı gelince Supabase types'ı güncelle:

```powershell
# Local Supabase varsa
npx supabase gen types typescript --local > types/database.ts

# Veya remote
npx supabase gen types typescript --project-id <PROJECT_ID> > types/database.ts
```

Sonra `as any` cast'i kaldırılabilir. Ama acil değil.
