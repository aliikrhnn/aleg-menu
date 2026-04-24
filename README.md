# TYPE FİX v9 — jsPDF setFillColor API hatası

**1 dosya.**

## 🐛 Sorun

```typescript
pdf.setFillColor(r, g, b, 'F'); // ← 4. param string, jsPDF bunu beklemiyor
```

jsPDF `setFillColor` imzası: `(r: number, g: number, b: number)` — 3 sayı alır. 4. parametre olarak string `'F'` geçmiş.

Eskiden belki farklı bir API'ye geçerken unutulan kod. Zaten alt satırda `setFill(pdf, '#A89788')` çağrısı aynı işi yapıyor → bu satır gereksiz.

## ✅ Fix

Hatalı satırı sildim:

```diff
  setFill(pdf, isPeak ? COLORS.accent : COLORS.ink2);
  if (!isPeak) {
-   const [r, g, b] = hexToRgb(COLORS.ink2);
-   pdf.setFillColor(r, g, b, 'F');
    setFill(pdf, '#A89788');
  }
  pdf.rect(x, barY, barW, h, 'F');
```

Davranış aynı kalır: pik bar'lar accent, diğerleri ink2 soluk (`#A89788`).

## 📦 Dosya

```
lib/utils/z-report-pdf.ts
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(types): remove bad jsPDF setFillColor call"
git push
```

Bu basit hata. Bu kez kesin geçer.

## 🗺️ Durum

v9'a kadar 8 iterasyon oldu. Sebep: pre-push hook her hatada kesildiği için hepsini bir kerede göremedik. Tek tek ilerliyoruz.

Başka hata çıkarsa bildir, devam ederiz. 🚀
