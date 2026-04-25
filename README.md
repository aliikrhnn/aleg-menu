# 👨‍🍳 GARSON EKRANI

Garson kendi telefon/tabletinde aktif çağrıları, hazır siparişleri ve masaları yönetir.

**6 dosya · Migration yok · Path: `/garson`**

## 🎯 Konsept

```
alegstudio.com/garson
   ↓
Kasiyer kartlarından kendi PIN'i ile gir
   ↓
4 sekme:
  🔔 Çağrılar   - aktif waiter_calls (badge: sayı)
  🍽 Hazır      - mutfaktan çıkmış siparişler (badge: sayı)
  📋 Açık Masa  - dolu/yeni/hazır durumlu masalar (badge: sayı)
  ◍ Tümü       - zone'lara göre tüm masalar
```

## ✨ Özellikler

### Mobile-First Tasarım
- Sticky header (garson adı + işletme + kontroller)
- Tab bar — segmented control, badge'ler
- 2-3 sütun grid (telefon → tablet)
- Büyük touch hedefler (44px+ butonlar)

### 🔔 Çağrılar Sekmesi
- Açıklama: emoji + buton adı + masa + zaman
- "✓ Çözüldüm" butonu (büyük yeşil)
- Realtime + 5sn polling
- Yeni çağrı → ses + toast + tab badge bump

### 🍽 Hazır Sekmesi
- Mutfaktan çıkmış (`status = 'ready'`) siparişler
- Item sayısı + tutar + bekleme süresi
- **3 dakikadan eski → kırmızı uyarı** ⚠ ("urgent" highlight)
- "✓ Teslim Ettim" butonu → status `delivered`
- Yeni hazır → ses + toast

### 📋 Açık Masa Sekmesi
- `live_status: active/new/ready/unpaid` durumlu masalar
- Çağrı varsa kırmızı 🔔 rozet
- Ödenmemiş tutar gösterilir

### ◍ Tümü Sekmesi
- Zone'lara göre gruplandırılmış (Bahçe, İç Mekan, vb.)
- Tüm masalar — boş, dolu, rezerve hepsi
- Çağrı rozet'leri burada da görünür

### Bildirim Sistemi
- **Aynı altyapı** — kasa ile paylaşılan ses ayarları
- `playCallSound` (çağrı için) + `playOrderSound` (sipariş için)
- Mute toggle (header'da, ayrı `aleg-garson-muted` localStorage)
- Realtime + polling fallback
- Stale closure çözümlü (`useRef` pattern)

### PIN Giriş
- **Aynı CashierLogin component** — kasa ile paylaşılır
- Aynı kasiyer hem kasada hem garsonda kullanabilir
- Lock & unlock akışı kasayla aynı

## 📦 Dosyalar (6)

```
app/garson/layout.tsx                        (theme + session provider)
app/garson/page.tsx                          (server - auth check + render)
app/garson/waiter-app.tsx                    (login + board switcher)
app/garson/waiter-board.tsx                  (4 tab + polling/realtime)
lib/actions/waiter.ts                        (getReadyOrders + markOrderDelivered)
components/panel/nav-config.ts               ("Garson Uygulaması" eklendi)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat: garson ekranı (4 tab - çağrılar/hazır/açık masa/tümü)"
git push
```

## 🧪 Test

### Kurulum
1. Vercel deploy bittikten sonra **hard refresh**
2. Panel → sidebar → "**Garson Uygulaması**" tıkla
3. Yeni sekmede `alegstudio.com/garson` açılır

### Login
1. Mevcut kasiyer kartlarından birini seç
2. PIN gir (kasa ile aynı PIN)
3. Garson dashboard açılır

### Çağrılar Sekmesi
1. Telefondan QR menüden bir çağrı yap
2. Garson ekranında:
   - 🔔 Tab badge "1" olur (pop animasyonu)
   - Ses çalar (panel'de seçilen çağrı sesi)
   - Toast belirir: "🔔 MASA X · Garson Çağır"
3. Çağrı kartı listede görünür
4. **✓ Çözüldüm** tıkla → kart kaybolur, "Çağrı çözüldü" toast
5. Kasada da aynı çağrı listeden silinir (senkron)

### Hazır Sekmesi
1. Bir siparişi mutfak ekranından (veya panel POS'tan) "Hazır" yap
2. Garson ekranı 5sn içinde:
   - 🍽 Tab badge artar
   - Ses (sipariş sesi)
   - Toast: "🍽 MASA X · Sipariş hazır · 3 ürün"
3. **3 dakikadan fazla beklerse** kart kırmızı uyarı border + ⚠
4. **✓ Teslim Ettim** tıkla → status `delivered`, kart kaybolur

### Masalar Sekmeleri
1. **📋 Açık Masa** → sadece dolu/aktif olanları gösterir
2. **◍ Tümü** → zone'lara göre tüm masalar
3. Çağrılı masalarda kırmızı 🔔 rozet (sağ üst, taşan)

### Mute + Lock
1. Header'da hoparlör ikonu → ses kapansın → sayfayı yenile → ayar hatırlanır
2. Header'da 🔒 → kilit ekranı → PIN ile aç

## 💡 Mimari Notlar

### Paylaşılan Component'ler
- `CashierLogin` — kasa ile aynı (`@/app/kasa/cashier-login`)
- `CashierSessionProvider` — aynı session provider
- Aynı PIN'le hem kasaya hem garsona girilir

### Realtime Channel
`garson_waiter_calls` — kasa-board'unkinden (`waiter_calls_kasa_board`) farklı, çakışma yok.

### Polling
- Çağrılar: **5sn**
- Hazır siparişler: **5sn**
- Masalar: **10sn** (daha az kritik)

### Ses Sistemi
- `getKasaSoundSettings(businessId)` — kasa ile aynı action
- `localStorage` key: `aleg-garson-muted` (kasa: `aleg-kasa-muted`)
- İşletme aynı sesleri kullanır (panel'de tek ayar)

## 🗺️ Durum

| | |
|---|---|
| D1 - Çağrı butonları | ✅ |
| D2 - Yeni sipariş bildirimi | ✅ |
| Bildirim sesleri | ✅ |
| **Garson ekranı** | **✅ BU PAKET** |
| Süper admin panel | 🔜 |
| Modül yönetimi UI | 🔜 |

## 🔮 Sonra

### İyileştirmeler
- **Sipariş detayı modal** — hazır sekmesinden tıklayınca tüm ürünler/notlar
- **Masa detayı** — masa kartına tıklayınca açık siparişler/ödeme
- **Browser notification** — uygulama arkaplandayken sistem bildirimi
- **PWA** — telefon ana ekrana ekle
- **Garson rolü ayrımı** — kasiyerden farklı PIN/rol (şu an aynı)

### Yeni Özellikler
- **Sipariş alma** — masaya gidince anlık QR menüden sipariş ekle
- **Çağrı ata** — bir çağrıyı belli garsona ata
- **Performans** — kim kaç çağrıya cevap verdi, ortalama süre

Test et, sonra ne istersen söyle. 🚀
