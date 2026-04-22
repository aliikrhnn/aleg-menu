# DUPLICATE FIX

## SORUN

types/database.ts'te stations tipi 2 kere tanımlanmıştı:
- 207. satır: Yeni versiyon (slug, icon, color ile)
- 384. satır: Eski versiyon (branch_id, kind, active ile)

Eski versiyon (DB'de olmayan kolonlarla) silindi.

## DOSYA (üstüne yaz)

types/database.ts

## KOMUT

git add .
git commit -m "types: duplicate stations identifier kaldırıldı"
git push
