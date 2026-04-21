# Lint Hata Düzeltmesi

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. lib/actions/qr.ts
2. lib/actions/tables.ts

## NE DÜZELTİLDİ

1. qr.ts - kullanılmayan import 'revalidatePath' kaldırıldı
2. qr.ts - base let → const yapıldı
3. tables.ts - activeCounts let → const yapıldı

## KOMUT

git add .
git commit -m "fix: lint errors"
git push
