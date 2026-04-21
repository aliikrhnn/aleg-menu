# ÖNCELİKLİ: Supabase Storage Bucket Oluştur

"Bucket not found" hatasının çözümü.

## Yol 1: Manuel (EN KOLAY)

1. Supabase Dashboard aç → https://supabase.com/dashboard
2. Projene gir
3. Sol menü → **Storage**
4. **New bucket** butonu (sağ üstte)
5. Doldur:
   - Name: `business-assets`
   - Public bucket: **AÇIK** (toggle'ı aç)
   - File size limit: 5 MB (5242880 byte)
   - Allowed MIME types: image/png, image/jpeg, image/webp, image/svg+xml
6. **Save**

## Yol 2: SQL (Policies için)

SQL Editor'da şunu çalıştır:

```sql
-- Bucket oluştur (var ise atlar)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "business-assets public read" ON storage.objects;
CREATE POLICY "business-assets public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'business-assets');

-- Üyeler yükleyebilir
DROP POLICY IF EXISTS "business-assets member upload" ON storage.objects;
CREATE POLICY "business-assets member upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );

DROP POLICY IF EXISTS "business-assets member update" ON storage.objects;
CREATE POLICY "business-assets member update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );

DROP POLICY IF EXISTS "business-assets member delete" ON storage.objects;
CREATE POLICY "business-assets member delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_businesses())
  );
```

Her iki yolu da yapabilirsin (önce bucket manuel, sonra SQL policies).
