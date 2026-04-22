# KDS BUG FIX - stations is not defined

## SORUN

TicketCard bileşeninde stations değişkeni scope'ta yoktu,
istasyon rozeti render ederken "ReferenceError: stations is not defined"
hatası veriyordu.

## ÇÖZÜM

TicketCard'a stations prop'u eklendi. Caller'lardan geçiliyor.

## DOSYA (üstüne yaz)

app/panel/kds/kitchen-board.tsx

## KOMUT (.next cache temizlemeye gerek yok, hot reload yeter)

# Tarayıcıda sayfayı yenile
