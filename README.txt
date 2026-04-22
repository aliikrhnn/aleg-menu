# SAATLİK YOĞUNLUK YENİ TASARIM

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. lib/actions/reports.ts                                     (hourlyAvg + peaks eklendi)
2. app/panel/(shell)/raporlar/reports-view.tsx                (HourlyHeatmapBlock yenilendi)


## KOMUT

Remove-Item -Recurse -Force .next
npm run dev


## YENİ TASARIM

### 1. ÜSTTE: 3 PEAK CHIP (yan yana)
   ┌──────────────┬──────────────┬──────────────┐
   │ ☀ SABAH      │ ◐ ÖĞLE ZİRVE │ ☾ AKŞAM      │
   │ 09:00        │ 14:00        │ 19:00        │
   │ 12 sipariş   │ 45 sipariş   │ 22 sipariş   │
   └──────────────┴──────────────┴──────────────┘
   
   - En yüksek olan "ZİRVE" rozeti ve turuncu ön plan
   - Diğerleri sessiz (pastel)
   - Sabah: 5-11 | Öğle: 11-17 | Akşam: 17-23

### 2. ORTA: ORTALAMA GÜN AREA CHART
   - 0'dan 23'e saatlik ortalama sipariş sayısı
   - Turuncu gradient doldurma
   - En yüksek nokta REFERENCE DOT ile işaretli
   - Hover tooltip: "14:00 · 4.5 ortalama sipariş"

### 3. ALT: 7 GÜN MİNİ ŞERİT
   PZT  ▂▃▂▅█▆▄▂▁▂▃▅ ... 34
   SAL  ▂▃▅█▇▅▃▂▁▂▄▆ ... 42
   ...
   - Her gün 24 küçük bar
   - Solda gün etiketi, sağda toplam
   - Peak'ler anında göze çarpar

## MANTıK

Eski 7×24 grid okuması çok zordu (168 hücre).
Yeni tasarımda 3 soruya net cevap:

  1. GÜNÜN HANGİ SAATİNDE YOĞUNUM?  (area chart)
  2. SABAH/ÖĞLE/AKŞAM hangi saat?  (peak chip)
  3. HANGİ GÜN FARKLI DAVRANIYOR? (mini şeritler)


## TEKNIK

lib/actions/reports.ts:
- HourlyHeatmap tipi genişletildi
- hourlyAvg: 24 sayı (saat başına ortalama, toplam/30)
- peaks: {morning, afternoon, evening} - her biri {hour, count}
- findPeak(from, to) helper

reports-view.tsx:
- AreaChart, ReferenceDot, CartesianGrid recharts'tan import
- Yeni component'ler: PeakChip, DayStripe
- Responsive (horizontal scroll gerekmez)
- Veri yoksa "○ Henüz sipariş verisi yok" boş state
