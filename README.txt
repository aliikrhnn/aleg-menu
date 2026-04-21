# Database Types Güncellemesi

## DEĞİŞEN DOSYA (üstüne yaz)

types/database.ts

## EKLENEN TABLOLAR

1. qr_codes      - QR kodlar (Adım 5'te eklendi)
2. table_zones   - Masa bölgeleri (Salon/Teras/Bahçe)
3. stations      - Mutfak istasyonları (Bar/Mutfak/Soğuk/Pastane)

Bu tablolar Supabase'de vardı ama TypeScript tip 
dosyasında yoktu. Build sırasında tip hatası veriyordu.

## KOMUT

git add .
git commit -m "fix: add qr_codes, table_zones, stations types"
git push
