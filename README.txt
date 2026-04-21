# TypeScript Tip Düzeltmesi

## DEĞİŞEN DOSYA (üstüne yaz)

lib/actions/qr.ts

## NE DÜZELTİLDİ

resolveQrSlug fonksiyonu return tipinde
table_name: string | undefined diye tanımlıydı ama
null döndürüyordu. null → undefined yapıldı.

## KOMUT

git add .
git commit -m "fix: qr.ts table_name type mismatch"
git push
