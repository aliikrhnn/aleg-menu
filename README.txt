# LINT-FIX v2 - Build Hatası Dahil Tüm Düzeltmeler

Önceki lint-fix.zip lint'i geçirdi ama build aşamasında
TypeScript hatası çıktı. Bu paket onu da düzeltiyor.


## UYGULAMA

8 dosyayı aleg-starter/ içine kopyala (üstüne yaz):

1. app/panel/(shell)/degerlendirmeler/reviews-manager.tsx
2. app/panel/(shell)/yazicilar/components/printer-form-modal.tsx
3. app/panel/(shell)/yazicilar/components/receipt-preview.tsx  ← YENİ
4. app/panel/(shell)/yazicilar/page.tsx
5. lib/actions/printers.ts
6. lib/actions/reviews.ts
7. lib/printer/bluetooth-client.ts
8. lib/printer/escpos.ts


## SONRA

cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
git add .
git commit -m "feat: yazici sistemi tam, agent, degerlendirme QR, logo raster"
git push origin main


## YENİ DÜZELTME

receipt-preview.tsx:425 - TypeScript literal type hatası
Mock order order_type 'dine_in' as const olarak tanımlı,
TypeScript 'pickup' karşılaştırmasına "anlamsız" diyordu.
(order.order_type as string) === 'pickup' yaparak çözdük
(aynı dosyada satır 240'ta da aynı yaklaşım kullanılmış).


## UYARI

Build çıktısında 2 WARNING var (hata değil, push'u engellemez):
- receipt-preview.tsx:178 <img> kullanımı (next/image önerisi)
- advanced-tab.tsx:17 useEffect missing dependency

Bunlar pilot için kritik değil, sonra temizleriz.
