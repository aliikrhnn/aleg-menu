# QR MENÜ — MODES + DİNAMİK SELAMLAMA

İki iş tek pakette:

1. 🌅 **Saate göre selamlama** — 4 zaman dilimi (günaydın / iyi günler / iyi akşamlar / iyi geceler)
2. 🎯 **Mode tabs (al götür / paket)** — işletme ayarlarına göre koşullu göster

**2 dosya, migration yok.** Modül sistemi zaten kurulu, sadece menüye bağladık.

## 🌅 Selamlama — 4 Zaman Dilimi

**Önce:** 3 dilim — günaydın (< 11), iyi günler (< 18), iyi akşamlar

**Sonra:** 4 dilim, daha doğal:

| Saat | Türkçe | İngilizce |
|---|---|---|
| 05 - 11 | Günaydın | Good morning |
| 11 - 17 | İyi günler | Good afternoon |
| 17 - 22 | İyi akşamlar | Good evening |
| 22 - 05 | İyi geceler | Good night |

Gece müşterisi artık "iyi akşamlar" değil "iyi geceler" görecek. Daha sıcak.

## 🎯 Mode Tabs — Panel Kontrolü

**Önce:** Menü her zaman 3 tab gösteriyordu (Masada / Al götür / Paket), işletme delivery yapmasa bile.

**Sonra:** İşletme panelinden açılmış olanlar gösteriliyor.

### Nasıl Çalışır

**İşletme panelinde** (Ayarlar → Siparişler sekmesi), zaten mevcut olan toggle'lar:
- ✅ Masada (dine-in)
- ✅ Al götür (pickup)
- ✅ Paket servis (delivery)

Bu toggle'lar `businesses.order_config.modes` kolonunda JSONB olarak saklanıyor:
```json
{
  "modes": {
    "dinein": true,
    "pickup": true,
    "delivery": false
  }
}
```

### Menü Davranışı

- **Birden fazla mod aktif** → Tab'lar görünür, müşteri seçer
- **Tek mod aktif** → Tab'lar gizlenir (kafa karıştırmaz)
- **QR ile gelmişse** → Otomatik "Masada" seçili
- **QR yoksa ve dinein kapalıysa** → ilk aktif modun biri seçili

### Gerçek Senaryolar

**Kafe sadece al götür yapıyor:**
- Panelde: dinein ❌, pickup ✅, delivery ❌
- Menüde: tab yok, otomatik "Al götür"

**Tam restoran:**
- Panelde: dinein ✅, pickup ✅, delivery ✅
- Menüde: 3 tab görünür

**Klasik kafe (delivery yok):**
- Panelde: dinein ✅, pickup ✅, delivery ❌
- Menüde: 2 tab (Masada / Al götür)

**Hayalet mutfak (sadece paket):**
- Panelde: dinein ❌, pickup ❌, delivery ✅
- Menüde: tab yok, otomatik "Paket"

## 📦 Dosyalar (2)

```
app/menu/[slug]/page.tsx           ← order_config fetch + MenuView'e pass
app/menu/[slug]/menu-view.tsx      ← activeModes logic + koşullu tab render
```

## 🚀 Kurulum

```powershell
# 2 dosyayı üstüne yaz
git add .
git commit -m "feat(qr-menu): dynamic greeting + mode tabs based on order_config"
git push
```

Migration yok, hot reload yeter.

## 🧪 Test Senaryoları

### ✅ 1. Selamlama
1. Menüyü gece 23:00'te aç → ✅ "İyi geceler"
2. Sabah 09:00'da → ✅ "Günaydın"
3. Öğlen 14:00'te → ✅ "İyi günler"
4. Akşam 19:00'da → ✅ "İyi akşamlar"

### ✅ 2. Mod Tabları — 3'ü Açık
1. Panel → Ayarlar → Siparişler → 3 modu da aç
2. Menüyü aç → ✅ 3 tab görünür: Masada / Al götür / Paket

### ✅ 3. Tek Mod — Tab Gizli
1. Panelde sadece Masada aç, diğerleri kapat
2. Menüyü aç → ✅ **Tab alanı tamamen görünmez**
3. Masada moduyla devam eder

### ✅ 4. İki Mod
1. Panelde: dinein ✅, pickup ✅, delivery ❌
2. Menüde → ✅ 2 tab: Masada / Al götür
3. "Paket" tabı yok

### ✅ 5. Delivery Only
1. Panelde: sadece delivery
2. Menü → ✅ Tab yok, "Paket" modu otomatik seçili

### ✅ 6. QR Test
1. Dinein açık, QR ile gir
2. ✅ Masada seçili, diğer tablar görünür ama Masada aktif

## 💡 Teknik Detaylar

### activeModes Memoized
```tsx
const activeModes = useMemo(() => {
  const m = orderConfig?.modes || { dinein: true, pickup: false, delivery: false };
  return {
    dinein: m.dinein !== false,
    pickup: !!m.pickup,
    delivery: !!m.delivery,
  };
}, [orderConfig]);
```

orderConfig değişince re-compute. Güvenli default: dinein açık.

### Initial Mode Logic
```tsx
const initialMode = qrTable
  ? 'dinein'
  : activeModes.dinein ? 'dinein'
    : activeModes.pickup ? 'pickup'
      : activeModes.delivery ? 'delivery'
        : 'dinein';  // fallback
```

QR varsa masada, yoksa aktif olanın önceliği: dinein > pickup > delivery.

### Koşullu Tab Render
```tsx
{(() => {
  const visibleModes = allModes.filter((m) => activeModes[m.id]);
  if (visibleModes.length <= 1) return null; // gizle
  return <tabs>...</tabs>;
})()}
```

IIFE içinde filter + koşul → tek mod için DOM temiz.

### Safe Default
page.tsx:
```tsx
orderConfig={
  business.order_config || {
    modes: { dinein: true, pickup: true, delivery: false },
  }
}
```

`order_config` eski işletmelerde null olabilir, default obje ile korumalı.

## 📋 Durum

| İş | Durum |
|---|---|
| QR Menü Paket 1 (görsel) | ✅ |
| QR Menü Paket 2 (animasyon) | ✅ |
| **Selamlama + Modes** | **✅ BU PAKET** |
| QR Menü Paket 3 (shimmer + ornament) | 🔜 |
| Garson ekranı | 🔜 |

## 🔜 Sıradaki İşler

Seçeneklerin:

### A) QR Menü Paket 3 — İnce Dokunuşlar
- Shimmer loading skeleton
- Boş hal SVG illustrasyonları
- Ornament dekorlar
- Gece modu toggle

### B) İşletme modül yönetimi UI
- Panel'e "Modüller" sekmesi
- `business_modules` tablosu üzerinden loyalty/delivery/stock aktifleştirme
- Dashboard'da sadece aktif modül kartları göster

### C) Garson Ekranı
- Mobil optimize garson sipariş alma
- Masa seç → ürün ekle → mutfağa gönder

Hangisini istersen söyle. Push → test → tercih et. 🚀
