# PİLOT FİNAL V2 - 4 İYİLEŞTİRME

Bu paket bir öncekinin (pilot-final-fix.zip) üstüne uygulanır.
Yeni dosyalar var (receipt-design-tab.tsx + printers.ts).


## İÇERİK

1. Hesap fişinde GERÇEK LOGO (raster image)
2. Çoklu istasyon UX hint'i
3. Otomatik başlatma GİZLİ (pencere açmadan)
4. [YENİ] "Önizleme fişini bastır" - gerçek ayarlarla test


## 4. ÖNİZLEME FİŞİ (YENİ)

ÖNCEDEN:
Test fişi butonu sabit "ALEG TEST" fişi basıyordu.
Kullanıcı fiş tasarımında yaptığı değişiklikleri görmeden
önce sipariş vermek zorundaydı.

ŞİMDİ:
- Buton "Önizleme fişini bastır" oldu
- Kasa preview seçiliyken → Mock sipariş + gerçek ayarlar + logo + QR
- Mutfak preview seçiliyken → Mock sipariş + mutfak formatı + istasyon adı
- Aynı önizlemedeki tasarım fişe basılır

BÖYLECE: Ali değişiklik yapıp hemen basıp görebilir, müşteri
deneyimini simüle eder.

DEĞİŞEN DOSYALAR:
- panel/lib/actions/printers.ts               (requestTestPrint previewType)
- panel/app/panel/(shell)/yazicilar/tabs/receipt-design-tab.tsx
- agent/agent.js                              (preview job → mock order)


## KURULUM

### PANEL
panel/ klasöründeki tüm dosyaları aleg-starter/ üstüne yaz:
- lib/printer/escpos.ts
- lib/actions/printers.ts
- app/panel/(shell)/yazicilar/components/printer-form-modal.tsx
- app/panel/(shell)/yazicilar/tabs/receipt-design-tab.tsx

`npm run dev` otomatik reload.

### AGENT
agent/ klasöründeki dosyaları aleg-printer-agent/ üstüne yaz.

Agent çalışıyorsa Ctrl+C ile durdur, tekrar başlat:
  node agent.js

(sharp ilk kez yüklenecekse `npm install` gerekir)


## TEST AKIŞI

### Önizleme Fişi Testi
1. /panel/yazicilar > Fiş Tasarımı
2. Kasa Fişi sekmesinde → Logo/Slogan/QR toggle'larını açıp kapat
3. Önizlemede değişikliği gör
4. "🖨 Önizleme fişini bastır" butonuna bas
5. Kasa yazıcısından çıkan fişin önizlemeyle BİREBİR aynı olduğunu gör:
   - Logo (raster, siyah-beyaz)
   - İşletme adı + slogan + adres + telefon (toggle'a göre)
   - 2x Latte + Yulaf (+5TL)
   - 1x Kurabiye + Not: Fazla kavrulmasın
   - Ara toplam / TOPLAM
   - Alt yazı (ayarlardan)
   - Değerlendirme QR (toggle açıksa)

6. Mutfak Fişi sekmesine geç
7. "Önizleme fişini bastır" → Mutfak formatında fiş çıkar
   - Büyük font, istasyon adı, #sipariş no, masa, ürünler, müşteri notu

### Diğer Test'ler (öncekilerden)
- Çoklu istasyon: Yazıcı ekle formunda istasyon altında hint görünür
- Logo: Kasa fişi basıldığında gerçek logo çıkar
- Gizli başlatma: otomatik-baslat-ekle.bat > Windows restart > node.exe arka planda


## ÖNEMLİ

Önizleme fişi yazdırma "preview test" olarak işaretlenir:
- job_type = 'cashier' veya 'kitchen'
- order_id = NULL
- triggered_by = 'manual'

Agent bu kombinasyonu gördüğünde mock sipariş kullanır (DB'ye
fake sipariş eklenmez). Gerçek siparişlerin auto-print akışını
etkilemez.
