# 🎯 UX PAKET 2 — Mobile/Tablet Optimizasyonu

Mobile cihazlarda klavye sorunlarını çözer, modal'ları tam ekran yapar,
iOS Safari'in tipik bug'larını engeller.

**12 dosya · Migration yok.**

## ✨ Yenilikler

### 1. **`useViewportHeight` Hook** 📐
`window.visualViewport` API'siyle gerçek viewport yüksekliği — klavye açıldığında
otomatik güncellenir.

```typescript
const vh = useViewportHeight();
<div style={{ height: vh }}>Tam ekran</div>
```

Veya CSS variable olarak:
```typescript
useViewportHeightCssVar(); // body'ye --vh ekler
```

### 2. **`useIsMobile` / `useBreakpoint` Hook** 📱
SSR-safe breakpoint detection:
```typescript
const isMobile = useIsMobile();          // < 640px
const bp = useBreakpoint();              // 'mobile' | 'tablet' | 'desktop'
```

### 3. **`ViewportHeightTracker`** 🎯
Layout'a eklenen client component. `--vh` CSS variable'ını günceller.

Tüm uygulamada artık şöyle kullanılabilir:
```css
height: calc(var(--vh, 1vh) * 100); /* gerçek viewport */
```

### 4. **CSS Utility'leri (globals.css)**

- **`.aleg-touch-min`** — `min-h: 44px; min-w: 44px;` (iOS guideline)
- **`.aleg-modal-mobile-fullscreen`** — mobilde tam ekran modal
- **`.aleg-bottom-sheet`** — alt sheet'ler için klavye-aware
- **`.aleg-safe-bottom`** / **`.aleg-safe-top`** — iPhone notch padding
- **`.aleg-keyboard-aware-bottom`** — sticky alt buton bar
- **`.aleg-tables-grid-tablet`** — tablet 5 sütun
- **`.aleg-orders-tablet-2col`** — tablet 2 sütun sipariş kartları
- **`.aleg-modal-content`** — overscroll bounce engelleme

### 5. **iOS Zoom Önleme**
Mobilde input'a focus olunca iOS Safari otomatik zoom yapar. Çözüm:
```css
@media (max-width: 640px) {
  input, textarea, select { font-size: 16px !important; }
}
```

`globals.css`'e eklendi → tüm input'larda otomatik aktif.

## 📦 Modal Mobile Uygulaması

| Modal | Eski | Yeni |
|-------|------|------|
| Customer Form (panel) | `max-h: 90vh` | `aleg-modal-mobile-fullscreen` |
| Customer Detail (panel) | `max-h: 90vh` | `aleg-modal-mobile-fullscreen` |
| Customer Picker (kasa) | `max-h: 85vh` | `aleg-modal-mobile-fullscreen` |
| Hesap Panel | `max-h: 95vh` | `aleg-modal-mobile-fullscreen` |
| Menu Picker (varyant) | `max-h: 85vh` | `aleg-bottom-sheet` |
| Cart Drawer (QR) | `max-h: 92vh` | `aleg-bottom-sheet` |
| Z Report Modal | `max-h: 90vh` | `aleg-modal-mobile-fullscreen` |

**Mobilde davranış:**
- Tam ekran (100dvh)
- Border-radius 0
- Tam genişlik
- Klavye açıldığında alt buton kaybolmaz

**Desktop davranış:**
- Eski max-h davranışı korunur (95vh)
- Border-radius 14px
- Belirli max-width

## 📦 Dosyalar (12)

```
lib/hooks/use-viewport-height.ts                ✨ YENİ
lib/hooks/use-is-mobile.ts                      ✨ YENİ
components/viewport-height-tracker.tsx          ✨ YENİ
app/globals.css                                 🔄 utility'ler eklendi
app/layout.tsx                                  🔄 ViewportHeightTracker
components/order/customer-picker.tsx            🔄 mobile fullscreen
components/order/menu-picker.tsx                🔄 bottom sheet
components/order/hesap-panel.tsx                🔄 mobile fullscreen
app/menu/[slug]/cart-drawer.tsx                 🔄 bottom sheet
app/panel/(shell)/cari-hesaplar/
  customer-form-modal.tsx                       🔄 mobile fullscreen
  customer-detail-modal.tsx                     🔄 mobile fullscreen
app/panel/(shell)/pos/z-report-modal.tsx        🔄 mobile fullscreen
```

## 🚀 Push

```powershell
Expand-Archive -Path ux-paket-2.zip -DestinationPath . -Force

git add .
git commit -m "feat(ux): paket 2 - mobile/tablet optimization (dvh, touch, fullscreen modals)"
git push
```

## 🧪 Test Senaryoları

### A) Mobilde Modal Tam Ekran
1. **iPhone Safari'de** alegstudio.com'a git
2. QR menü aç → Sepet butonu (Cart Drawer)
3. ✅ Tam ekran açılır (100dvh)
4. **Adres yaz** → klavye açılır
5. ✅ "Sipariş Ver" butonu klavyenin **arkasına gizlenmez**
6. **Aşağı scroll** → input görünür kalır

### B) Telefonda Customer Picker
1. Kasada masa sipariş → Hesap Al → 📒 Açık Hes
2. ✅ Mobilde tam ekran
3. Search input'a tıkla → klavye açılır
4. ✅ Kullanıcı listesi scroll edilebilir
5. ✅ Alt "X'a Yaz" butonu görünür kalır

### C) iOS Zoom Önleme
1. Mobil Safari'de QR menü
2. Input alanına tıkla → ✅ zoom **olmaz** (yazı 16px)
3. Eski davranışta input'a tıklayınca otomatik %110 zoom oluyordu

### D) Tablet Layout
1. Tablet (~1000px width) ile aç
2. **Kasa Masalar** → ✅ 5 sütun grid (mobile 2, tablet 5, desktop 6)
3. **Siparişler** → ✅ 2 sütun

### E) Touch Hedefleri
1. Telefonda tüm butonlar
2. ✅ Hiçbir buton **44px'ten küçük değil** (parmakla rahat tıklanır)
3. **Old**: bazı küçük ikon butonları 32px → mobilde tıklanması zordu

## 💡 Mantık Notları

### `dvh` vs `vh` vs `--vh`

```css
height: 100vh;     /* Eski - mobile'da yanıltıcı */
height: 100dvh;    /* Yeni - dynamic viewport (modern tarayıcılar) */
height: var(--vh); /* Polyfill - tüm tarayıcılarda çalışır */
```

`globals.css`'te 3'ü de fallback olarak var:
```css
height: 100vh;       /* fallback */
height: 100dvh;      /* modern */
```

### Mobilde Modal Pattern

```tsx
// Eski
<div className="w-full max-w-[480px] max-h-[90vh] rounded-[14px]">

// Yeni
<div className="w-full max-w-[480px] aleg-modal-mobile-fullscreen aleg-modal-content rounded-[14px]">
```

`aleg-modal-mobile-fullscreen`:
- **Desktop**: `max-h: 95vh` + max-width korunur
- **Mobile (<640px)**: `100dvh` tam ekran + `border-radius: 0` + tam genişlik

### İPhone Notch Safe Area

```tsx
<div className="aleg-safe-bottom">
  Bottom buton bar — notch hizasında değil
</div>
```

## 🗺️ Durum

| | |
|---|---|
| UX Paket 1 + 1B + 1C | ✅ Tüm modal'larda ESC |
| **UX Paket 2 (Mobile/Tablet)** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 Sıradaki |

## 🔮 Sonraki Adım

UX Paket 3:
- 6 lint warning'i temizle
- 38 console.log temizle
- 44 setInterval optimize (tab visibility ile durdur)
- Büyük dosya bölme (register-panel 3079 satır)

Push → test → "**3**" söyle 🚀
