# LINT-FIX v4 - businesses.receipt_settings tip eklendi

types/database.ts'de businesses tablosu receipt_settings
kolonu yoktu, eklendi.

## UYGULAMA

9 dosyayı aleg-starter/ içine kopyala (üstüne yaz),
özellikle types/database.ts kritik.

cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
git add .
git commit -m "feat: yazici sistemi tam, agent, degerlendirme QR, logo raster"
git push origin main
