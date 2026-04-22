# Pre-push Lint Fix

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. app/panel/(shell)/menu/varyasyonlar/attach-products-modal.tsx  (initiallyAttached unused sil)
2. app/panel/(shell)/menu/varyasyonlar/presets-manager.tsx        (attachPresetToProducts unused import sil)
3. app/menu/[slug]/menu-view.tsx                                  (img warning disable)
4. components/panel/product-image-crop-modal.tsx                  (img warning disable)

## KOMUT

git add .
git commit -m "Lint düzeltmeleri: unused vars + img warnings"
git push

## NE DÜZELTİLDİ

ERRORS (build durdurur):
- attach-products-modal.tsx: kullanılmayan initiallyAttached useMemo silindi
- presets-manager.tsx: kullanılmayan attachPresetToProducts import silindi

WARNINGS (uyarı):
- menu-view.tsx: /* eslint-disable @next/next/no-img-element */
- product-image-crop-modal.tsx: aynı disable

img tag uyarıları next/image yerine kullanmamızdan ama bizim
durumumuzda Supabase Storage URL'leri ve data URL'ler için
img daha pratik (next.config'de allowed hosts ayarı gerekmiyor).
