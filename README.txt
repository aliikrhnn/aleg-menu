# RAPORLAR v2 - Tarih Filtresi + İstasyon Dağılımı

## YENİ ÖZELLİKLER

### 1. Tarih Filtresi (üstte)
Seçenekler:
- Bugün
- Dün
- Bu hafta (Pzt'den bugüne)
- Son 7 gün
- Bu ay (ayın 1'inden bugüne)
- Son 30 gün (varsayılan)
- Özel (2 tarih kutusu: başlangıç/bitiş)

URL query param ile çalışır (?preset=today veya ?preset=custom&from=2026-04-01&to=2026-04-20).
Sayfa yenilendiğinde veya share edildiğinde aynı filtre geçerli.

### 2. Sipariş Tipi → İstasyon Dağılımı
Önceki pasta grafiği "Masada/Gel-Al/Paket" dağılımı gösteriyordu.
Şimdi "Bar / Mutfak / Pastane..." gibi İSTASYONLARA gelen sipariş dağılımını gösterir.
- İstasyon adları ve renkleri /panel/istasyonlar ayarlarından gelir
- order_items.station_id üzerinden hesaplanır
- İstasyonsuz ürünler "İstasyonsuz" olarak gösterilir

### 3. Dinamik Açıklama
"Son 30 günün özeti" metni artık seçili aralığa göre değişiyor:
- Bugün → "Bugünün verileri"
- Son 7 gün → "Son 7 günün özeti"
- Özel → "01.04.2026 — 20.04.2026 arası"


## UYGULAMA

3 dosyayı aleg-starter/ üstüne yaz:

1. lib/actions/reports.ts
2. app/panel/(shell)/raporlar/page.tsx
3. app/panel/(shell)/raporlar/reports-view.tsx

npm run dev otomatik reload.


## TEST

1. /panel/raporlar aç → üstte tarih filtresi dropdown görünmeli
2. "Bugün" tıkla → URL ?preset=today olmalı, özet kartlar aynı kalır
   ama Top Ürünler / İstasyon dağılımı / Heatmap sadece bugünün verisine göre
3. "Özel" tıkla → 2 date input açılır → tarihleri seç → Uygula
4. İkinci kart (pasta grafiği) artık "İstasyon dağılımı" diyor
   Pasta dilimleri istasyon adlarıyla, renkleriyle gösterilir


## GİT PUSH

cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
git add .
git commit -m "feat: raporlarda tarih filtresi + istasyon dagilimi"
git push origin main
