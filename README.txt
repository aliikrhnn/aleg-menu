# BUILD FIX - Recharts Tooltip Formatter Tipleri

## SORUN

Recharts'ın tooltip formatter callback'i çok sıkı tiplendirilmiş:
  Type 'ValueType | undefined' is not assignable to type 'number'

## ÇÖZÜM

3 yerdeki formatter'ı tip güvenli hale getirdim:
- Top Products (Bar) formatter
- Order Type (Pie) formatter
- Hourly Area Chart formatter

Artık value'yu number olarak varsaymak yerine, Recharts'ın döndürdüğü
tipi kabul edip Number() ya da String() ile güvenli şekilde kullanıyoruz.

## DOSYA (üstüne yaz)

app/panel/(shell)/raporlar/reports-view.tsx

## KOMUT

git add .
git commit -m "Raporlar + saatlik yoğunluk - recharts tip fix"
git push
