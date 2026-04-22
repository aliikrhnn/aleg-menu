# TYPE FIX - ai_usage feature enum

## SORUN

types/database.ts'te ai_usage.feature tipi:
  'slogan' | 'monogram' | 'chat' | 'variation'

insights yok, bu yüzden recordUsage('insights') TS hatası veriyor.


## DOSYA (üstüne yaz)

1. types/database.ts     (feature enum'a 'insights' eklendi)

## YENİ MIGRATION (opsiyonel ama önerilir)

2. supabase/migrations/0012_ai_usage_insights.sql

Bu migration Supabase'deki CHECK constraint'i günceller.
DB'de 'insights' yazılmaya çalışınca reddedilmesin diye.

Supabase Dashboard > SQL Editor'da çalıştır, VEYA Supabase CLI ile:
  supabase db push


## KOMUT

git add .
git commit -m "AI insights tip + migration - pre-push fix"
git push

Bu sefer geçer inşallah.
