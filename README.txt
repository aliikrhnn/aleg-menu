# Türkiye Haritası Güncelleme

## YAPACAKLARIN

1. **Yeni dosya ekle:**
   - public/map/turkey-silhouette.webp  (yeni temiz silüet)

2. **Güncelle:**
   - components/landing/map-section.tsx  (yeniden yaz)

3. **ESKİ dosyayı SİLMEK istersen (opsiyonel):**
   - public/map/turkey-map.webp  (artık kullanılmıyor)
   - Hemen silmeden önce canlıda çalıştığını test et

## DEĞİŞİKLİKLER

✓ Bursa artık AKTİF şehir (olive yeşil, count: 1)
✓ Aktif şehir sayısı: 5 → 6
✓ Aktif işletme sayısı: 8 → 9
✓ Türkiye silueti TEMİZ (il isimleri kaldırıldı)
✓ 18 şehir kodla eklendi — KESKİN, OKUNAKLI etiketler
✓ Isparta etiketi kırmızı pill + beyaz yazı (vurgulu)
✓ Beta şehirleri koyu pill + beyaz yazı
✓ Bekleyen şehirler küçük ince etiket
✓ Her şehrin labelPos'u (top/bottom/left/right) optimize edildi — overlapping azaldı

## TEST

Remove-Item -Recurse -Force .next
npm run dev

Türkiye tab'ına geç, kontrol et.
