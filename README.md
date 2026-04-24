# QR MENÜ PAKET 2 — STYLED-JSX FİX

Build hatası: nested `<style jsx>` tag.

**2 dosya.**

## 🐛 Sorun

```
Error: Detected nested styled-jsx tag.
```

Flying items render'ı içinde her item için **dinamik keyframe** üretiyordum:

```jsx
<div ...>
  {item.emoji}
  <style jsx>{`
    @keyframes fly-${item.id} { ... }
  `}</style>
</div>
```

Ama dış component'te zaten bir `<style>` var → Next.js `styled-jsx` 2 düzeyli `<style jsx>` tag kabul etmiyor.

## ✅ Fix — CSS Variables ile Tek Global Keyframe

Her uçan item'ın kendi dynamic keyframe'i yerine, **CSS variable'larla dinamik koordinat** kullanıp tek global keyframe yazdım:

### `globals.css`'e eklendi:
```css
@keyframes menu-fly-to-cart {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  30% {
    transform: translate(var(--fly-mid-x), var(--fly-mid-y)) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--fly-dx), var(--fly-dy)) scale(0.2);
    opacity: 0;
  }
}
```

### `menu-view.tsx` flying item:
```tsx
<div
  style={{
    // ... pozisyon
    ['--fly-dx' as string]: `${dx}px`,
    ['--fly-dy' as string]: `${dy}px`,
    ['--fly-mid-x' as string]: `${dx * 0.3}px`,
    ['--fly-mid-y' as string]: `${dy * 0.15}px`,
    animation: 'menu-fly-to-cart 700ms cubic-bezier(...) forwards',
  } as React.CSSProperties}
>
  {item.emoji}
</div>
```

Aynı keyframe, **her item kendi koordinatlarını CSS variable olarak inject eder**. Daha temiz, daha hızlı, nested `<style jsx>` yok.

## 📦 Dosyalar (2)

```
app/menu/[slug]/menu-view.tsx     ← styled-jsx kaldırıldı, CSS var ekledi
app/globals.css                    ← menu-fly-to-cart keyframe
```

## 🚀 Push

```powershell
# 2 dosyayı üstüne yaz
git add .
git commit -m "fix(qr-menu): replace nested styled-jsx with CSS variables for fly animation"
git push
```

Build geçer, animasyon aynı şekilde çalışır.

## 🧪 Test

Push + deploy sonrası:
1. Ürünün + butonuna tıkla
2. ✅ Turuncu daire içinde emoji **arc çizerek sepete uçar**
3. ✅ Birden hızlı tıklarsan birden çok eş zamanlı uçabilir

Davranış değişmedi, sadece tekniği değişti.

## 📋 Durum

| İş | Durum |
|---|---|
| QR Menü Paket 2 | ✅ teslim |
| **Build fix (styled-jsx)** | **✅ BU PAKET** |
| Paket 3 | 🔜 |

Push çalışırsa **"paket 3 başlat"** de. 🚀
