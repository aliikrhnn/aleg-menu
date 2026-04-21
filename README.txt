# QR Önizleme ve Tasarım İyileştirmeleri

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. lib/utils/qr-design.ts
2. components/panel/qr-picker-modal.tsx

## KOMUT

Remove-Item -Recurse -Force .next
npm run dev

## YAPILAN DÜZELTMELER

### 1. Önizleme yarım görünmüyordu → Çözüldü
- SVG'nin kendi boyutunu (560x760 px) zorluyor, 
  CSS aspectRatio ile bu aşılamıyordu.
- Şimdi global CSS ile SVG'nin width/height otomatik 
  oluyor: container'a göre ölçekleniyor, tam görünüyor.
- Modal biraz genişletildi (820 → 880px).
- Sağ panel 320 → 340px, flex-shrink-0 ile koruma altında.

### 2. Scan/tara metinleri daha büyük (tüm tasarımlarda)
Önceki → Şimdi:
- Minimal: 18 → 24px, weight 600
- Warm: 22 → 28px, italic serif, weight 500
- Dark: 20 → 26px, krem renk parlaklık arttırıldı
- Kraft: 20 → 26px, italic serif, weight 600

### 3. "aleg" imzası tüm tasarımlarda daha belirgin
- Boyut: 12 → 14px
- Weight: 400 → 500
- Opacity: 0.6 → 0.85
- Her tasarımda sağ alt köşede net görünür
