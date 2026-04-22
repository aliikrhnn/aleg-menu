# TEMİZLİK PAKETİ

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. lib/actions/orders.ts   ([ORDER DEBUG] log'ları silindi)
2. lib/actions/pos.ts      ([POS DEBUG] log'ları silindi)


## EL İLE SİLECEKLERİN

Aşağıdaki klasörleri tamamen sil (debug için eklemiştim):

- app/api/debug/orders/    (tüm klasör)
- app/api/debug/v2/        (tüm klasör)

VEYA tek komutla:

  Remove-Item -Recurse -Force app/api/debug


## KOMUT

Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force app/api/debug
npm run dev


## SONUÇ

- Terminal artık [ORDER DEBUG] ve [POS DEBUG] yazıları kirletmiyor
- Debug API endpoint'leri (kullanıcılar görmemeli) silindi
- Pilot için temiz, üretime hazır kod
