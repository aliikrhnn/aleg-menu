# LINT-FIX - Push İçin Gereken Düzeltmeler

Pre-push hook 8 lint hatası yüzünden push'u engelliyordu.
Bu paket hepsini düzeltir.


## UYGULAMA

7 dosyayı aleg-starter/ içine kopyala (üstüne yaz):

1. app/panel/(shell)/degerlendirmeler/reviews-manager.tsx
2. app/panel/(shell)/yazicilar/components/printer-form-modal.tsx
3. app/panel/(shell)/yazicilar/page.tsx
4. lib/actions/printers.ts
5. lib/actions/reviews.ts
6. lib/printer/bluetooth-client.ts
7. lib/printer/escpos.ts


## SONRA

cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
git add .
git commit -m "feat: yazici sistemi tam, agent, degerlendirme QR, logo raster"
git push origin main

Lint geçecek. Vercel otomatik deploy eder (~2 dakika).


## DÜZELTİLEN HATALAR

1. reviews-manager.tsx:402  GOOGLE'A → GOOGLE&apos;A (apostrof escape)
2. printer-form-modal.tsx:3 useEffect unused → import'tan kaldırıldı
3. yazicilar/page.tsx:5    LocalizedText unused → import'tan kaldırıldı
4. printers.ts:935         as any → typed literal union
5. reviews.ts:313          as any → typed object
6. bluetooth-client.ts:25  WRITE_CHARACTERISTICS unused → eslint-disable
7. bluetooth-client.ts:97  @ts-expect-error description eklendi
8. escpos.ts:435           showLogo unused → kaldırıldı + yorum
