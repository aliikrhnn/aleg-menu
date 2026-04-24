# QR MENÜ ANONIM ERİŞİM FİX

QR menü açılmıyor — "Bu adres geçersiz" hatası veriyordu.

**1 dosya.**

## 🐛 Sorun

```
localhost:3000/menu/karakoy?t=bardeneme-1
→ MENÜ BULUNAMADI · Bu adres geçersiz
```

### Kök Sebep

`app/menu/[slug]/page.tsx`'te normal `createClient()` kullanılıyordu:

```typescript
const supabase = createClient();
const { data: business } = await supabase
  .from('businesses')
  .select(...)
  .eq('slug', params.slug)
  .maybeSingle();
```

Ama `businesses` tablosunda RLS policy'si:

```sql
CREATE POLICY "businesses_member_read" ON businesses
  FOR SELECT USING (
    id IN (SELECT public.user_businesses())
    OR public.is_super_admin()
  );
```

**Sadece üye olan kullanıcılar** okuyabiliyor. Anonim müşteri → `business = null` → `notFound()`.

`categories` ve `products` tablolarında public read var ama `businesses` için yok.

## ✅ Fix

QR menü sayfasında **admin client** kullan:

```diff
- import { createClient } from '@/lib/supabase/server';
+ import { createAdminClient } from '@/lib/supabase/admin';

  export default async function CustomerMenuPage({ params, searchParams }: Props) {
-   const supabase = createClient();
+   const supabase = createAdminClient();
```

### Güvenlik

Admin client RLS bypass eder, ama burada **güvenli**:

1. **Server-side component** — admin key client'a sızmaz
2. **Slug ile filtreli** — sadece ilgili işletme
3. **Menü verisi zaten public** — kategoriler ve ürünler için public RLS zaten var
4. **Sadece okuma** — hiç INSERT/UPDATE yok
5. **Aboneliği iptal/suspend olanlar filtrelenir** — subscription_status kontrolü var
6. **Taslak ürünler gizli** — `status IN ('active', 'soldout')` filtresi

## 🔮 Alternatif: Public RLS Policy (Zamanla)

Daha temiz çözüm — `businesses` tablosuna public read policy ekle:

```sql
-- supabase/migrations/00XX_public_menu_access.sql
CREATE POLICY "businesses_public_by_slug" ON businesses
  FOR SELECT USING (
    subscription_status NOT IN ('suspended', 'cancelled')
  );
```

Ama bu migration çalıştırmak gerek. Şimdilik admin client hızlı çözüm.

## 📦 Dosya (1)

```
app/menu/[slug]/page.tsx
```

## 🚀 Kurulum

```powershell
# Dosyayı üstüne yaz → F5
```

Hot reload yeterli. Veya dev server restart:
```powershell
# Ctrl+C
npm run dev
```

## 🧪 Test

1. `localhost:3000/menu/karakoy?t=bardeneme-1`
2. ✅ Menü açılır
3. ✅ Üstte "MASA: BARDENEME 1" rozeti görünür (QR çözüldü)
4. ✅ Logo/inisyal + işletme adı + selamlama
5. ✅ Featured carousel (varsa)
6. ✅ Kategori bölümleri + scroll-spy

`?t=` olmadan:
```
localhost:3000/menu/karakoy
```
Menü açılır, sadece masa rozeti yok.

## 🚀 Push

```powershell
git add .
git commit -m "fix(menu): use admin client for anonymous customer menu (RLS bypass)"
git push
```

## 📋 Durum

| İş | Durum |
|---|---|
| QR Menü Paket 1 (redesign) | ✅ (push edildi) |
| **QR Menü anonim erişim fix** | **✅ BU PAKET** |
| QR Menü Paket 2 (animasyonlar) | 🔜 |

## 🔜 Sırada

Push geçince artık gerçekten menü canlıda çalışacak. Test et, sonra **"paket 2 başlat"** de animasyonlara geçelim. 🚀
