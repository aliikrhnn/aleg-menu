# QR MENÜ — PAKET 2 · ANIMASYON TABAKASI

Mikro etkileşim animasyonları: sepete uçma, badge pop, haptic feedback, cart bar spring, drawer overshoot.

**3 dosya, migration yok.**

## 🎬 Yenilikler

### 1. ✨ Sepete Uçma Animasyonu (Arc)

Ürünün **+** butonuna basınca, **butonun pozisyonundan sepete doğru** turuncu daire içinde emoji uçar:

```
[Cortado +]   →  →  →  ↘
                          ↘
                            🛒 [3]
```

**Detaylar:**
- 700ms süre, cubic-bezier yay
- 30%'da hafif yukarı kavis (parabol his)
- 100%'da sepete varır, scale 0.2'ye küçülür, fade out
- Emoji yoksa **+** karakteri uçar
- `position: fixed`, `z-index: 100` — herhangi bir yerden uçabilir
- Concurrent uçuşlar — birden hızlı tıklarsan üst üste birikir

### 2. 💥 Sepet Badge Pop

Sayı her değiştiğinde 360ms spring animasyonu (1 → 1.45 → 1):

```css
@keyframes menu-badge-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.45); }
  100% { transform: scale(1); }
}
```

`key={badgeBump}` ile her ekleme sonrası React re-mount → animasyon tekrar tetiklenir.

### 3. 📳 Haptic Feedback (Mobile)

iOS/Android desteklediği yerde **8ms titreşim**:
- Sepete ekleme
- Sepet butonuna tıklama

```typescript
if (navigator.vibrate) navigator.vibrate(8);
```

8ms = neredeyse hissedilmez ama dokunsal onay var. Spam önleyici (try-catch ile).

### 4. ⬆️ Cart Bar Spring Çıkış

Sepete ilk ürün eklenince alt'tan alttan yukarı **spring** çıkar:

```css
@keyframes menu-cart-bar-in {
  0%   { transform: translateY(110%); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

`cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot ile dramatik giriş.

### 5. 🪟 Cart Drawer Spring Açılış

Açılış animasyonu daha **belirgin** + **spring**:

```diff
- animation: 'cdSlideUp 0.3s ease',  // tek normal
+ animation: 'cdSlideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
```

Ve translate mesafesi büyütüldü (20px → 60%) — alt'tan tam çıkma hissi.

### 6. 💎 Cart Bar Total Italic Serif

Sepet bar'da toplam tutar artık **italic serif 18px**:
```diff
- fontFamily: 'var(--f-mono)', fontSize: 14
+ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18
```

Diğer fiyat öğeleriyle uyumlu.

## 📦 Dosyalar (3)

```
app/menu/[slug]/menu-view.tsx     ← addToCart + flyToCart + flying items + cart button ref
app/menu/[slug]/cart-drawer.tsx   ← drawer spring overshoot
app/globals.css                    ← 2 yeni keyframe
```

## 🚀 Kurulum

```powershell
# 3 dosyayı üstüne yaz → push
git add .
git commit -m "feat(qr-menu): paket 2 - arc add to cart + badge pop + haptic + spring"
git push
```

CSS değişikliği var, browser cache temizle: **Ctrl+Shift+R**.

## 🧪 Test Senaryoları

### ✅ 1. Sepete Uçma Arc
1. QR menü aç (canlı veya local)
2. Bir ürünün **+** butonuna tıkla
3. ✅ Buton'dan **turuncu daire içinde emoji** uçar
4. ✅ Hafif yay çizerek sepete doğru gider
5. ✅ Sepete varınca küçülerek kaybolur
6. Hızlı tıkla → birden çok eş zamanlı uçabilir

### ✅ 2. Badge Pop
1. Sepete ürün ekle
2. ✅ Sepet butonundaki sayı **1.45 büyüyüp** geri gelir (spring)
3. Tekrar ekle → tekrar pop

### ✅ 3. Haptic (Mobile)
1. Telefondan QR menüye gir
2. + butonuna tıkla
3. ✅ Hafif titreşim hisset (8ms)
4. Sepet butonuna tıkla → ✅ titreşim

### ✅ 4. Cart Bar Spring
1. Sepet boş, alt bar yok
2. İlk ürünü ekle
3. ✅ Alt bar **dramatik spring** ile yukarı çıkar (overshoot)

### ✅ 5. Drawer Açılış
1. Cart bar'a tıkla
2. ✅ Drawer alt'tan **spring** ile açılır (yukarı kavis hissi)
3. Backdrop blur efekti

### ✅ 6. Italic Total
1. Sepete birkaç ürün ekle
2. Cart bar'daki toplam → **italic serif 18px** font

## 💡 Teknik Detaylar

### Flying Item Animation Pattern

Her uçan item'ın kendi **dynamic keyframe**'i var (id'sine göre):

```jsx
<style jsx>{`
  @keyframes fly-${item.id} {
    0% { transform: translate(0, 0) scale(1); }
    30% { transform: translate(${dx*0.3}px, ${dy*0.15}px) scale(1.1); }
    100% { transform: translate(${dx}px, ${dy}px) scale(0.2); }
  }
`}</style>
```

Bu sayede her item'ın **kendi başlangıç-bitiş koordinatı** olabilir. dx/dy butonun pozisyonundan sepete olan farktan hesaplanır.

700ms sonra item state'ten silinir (memory leak önleyici).

### Concurrent Uçuş Limiti

Teorik limit yok ama pratikte:
- Çok hızlı tıklarsan ekran 5+ uçuyla dolabilir
- 700ms hızlı bittiği için kullanıcı normal kullanımda 1-2 görür
- Performans sorunu yok (CSS transform GPU accelerated)

### Haptic API Uyumluluk

- **iOS Safari**: Apple navigator.vibrate desteklemiyor (gizlilik)
- **Android Chrome**: Çalışır
- **Desktop**: Sessiz (bir şey olmaz)

iOS için alternatif: react-native gibi tarafa geçince Apple Haptic API kullanılır. Şu an web limitleri içinde.

### Drawer Spring Cubic Bezier

```
cubic-bezier(0.34, 1.56, 0.64, 1)
```

Bu bezier "**iOS Apple-style spring**" — overshoot yapar, geri gelir. Material Design'da farklı (daha yumuşak), iOS'ta daha enerjik.

## 📋 Durum

| Paket | Durum |
|---|---|
| QR Menü Paket 1 (görsel) | ✅ |
| **QR Menü Paket 2 (animasyon)** | **✅ BU PAKET** |
| QR Menü Paket 3 (ince detaylar) | 🔜 |
| Garson ekranı | 🔜 |

## 🔜 Paket 3 — İnce Dokunuşlar

Sırada gelenler:
- 💀 Shimmer skeleton loading (menü yüklenirken)
- 🎨 Boş hal SVG illustrasyonları
- ✨ Ornament dekorlar (kategori arası, footer)
- 🌙 Gece modu toggle (opsiyonel)

Test et, çalışıyorsa **"paket 3 başlat"** de. 🚀
