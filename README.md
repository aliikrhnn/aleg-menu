# Paket 1 — Build Fix

`tsc` (Next.js prod build) cast'lere kızdı. Sebep: Supabase client view'ları `{ [x: string]: any; id: string }` olarak tipler — TS'in "yeterince örtüşme yok" dediği için direkt cast yapılamıyor.

## Düzeltilen

Sadece 1 dosya: `lib/actions/admin-dashboard.ts`

13 cast satırı `X as TargetType` → `X as unknown as TargetType` formatına çevrildi (TS'in resmi önerisi).

## Yap

`lib/actions/admin-dashboard.ts`'i **üstüne yaz**, sonra:

```powershell
git add lib/actions/admin-dashboard.ts
git commit -m "fix(admin): cast through unknown for supabase view rows"
git push origin main
```

Bu sefer build geçecek ✓

## Not

İlerideki paketlerde Supabase tipli viewlar için bu pattern'i baştan kullanacağım — `Database['public']['Views']['v_admin_xxx']['Row']` tipinden alıp direkt kullanmak en temiz yol ama generated types'ı build etmek lazım. `as unknown as X` daha pragmatik, aynı işi yapıyor.
