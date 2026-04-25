# 🍽 D2 — YENİ SİPARİŞ BİLDİRİMİ

Müşteri QR menüden sipariş verince kasa anında haberdar olur.

**3 dosya · Migration yok.**

## 🎯 Konsept

```
Müşteri QR menüden sepet → Sipariş Ver
        ↓
   orders.insert (source='qr')
        ↓
        ├─→ Realtime → KASA: ses + toast (anlık)
        └─→ Polling 5sn → KASA: ses + toast (yedek)
        ↓
KASA'da:
  🎵 2'li melodik ding (E6 → A6)
  📨 Toast: "🍽 MASA 5 · Yeni sipariş · ₺132"
  🌐 Browser notification (sekme arka plandaysa)
  🔄 Otomatik refresh (masa/sipariş listeleri)
```

## ✨ Özellikler

### 1. Çift Güvence (Realtime + Polling)
- **Realtime**: anlık (saniye altı), Supabase channel
- **Polling 5 sn**: realtime çalışmazsa fallback
- `seenOrderIds: Set` ile **duplicate ses çalmaz** — ikisi de aynı siparişi yakalasa bile sadece bir kere ses

### 2. Sessize Alma (Mute)
- Header'da hoparlör ikonu butonu (KILITLE'nin solunda)
- Tıklayınca tüm bildirim sesleri susar (çağrı + sipariş)
- **Toast'lar yine gelir, sadece ses kapalı**
- `localStorage` ile kalıcı — sayfa yenilense de hatırlar
- `useRef` pattern ile stale closure önlendi

### 3. Browser Notification
- İlk kasa açılışında izin ister (sessiz, reddederse rahatsız etmez)
- Sayfa **arka plandaysa** sistem bildirimi çalar — kasiyer başka pencerede çalışıyorsa fark eder
- 4.5 saniye sonra otomatik kapanır

### 4. Akıllı Filtre
- Sadece `source='qr'` olan siparişler
- Sadece son 30 saniye içinde gelen
- Status `new`/`preparing`/`ready` (eski siparişler için ses çalmaz)
- İlk fetch sessiz — sayfa açılışında geçmiş bildirim çalmaz

### 5. Ayrı Ses (Çağrıdan Farklı)
- **Çağrı** = `playCall()` — 3'lü tiz ding (C6-C6-E6) acil
- **Yeni Sipariş** = `playOrderDing()` — 2'li melodik (E6→A6) bilgi verici
- Triangle wave kullanır, sıcak ton

## 📦 Dosyalar

```
lib/sounds.ts                       (+ playOrderDing)
lib/actions/orders-notify.ts        (yeni - getRecentNewOrders)
app/kasa/kasa-board.tsx             (state + polling + realtime + mute toggle)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(d2): kasa yeni sipariş bildirimi (ses + toast + browser notification + mute)"
git push
```

## 🧪 Test

### Temel Akış
1. Kasa aç → giriş → Masalar tab
2. Telefondan QR menü aç → ürün ekle → sipariş ver
3. **En geç 5 saniye içinde:**
   - 🎵 2'li melodik ding ✅
   - 📨 Üstten toast: "🍽 MASA X · Yeni sipariş · ₺TUTAR" ✅
   - Masa kartı otomatik dolu state'ine geçer ✅

### Sessize Alma
1. Header'da KILITLE'nin solundaki **🔊 hoparlör ikonu** tıkla
2. İkon **🔇 (kırmızı/warn)** olur
3. Telefondan sipariş ver → **ses GELMEZ**, ama toast yine gelir
4. Tekrar tıkla → ses açılır
5. Sayfayı yenile → **ayar hatırlanır** (localStorage)

### Browser Notification
1. İlk kasa açılışında browser sorar: "Aleg bildirim göndersin mi?" → **İzin Ver**
2. Kasa sekmesini arka plana al (başka sekmeye geç)
3. Telefondan sipariş ver
4. **Sistem bildirimi düşer** (sağ alt köşede): "Yeni sipariş - 1 yeni sipariş geldi"

### Çoklu Sipariş
1. Hızlı arka arkaya 3 farklı masadan sipariş ver
2. Beklenen: 3 ses + 3 toast (her biri için ayrı)
3. Bump animasyonu × 3 kere

### Realtime + Polling Yedeği
- Network tab açık iken kasa sayfası
- Her 5 saniyede `getRecentNewOrders` request görmen lazım
- WebSocket bağlantısı `realtime.supabase.co` aktif olmalı (yeşil)
- Realtime kesilse bile polling 5 saniye içinde yakalar

## 💡 Teknik Notlar

### Stale Closure Çözümü
Polling/realtime callback'leri uzun yaşar. `muted` state'i `useEffect` deps'ine koysam interval her toggle'da reset olurdu (ses kayıpları). Bunun yerine `mutedRef` kullanıldı:

```typescript
const mutedRef = useRef(muted);
useEffect(() => { mutedRef.current = muted; }, [muted]);

// Callback içinde:
if (!mutedRef.current) playOrderDing();
```

Sonuç: interval bir kere kurulur, ses kontrolü her seferinde **güncel** muted değerine bakar.

### seenOrderIds Set Pattern
İlk fetch'te tüm ID'leri "görüldü" işaretler — geçmiş siparişler için ses çalmaz. Sonraki fetch'lerde sadece yeni ID'ler çalar.

100'den fazla birikince Set otomatik 50'ye düşer (memory leak önler).

### Channel Name
`orders_new_kasa_board` — çağrı sistemininkinden (`waiter_calls_kasa_board`) farklı, conflict olmaz.

## 🗺️ Durum

| | |
|---|---|
| Çağrı butonları (D1) | ✅ |
| Bildirim fix (KasaBoard) | ✅ |
| Masa rozeti | ✅ |
| **D2 - Yeni sipariş bildirimi** | **✅ BU PAKET** |
| Garson ekranı | 🔜 |
| Süper admin paneli | 🔜 |

## 🔜 Sonra

### Garson Ekranı
Garson kendi telefonu/tabletinde:
- Aktif çağrılar (D1 altyapısı hazır)
- Hazır siparişler (mutfaktan gelen — D2 altyapısı yardımcı)
- Açık masalar
- "✓ Teslim ettim" akışı

### Diğer Seçenekler
- Süper admin paneli
- Modül yönetimi UI
- Mutfak ekranı bildirimleri (mutfak için ayrı ses)
- Stok takibi

Test et, çalışırsa **"garson ekranı başlat"** veya başka bir şey de. 🚀
