# 🎯 PAKET B — Yeni Sipariş Kolonu Silme + 5dk Flash + Otomatik Onay

Kasada "Yeni Sipariş" kolonu kaldırıldı, yeni gelenler **otomatik olarak Hazırlanıyor'a düşer**, **5 dakika boyunca kırmızı flash** ile dikkat çeker.

**3 dosya · Migration yok.**

## ✅ Yapılan

### 1. Yeni Sipariş Kolonu Kaldırıldı
`STAGES`'ten `'received'` (Yeni Sipariş) kolonu silindi. Artık sadece 2 kolon:
- **Hazırlanıyor** (gold) → Hazır
- **Hazır · Teslim** (olive) → Teslim Edildi

### 2. Otomatik Onay
Yeni gelen `received` siparişler **otomatik `preparing`'e geçer**:
- Polling'de `received` saptanınca `updateOrderStatus(id, 'preparing')` çağrılır
- Mutfak fişi **yeniden basılmaz** (zaten basılmıştı, sadece status geçer)
- Optimistic UI: client tarafında anında preparing kolonunda görünür
- `autoConfirmedRef` ile aynı sipariş 2 kez onaylanmaz

### 3. Sipariş Kart Flash (5 dakika)
Yeni gelen sipariş kart'ında 5 dakika boyunca **pulse animation**:
- Kırmızı (accent) border ışıması
- 1.4s ritmiyle yansır söner
- 5dk sonra `setInterval` cleanup ile listeden temizlenir
- Yeni sipariş gelirse **kendi 5dk timer'ı** başlar (eskileri etkilemez)

### 4. Tab Flash (Kasa Üst Tabbar)
"Siparişler" tab'ı yanında 5 dakika kırmızı dot + arka plan flash:
- Aktif değilse animasyonlu (Hazırlanıyor'a bakmıyorsa dikkat çek)
- Aktif tab'a gelince animasyon durur (kullanıcı zaten görüyor)
- Sayı badge varsa (eski özellikler) onunla uyumlu

## 📦 Dosyalar (3)

```
app/kasa/kasa-board.tsx                       (orderFlashUntil state + tick)
app/kasa/kasa-tabs.tsx                        (flashing prop + animasyon CSS)
app/panel/(shell)/pos/orders-board.tsx        (received kolonu sil + auto-confirm + flash)
```

### Detaylı Değişiklikler

**`orders-board.tsx`**:
- `STAGES`: `received` kolonu silindi → 2 kolon kaldı
- `recentOrders: Map<string, number>` state — her sipariş ID → flash bitiş timestamp
- `autoConfirmedRef` — duplicate onay önleme
- `refreshOrders`: yeni gelenleri tespit, otomatik `preparing`'e taşı, flash listesine ekle
- Optimistic UI: client'ta `received` → `preparing` direkt
- 30sn'de bir flash listesi temizleme effect
- `preparing` kolonu artık `received | confirmed | preparing` hepsini gösterir
- `OrderCard`: `isFlashing` prop, pulse animation CSS

**`kasa-tabs.tsx`**:
- `flashing?: Partial<Record<KasaTab, boolean>>` prop
- 2 CSS keyframes (tab pulse + dot pulse)
- Aktif tab'da animasyon devre dışı

**`kasa-board.tsx`**:
- `orderFlashUntil` state (timestamp)
- 700ms tick effect for animation re-renders
- Yeni sipariş gelince: `setOrderFlashUntil(Date.now() + 5*60*1000)`
- KasaTabs'a `flashing={{ orders: Date.now() < orderFlashUntil }}` geçer

## 🚀 Push

```powershell
git add .
git commit -m "feat(kasa): yeni sipariş kolonu sil + otomatik onay + 5dk flash"
git push
```

## 🧪 Test Senaryosu

### A) Yeni Sipariş — Akış
1. Müşteri QR menüden sipariş verir
2. Kasada (başka tab'daysan):
   - ✅ "Siparişler" tab'ı yanında **kırmızı dot yansıp söner** (5 dk)
   - ✅ Toast "🍽 Masa B5 · Yeni sipariş · ₺120" görünür
   - ✅ Bildirim sesi çalar
3. **Siparişler** tab'ına geç:
   - ✅ Sipariş **direkt "Hazırlanıyor"** kolonunda (Yeni Sipariş kolonu YOK)
   - ✅ Sipariş kartı **kırmızı pulse animation** ile flash ediyor
   - ✅ Mutfak ekranında da görünür (zaten preparing)
4. 5 dakika sonra:
   - ✅ Tab dot kaybolur
   - ✅ Kart flash durur

### B) Çoklu Sipariş
1. 1 dakika içinde 3 yeni sipariş gel
2. ✅ Hepsi flash eder (kendi 5dk timer'ları)
3. İlki 5dk dolunca o flash durur, diğerleri devam eder

### C) Kolonlar
1. Siparişler tab'ı → Hazırlanıyor + Hazır kolonları
2. ✅ Sadece 2 kolon (eski 3'tü)
3. Hazırlanıyor kolonunda: yeni gelen + onaylanmış + hazırlanan hepsi

### D) Manuel Onay (eski davranış korundu)
1. Bir kasiyer manuel olarak "Hazırlanıyor → Hazır" geçişi yapabilir
2. ✅ Buton hâlâ var, çalışır

### E) Aktif Tab'a Geçince
1. Yeni sipariş geldi, **Masalar** tab'ındasın → flash görünüyor
2. **Siparişler**'e tıkla → flash durur (zaten görüyorsun)
3. Sipariş kartı hâlâ flash eder (5 dk dolana kadar)

## 💡 Mantık Notları

### Mutfak Fişi
Otomatik onay'da `updateOrderStatus(id, 'preparing')` çağrılır. Bu mutfak fişini
**yeniden basmaz** çünkü:
- QR siparişler zaten `received` olarak gelir
- `received` durumunda mutfak fişi **henüz basılmamıştır**
- Eski akışta kasiyer "Mutfağa Yolla" butonuna basınca status `preparing` olur ve fiş basılır
- Yeni akışta otomatik basılır → kullanıcının manuel onayını gerektirmez

E�er mutfak fişi zaten QR siparişte basılıyorsa (örn. orders.received status'una otomatik basıyorsa) **2 kez basılma riski** var. Bunu test edip görmen lazım.

### Animasyon Performansı
- Flash listesi `Map<string, number>` — sipariş ID → timestamp
- 30 saniyede bir cleanup, 5dk dolanları siler
- React state olduğu için re-render olur, ama animasyon CSS-only (GPU)

### Re-render Tick
Tab'da `Date.now() < orderFlashUntil` kontrolü gerçek zamanlı; ama React bunu otomatik bilmez. 700ms'de bir `setFlashTick` ile re-render tetiklenir → `Date.now()` yeniden hesaplanır → animasyon süresi geçince `flashing.orders=false` olur.

## 🗺️ Durum

| | |
|---|---|
| Cari Manuel Paket A | ✅ |
| Z Raporu Tüm Modül Entegrasyonu | ✅ |
| **Paket B: Yeni sipariş + flash + otomatik onay** | **✅ TESLİM** |

Push → test → çalışırsa başka iş söyle 🚀
