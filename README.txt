# Adım 3: Mutfak Ekranı (KDS)

## YENİ DOSYALAR

1. lib/actions/kds.ts
2. app/panel/kds/page.tsx          ← DİKKAT: (shell) ALTINDA DEĞİL, panel ALTINDA
3. app/panel/kds/kitchen-board.tsx ← DİKKAT: (shell) ALTINDA DEĞİL

## DEĞİŞEN

- components/panel/nav-config.ts (comingSoon: true kaldırıldı)

## NEDEN (shell) ALTINDA DEĞİL?

Mutfak ekranı TAM EKRAN kullanılır. Sidebar/topbar mutfakta yer kaplar.
(shell) altında olsaydı sidebar çıkardı. panel/kds olarak koyunca
sidebar yok, sadece kendi üst barı.

Klasör yapısı:
app/
  panel/
    (shell)/
      pos/           ← POS buraya kalıyor
    kds/             ← YENİ, shell dışında
      page.tsx
      kitchen-board.tsx
    giris/

## TEST

1. cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
2. Remove-Item -Recurse -Force .next
3. npm run dev

4. Panele giriş yap
5. Sidebar → "Mutfak Ekranı" tıkla
6. VEYA direkt: http://localhost:3000/panel/kds

7. Açılmalı: Koyu tema (espresso), büyük kartlar,
   tam ekran buton, ses toggle, "Panele dön" butonu

8. TEST AKIŞI:
   a) Sekme 2: localhost:3000/menu/karakoy sipariş gönder
   b) KDS sekmesine dön → yeni kart düşmeli + ses çalmalı
   c) "BAŞLA" tıkla → kart "HAZIRLANIYOR" olur (kenarı altın rengi)
   d) "HAZIR" tıkla → kart KDS'den kalkar
   e) POS sekmesinde (/panel/pos) → artık "Hazır · Teslim" kolonunda

## ÖZELLİKLER

- Koyu "espresso" tema (krem üstü koyu kahverengi)
- 1-2-3-4 kolonlu responsive grid (ekran genişliğine göre)
- 3m'den okunur büyük font (18px ürün, 22px miktar)
- 10+ dakika bekleyen siparişler kırmızı uyarılı (urgent)
- Tam ekran toggle (F11 alternatifi, aynı işe yarar)
- Ses bildirim toggle (hoparlör ikonu)
- Supabase Realtime (yeni sipariş 1-2sn'de düşer)
- 15sn fallback refresh

## SONRAKİ ADIM

- Masa yönetimi (tablo add/edit/delete)
- QR kod yazdırma
