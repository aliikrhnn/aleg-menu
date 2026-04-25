# 🔐 AUTH İZOLASYONU + SİPARİŞ TAZELE FİX

İki kritik sorun bir arada:

1. **Cross-tab Auth Leak** (CRITICAL güvenlik) — Garson login'i kasaya da geçiyordu
2. **Sipariş teslim sonrası UI değişmiyor** — garson teslim ettiğinde panel POS / kasa görmüyordu

**5 dosya · Migration yok.**

## 🐛 Sorun 1: Cross-Tab Auth Leak

### Belirti
- Aynı browser'da garsona girince → kasa sekmesi açıldığında otomatik garson hesabıyla giriş yapılıyordu
- Garsonun kasa yetkilerine erişimi olmamasına rağmen kasa açılıyordu

### Sebep
`lib/cashier-session.tsx` her iki uygulamada (kasa ve garson) aynı `localStorage` anahtarlarını kullanıyordu:
- `aleg-kasa-session`
- `aleg-kasa-activity`
- `aleg-kasa-autolock-minutes`

İki uygulama tek session paylaşıyordu — biri login olunca diğeri de otomatik açılıyordu.

### Çözüm
`CashierSessionProvider`'a **`appKey`** prop'u eklendi. Storage key'leri uygulama bazında ayrıldı:

| App | Session Key | Activity Key | AutoLock Key |
|-----|-------------|--------------|--------------|
| Kasa | `aleg-kasa-session` | `aleg-kasa-activity` | `aleg-kasa-autolock-minutes` |
| Garson | `aleg-garson-session` | `aleg-garson-activity` | `aleg-garson-autolock-minutes` |

Layout'larda doğru `appKey` geçilir:
- `app/kasa/layout.tsx`: `<CashierSessionProvider appKey="kasa">`
- `app/garson/layout.tsx`: `<CashierSessionProvider appKey="garson">`

İki uygulama **tamamen izole**, aynı browser'da bile cross-contamination yok.

## 🐛 Sorun 2: Garson Teslim Sonrası Değişiklik Yok

### Belirti
- Garson "✓ Teslim Ettim" basıyor → kart kayboluyor (optimistik update var)
- Ama panel POS'taki ve kasa orders sayfasındaki sipariş listesinde değişiklik **görünmüyor**

### Sebep
1. `markOrderDelivered` server action'ında `revalidatePath` çağrısı yoktu → panel SSR cache eski veriyi gösteriyordu
2. Polling 8sn'de bir tazeliyor ama tarayıcı sekmesi arkaplandayken JS interval pause olabiliyor → kullanıcı kasaya geçtiğinde kaçırılan değişiklik vardı

### Çözüm

**`lib/actions/waiter.ts`** — markOrderDelivered'a revalidate eklendi:
```typescript
revalidatePath('/panel/pos');
revalidatePath('/panel/dashboard');
revalidatePath('/panel');
```

**`app/panel/(shell)/pos/orders-board.tsx`** — visibility change listener eklendi:
```typescript
const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refreshOrders();
  }
};
document.addEventListener('visibilitychange', onVisibilityChange);
```

Üçlü tazele kombi:
- ⚡ **Realtime** (Supabase channel)
- 🔄 **Polling 8sn** (kopukluklara karşı)
- 👁️ **Visibility change** (sekme arkaplandayken kaçırılan güncellemeler için)

## 📦 Dosyalar (5)

```
lib/cashier-session.tsx                              (appKey prop sistemi)
lib/actions/waiter.ts                                (revalidatePath)
app/kasa/layout.tsx                                  (appKey="kasa")
app/garson/layout.tsx                                (appKey="garson")
app/panel/(shell)/pos/orders-board.tsx               (visibility refresh)
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(auth): kasa/garson session izolasyonu + delivered order refresh"
git push
```

## ⚠️ Deploy Sonrası — Önemli Bilgi

**Garson tarafında kullanıcılar bir kez yeniden giriş yapmak zorunda kalacak.**

Sebep: localStorage key'i değişti (`aleg-kasa-session` → `aleg-garson-session`). Eski oturum yeni key'de bulunmadığı için sayfa açılınca login ekranına düşer.

Bu **bir defalık** bir geçiş, normaldir.

## 🧪 Test

### A) Auth İzolasyon Testi (CRITICAL)
1. Browser'da kasa ve garson sekmelerini **kapat** (eski oturumlar temizlensin)
2. Garson sekmesi aç → garson hesabıyla PIN gir → ✅ board açılır
3. **Aynı browser'da yeni sekme** → kasa sekmesi aç
4. ✅ Kasa **PIN ister** (otomatik giriş YOK)
5. Kasa hesabıyla gir → kasa açılır
6. Garson sekmesine geç → ✅ hâlâ garson hesabıyla açık
7. ✅ İki uygulama bağımsız çalışıyor

### B) Sipariş Teslim Refresh Testi
1. **3 sekme aç:** Garson, Kasa (orders sekmesi), Panel POS
2. Bir siparişi mutfak/POS'tan **"Hazır"** yap
3. Garson sekmesinde 🍽 Hazır sekmesinde sipariş görünür
4. **"✓ Teslim Ettim"** tıkla
5. Garson: kart anında kaybolur ✅
6. Kasa orders sekmesi: 8sn içinde otomatik kaybolur ✅
7. Panel POS: 8sn içinde otomatik kaybolur ✅

### C) Background Tab Testi
1. Garson sekmesi açık, kasa sekmesi açık
2. Kasa sekmesinden başka sekmeye geç (kasa arkaplanda)
3. Garson'da bir sipariş teslim et
4. Kasa sekmesine geri dön
5. ✅ Sekme görünür olur olmaz refresh tetikler, sipariş kaybolur

## 💡 Mimari Notlar

### Storage Key Pattern
```typescript
function storageKeys(appKey: AppKey) {
  return {
    session: `aleg-${appKey}-session`,
    activity: `aleg-${appKey}-activity`,
    autoLock: `aleg-${appKey}-autolock-minutes`,
  };
}
```

İleride `kds`, `mutfak` gibi yeni uygulamalar eklenirse aynı pattern uygulanır.

### Hâlâ Sorun Varsa
Eğer teslim sonrası hâlâ değişiklik gözükmüyorsa, **Supabase realtime publication** kontrol edilmeli. SQL Editor'da:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

`orders` tablosu listede olmalı. Yoksa:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

(Migration `0007_realtime_orders.sql` bunu zaten yapıyor olmalı.)

## 🗺️ Durum

| | |
|---|---|
| Garson rolü ayrımı + label fix | ✅ |
| **Auth izolasyon + sipariş refresh** | **✅ BU PAKET** |
| Süper admin paneli | 🔜 |
| Modül yönetimi | 🔜 |

## 🔮 Sonra İyileştirmeler

- **Garson sipariş detay modal** — hazır sekmesinden tıklayınca tüm ürünler/notlar
- **Masa detay modal** — açık siparişler/ödeme bilgisi
- **Browser notification** — uygulama arkaplandayken sistem bildirimi
- **PWA** — telefon ana ekrana ekle
- **Ödeme sonrası order arşivleme** — eski siparişler ayrı tabloya

Push → deploy → garsonda yeniden login → test et 🚀
