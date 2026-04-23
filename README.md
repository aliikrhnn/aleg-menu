# LANDING DÜZELTMELERİ — FOOTER + SMOOTH SCROLL + INSTAGRAM

Üç küçük ama kritik düzeltme:

1. **Ürün kısmındaki linkler çalışmıyordu** — Özellikler/Fiyatlar/Modüller
   linkleri yanlış id'lere gidiyordu, bu yüzden tıklayınca hiçbir şey oluyordu
2. **Kayma efekti yoktu** — anchor linklere bastığında sayfa direkt zıplıyordu
3. **Instagram eksikti** — @alegstudio footer'da görünmüyordu

## ✨ Neler Değişti

### 1. Footer Ürün Linkleri Düzeltildi

**Önceden (çalışmıyordu):**
- `/#ozellikler` → eşleşen section yok → hiçbir şey olmaz
- `/#fiyatlar` → eşleşen section yok
- `/#moduller` → eşleşen section yok

**Şimdi (çalışıyor):**
- `/#features` → `<Features id="features">` section'ına kayarak gider
- `/#pricing` → `<Pricing id="pricing">` section'ına
- `/#modules` → `<Modules id="modules">` section'ına

### 2. Smooth Scroll Efekti

`globals.css`'e eklenen 3 yeni CSS kuralı:

```css
html {
  scroll-behavior: smooth;
}

section[id], [id] {
  scroll-margin-top: 88px;  /* Sabit nav yüksekliği kadar offset */
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  /* Erişilebilirlik: hareket azalt tercihi */
}
```

**Neden 88px scroll-margin?** Landing nav sabit (fixed), 72px yüksekliğinde.
Anchor'a kayarken section'ın üst kenarı nav'ın altına kırpılmasın diye 88px
boşluk bıraktık.

**Erişilebilirlik:** Cihaz "reduce motion" ayarı açıksa (iOS/Android
erişilebilirlik, Windows "show animations" kapalı) smooth scroll devre dışı
kalır — animasyon hassasiyeti olan kullanıcıları rahatsız etmez.

### 3. Instagram @alegstudio

- Sağ alt footer'da `● @ALEGSTUDIO` metin linki eklendi (mono font, accent
  dot)
- Instagram ikonu aktif hale getirildi — tıklanınca
  `https://instagram.com/alegstudio` yeni sekmede açılır
- Hover'da **110% scale** animasyonu
- Title tooltip: `Instagram · @alegstudio`
- Twitter ve LinkedIn ikonları **pasif** durumda (`opacity: 0.4`,
  `cursor: not-allowed`, tooltip: "Yakında") — hazır olunca aktif edilir

### 4. Nav Logo'su Düzeltildi

- Önceden `href="#"` → anchor'a gidiyordu, sayfa en üste zıplıyordu
- Şimdi `href="/"` → ana sayfaya gider

## 📦 Dosyalar (3)

```
app/globals.css                          ← Smooth scroll + scroll-margin CSS
components/landing/footer.tsx            ← Ürün linkleri + Instagram handle
components/landing/nav.tsx               ← Logo href düzeltmesi
```

## 🚀 Kurulum

1. Zip aç
2. İçeriği proje köküne kopyala (3 dosya üstüne yazar)
3. Dev sunucu çalışıyorsa otomatik yeniler

## 🧪 Test

### A) Smooth Scroll
1. Ana sayfayı aç (`/`)
2. Üst nav'dan **"Özellikler"** tıkla → yumuşak kayarak özellikler bölümüne insin
3. **"Fiyatlar"** → yumuşak kayma
4. **"Harita"** → yumuşak kayma
5. Nav üstte hâlâ görünür olmalı, section kırpılmamalı

### B) Footer Ürün Linkleri
1. Sayfanın en altına in (footer)
2. **Ürün** başlığı altında:
   - **Özellikler** → sayfa başına features bölümüne kaysın
   - **Fiyatlar** → pricing bölümüne kaysın
   - **Modüller** → modules bölümüne kaysın
   - **Yenilikler** → `/yenilikler` sayfası
   - **Yol Haritası** → `/yol-haritasi` sayfası

### C) Instagram
1. Footer'da sağ altta **"● @ALEGSTUDIO"** yazısı görünmeli (turuncu dot)
2. Tıkla → yeni sekmede `instagram.com/alegstudio` açılmalı
3. Yanındaki **Instagram ikonu** aktif — üzerine gelince büyümeli, tıklayınca
   aynı yere gider
4. **Twitter ve LinkedIn** ikonları soluk (opacity 0.4), tıklanmamalı

### D) Erişilebilirlik (Opsiyonel)
1. Sistem ayarlarından "Reduce motion" aç
2. Ana sayfaya git → anchor'a tıkla → **direkt zıplama** olmalı (smooth yok)

## 📍 Git Push

```powershell
cd C:\Users\aliik\OneDrive\Desktop\aleg-starter
git add .
git commit -m "fix: footer urun linkleri, smooth scroll, instagram handle"
git push origin main
```

## 🔧 Detaylar

- `scroll-behavior: smooth` modern tarayıcıların hepsinde destekli (Chrome 61+,
  Firefox 36+, Safari 15.4+)
- Mevcut FAQ section'ı `<section id="faq">` kullanıyor, buna ek kural ekledik
- Twitter ve LinkedIn'i yakında aktif ederken, bu dosyadaki `active: false`'u
  `true` yap + `url: 'https://twitter.com/alegstudio'` gibi ekle
- Sosyal medyalarda başka bir platform eklemek istersen aynı objet yapısında
  (`name`, `handle`, `url`, `active`, `d`) yenisini footer.tsx'e ekle
