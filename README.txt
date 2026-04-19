# Adım 2: Canlı Siparişler Paneli

## YENİ DOSYALAR (Projende aynı dizinleri oluştur)

1. lib/actions/pos.ts
2. app/panel/(shell)/pos/page.tsx
3. app/panel/(shell)/pos/orders-board.tsx
4. supabase/migrations/0007_realtime_orders.sql (yedek için)

## DEĞİŞEN DOSYA (üstüne yaz)

- components/panel/nav-config.ts

## SUPABASE'DE ÇALIŞTIR (ÖNEMLİ)

SQL Editor'da çalıştır:

    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;

Bu olmadan realtime çalışmaz.

NOT: Supabase'de UI'dan da yapabilirsin:
- Dashboard → Database → Replication → supabase_realtime publication
- orders tablosuna checkbox koy

## TEST

1. cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
2. Remove-Item -Recurse -Force .next
3. npm run dev

4. Tarayıcı sekme 1: Panel → giriş → /panel/pos
5. Tarayıcı sekme 2: http://localhost:3000/menu/karakoy
6. Sekme 2'den sipariş gönder
7. Sekme 1'de ANLIK olarak "Yeni Sipariş" kolonuna düşmeli + ses çalmalı
8. "Mutfağa Yolla" → "Hazır" → "Teslim Edildi" butonlarıyla durumu ilerlet

## NASIL ÇALIŞIR

- Supabase Realtime (WebSocket) — orders tablosundaki değişiklikleri dinler
- Değişiklik algılandığında tüm liste tazelenir (cache yok, taze veri)
- Yeni received sipariş gelirse ses çalar (switch ile kapatabilir)
- 20 saniyede bir fallback refresh (realtime koptuğu durumda)

## SONRAKİ ADIM

/panel/kds - Tam ekran mutfak görünümü
