# Paket 1 — Build Fix #2 (RPC type)

## Sorun

`supabase.rpc('log_audit', ...)` çağrısı, Supabase'in TypeScript generated types'ında `log_audit` fonksiyonu tanımlı olmadığı için reddedildi. Generated types sadece eski 3 RPC'yi biliyor (`user_businesses`, `is_super_admin`, `has_permission`). `log_audit` migration ile eklendi ama types henüz regenerate edilmedi.

## Çözüm

`supabase.rpc`'yi `unknown`'a, sonra hedef tipe cast ettim. RPC çalışmaya devam ediyor (runtime'da fonksiyon zaten Supabase'de var), sadece TS şikayetini sustırdık.

```ts
await (supabase.rpc as unknown as (
  fn: string,
  params: Record<string, unknown>,
) => Promise<{ error: unknown }>)('log_audit', { ... });
```

Bunun başında bir TODO yorumu var: types regenerate edilince cast kaldırılabilir.

## Yap

1 dosya: `lib/actions/admin-dashboard.ts` üstüne yaz.

```powershell
git add lib/actions/admin-dashboard.ts
git commit -m "fix(admin): cast log_audit rpc - generated types not yet updated"
git push origin main
```

## Generated types nasıl güncellenir? (opsiyonel, sonraya bırakılabilir)

```bash
# Supabase CLI gerekli
npx supabase gen types typescript --project-id <proje-id> > lib/supabase/types.ts
```

Bu komut DB'deki tüm güncel tablo/view/RPC'leri tipleyip dosyayı yeniler. Sonra cast'i kaldırıp `supabase.rpc('log_audit', ...)` direkt yazılabilir.

**Önerim:** Şimdilik cast ile devam, paket 4 (audit log ekranı) ile birlikte gen-types'ı çalıştırıp tek seferde tüm cast'leri temizleriz. O zaman:
- `as unknown as DashboardMetricsRow | null` → direkt tip kullanılır
- `as unknown as GrowthRow[]` → direkt tip kullanılır
- `(supabase.rpc as unknown as ...)` → sade `supabase.rpc('log_audit', ...)` olur

Tüm dosya 30+ satır kısalır.
