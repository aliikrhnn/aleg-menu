# QR MENÜ — PAKET 3 · İNCE DOKUNUŞLAR

Son dokunuşlar: shimmer loading, footer ornament, scroll-to-top.

**3 dosya, migration yok.**

## ✨ Yenilikler

### 1. 💀 Shimmer Loading Skeleton

**Önce:** Sayfa yüklenirken **boş beyaz ekran** (kötü ilk izlenim)

**Sonra:** Editorial yapıyı taklit eden **shimmer skeleton**:
- Hero alanı (logo + isim + büyük başlık)
- Search + mode tabs
- Kategori chip'leri  
- Featured carousel (200px)
- Ürün satırları (5 adet, stagger giriş)

```css
.shimmer-bar {
  background: linear-gradient(90deg, ...soft 0%, ...med 50%, ...soft 100%);
  background-size: 200% 100%;
  animation: shimmer-slide 1.4s infinite;
}
```

Soldan sağa kayan ışık efekti — kullanıcı **algılanan hızı** çok daha iyi hisseder.

Next.js otomatik olarak **`app/menu/[slug]/loading.tsx`** dosyasını Suspense fallback olarak kullanır. Sayfa data fetch ederken (60sn cache miss durumunda) bu skeleton görünür.

### 2. 🎨 Footer Ornament

Menünün altında editorial dokunuş:

```
        ── ✦ ──
        
       Karakoy Espresso
        İSTANBUL
        
        TARAFINDAN  aleg
```

Detaylar:
- Üstte **✦ ornament** yatay çizgilerle
- İşletme adı **italic serif 18px**
- Şehir mono uppercase
- "TARAFINDAN aleg" link → alegstudio.com (italic serif accent)
- Powered by tarzı ama daha **editorial dergi** havası

### 3. ⬆️ Scroll-to-Top Butonu

Uzun menülerde (scroll > 600px) sağ alt köşede:
- 42x42 yuvarlak buton, paper background, ince border
- Yukarı ok ikonu
- Cart bar varsa **84px yukarı** (üst üste binmez)
- **Cubic-bezier spring** ile çıkış animasyonu (overshoot)
- Tıklayınca smooth scroll + haptic
- Active scale-90 feedback

```tsx
{scrollY > 600 && <button .../>}
```

Sadece gerektiğinde görünür, yer kaplamaz.

## 📦 Dosyalar (3)

```
app/menu/[slug]/loading.tsx        ← YENİ - Suspense fallback skeleton
app/menu/[slug]/menu-view.tsx      ← Footer ornament + scroll-to-top
app/globals.css                     ← menu-scroll-top-in keyframe
```

## 🚀 Kurulum

```powershell
# 3 dosyayı üstüne yaz (loading.tsx yeni dosya)
git add app/menu/[slug]/loading.tsx app/menu/[slug]/menu-view.tsx app/globals.css
git commit -m "feat(qr-menu): paket 3 - shimmer loading + footer ornament + scroll-to-top"
git push
```

## 🧪 Test

### ✅ 1. Shimmer Loading
1. Tarayıcıyı **incognito** aç (cache yok)
2. `/menu/karakoy` adresine git
3. ✅ Önce **shimmer skeleton** görünür (sol-sağ kayan animasyon)
4. ~500ms sonra gerçek menü gelir
5. Network tab'ı yavaşlatırsan (Slow 3G) skeleton uzun süre görünür → güzel test

**Production sonrası**: 60sn cache var, ilk açan görür sonrakiler hızlı.

### ✅ 2. Footer Ornament
1. Menüyü açık tut, **en aşağıya scroll** et
2. ✅ Footer'da **── ✦ ──** ornament görünür
3. Altında işletme adı italic serif
4. Şehir mono uppercase
5. "TARAFINDAN aleg" linkine tıkla → alegstudio.com açılır

### ✅ 3. Scroll-to-Top
1. Menü uzun olsun (en az 5+ ürün)
2. Aşağı scroll et
3. **600px geçince** ✅ sağ alt köşede yukarı ok butonu **spring çıkış** yapar
4. Tıkla → ✅ Smooth scroll yukarı + hafif titreşim
5. Sepet bar varsa → buton üstünde, çakışma yok

## 💡 Teknik Detaylar

### Loading.tsx Otomatik
Next.js App Router'da `app/{path}/loading.tsx` dosyası **otomatik** olarak React Suspense fallback olarak kullanılır:

```
app/menu/[slug]/
├── page.tsx       ← async server component
├── loading.tsx    ← otomatik fallback (yeni)
└── menu-view.tsx
```

Hiçbir kod değişikliği yok — Next.js convention.

### Shimmer Performans
- Sadece CSS animation — JS yok
- GPU accelerated (`background-position`)
- 1.4s döngü — yavaş ama dikkat çekici
- 5 ürün satırı stagger — `animationDelay` 80ms arayla

### Scroll-to-Top Optimizasyon
- `scrollY > 600` koşullu render — DOM temiz
- `passive: true` scroll listener (mevcut)
- Haptic try-catch ile guard

### Footer Boşluğu
`pb-32` (128px alt padding) — floating cart button'ın altında kaybolmaz, hatta cart yokken bile güzel duruyor.

## 📋 Durum

| Paket | Durum |
|---|---|
| Paket 1 (görsel) | ✅ |
| Paket 2 (animasyon) | ✅ |
| Selamlama + modes | ✅ |
| **Paket 3 (incelikler)** | **✅ BU PAKET** |

## 🎯 Menü Tamamlandı!

QR menü artık tam profesyonel:
- ✨ Sinematik hero + scroll-spy + featured carousel
- 🎬 Sepete uçma arc + badge pop + haptic + spring
- 🌅 Saate göre selamlama + panel-driven mod tabları
- 💀 Shimmer loading + footer ornament + scroll-to-top

## 🔜 Sıradaki İşler

QR menüsü tamamlandı. Şimdi bunlardan birini seçebilirsin:

### A) 🍽 Garson Ekranı
- Mobil garson sipariş alma
- Masa seç → ürün ekle → mutfağa gönder
- Dokunmatik optimize

### B) 🎯 İşletme Modül Yönetimi UI
- Panel'e "Modüller" sekmesi
- Loyalty/Stock/Shifts/Reviews aktifleştirme
- `business_modules` tablosu

### C) 📊 Dashboard İyileştirmeleri
- Daha detaylı grafikler
- Trend göstergeleri
- Performans metrikleri

### D) 🔔 Notifications/Bildirimler
- Yeni sipariş ses
- Garson çağırma
- Mutfak alarm

### E) Başka bir şey
- Aklında ne varsa söyle

**Hangisini başlatalım?** 🚀
