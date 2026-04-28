# Paket 1 — Lint Fix

`next lint` pre-push hook'u 18 hata buldu. Hepsi düzeltildi.

## Düzeltilenler

### `app/admin/(shell)/istatistikler/page.tsx`
- ❌ `'SerifTitle' is defined but never used` → import'tan silindi
- ❌ `'monthShort' is assigned a value but never used` → fonksiyon silindi

### `app/admin/(shell)/page.tsx`
- ❌ `'PageHeader' is defined but never used` → import'tan silindi
- ❌ `'churnRate' is assigned a value but never used` → değişken silindi
- ❌ `Unexpected any` (satır 579) → `ActivityRow` artık `AdminDashboardData['activity'][number]` type'ı kullanıyor

### `app/admin/api/impersonate/route.ts`
- ❌ `Unexpected any` (catch block) → `unknown` + `instanceof Error` kontrolü

### `lib/actions/admin-dashboard.ts`
- ❌ 12 adet `Unexpected any` → her view satırı için **explicit Row type'ları** tanımlandı (`DashboardMetricsRow`, `GrowthRow`, `RevenueRow`, `SignupRow`, `CityRow`, `FunnelRow`, `AuditRow`, `BusinessNameRow`, `PendingRow`)

## Yap

5 dosyayı **üstüne yaz**:

| Zip içinde | Hedef |
|---|---|
| `components/admin/primitives.tsx` | mevcut dosyanın yerine (zaten aynıydı, fark yok ama tutarlı olsun) |
| `lib/actions/admin-dashboard.ts` | **üstüne yaz** |
| `app/admin/(shell)/page.tsx` | **üstüne yaz** |
| `app/admin/(shell)/istatistikler/page.tsx` | **üstüne yaz** |
| `app/admin/api/impersonate/route.ts` | **üstüne yaz** |

Sonra:

```powershell
git add .
git commit -m "fix(admin): lint - unused imports, any types, ActivityRow type"
git push origin main
```

Pre-push lint geçecek bu sefer.

## Doğrulama

Push öncesi yerel olarak lint test etmek istersen:

```powershell
npm run lint
```

`./app/admin/...` ve `./lib/actions/admin-dashboard.ts` için sıfır hata dönmeli.

## Not — Linter neden bu kadar sıkı?

Anlaşılan repo'nuzda ESLint `@typescript-eslint/no-explicit-any` ve `@typescript-eslint/no-unused-vars` kuralları **error** seviyesinde. Bu iyi bir şey — production kodunda `any` kalmaması kalite kontrolü. İlerideki paketlerde dikkat edeceğim, bu hata tekrarlamayacak.
