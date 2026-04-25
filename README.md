# 🔧 KASIYER-MANAGER KASA LİNK FİX

Kasiyerler sayfasındaki "KASA'YI AÇ ↗" butonu `panel.alegstudio.com/kasa` açıyordu → middleware `/panel/kasa`'ya rewrite → 404.

**1 dosya.**

## 🐛 Sorun

Sidebar fix'inde sadece `nav-config` linkleri çözmüştük. Ama `cashier-manager.tsx`'te ayrıca bir "Kasa'yı Aç" button vardı, o atlanmıştı:

```tsx
<a href="/kasa" target="_blank">  // panel subdomain'de 404
```

## ✅ Fix

`onClick` ile subdomain kontrolü — panel.* subdomain'indeyse root domain'e yönlendir:

```tsx
<a
  href="/kasa"
  onClick={(e) => {
    if (window.location.hostname.startsWith('panel.')) {
      e.preventDefault();
      const rootHost = window.location.hostname.replace('panel.', '');
      window.open(`${window.location.protocol}//${rootHost}/kasa`, '_blank');
    }
  }}
  target="_blank"
>
```

Sonuç:
- `panel.alegstudio.com` → KASA'YI AÇ → ✅ `https://alegstudio.com/kasa` (yeni sekme)
- `localhost:3000/panel/kasiyerler` → KASA'YI AÇ → ✅ `localhost:3000/kasa` (default href çalışır)

## 📦 Dosya

```
app/panel/(shell)/kasiyerler/cashier-manager.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(panel): kasiyer-manager kasa link → root domain on subdomain" && git push
```

## 🧪 Test

1. Push sonrası **hard refresh** (Ctrl+Shift+R)
2. `panel.alegstudio.com` → giriş → Kasiyerler
3. **KASA'YI AÇ ↗** tıkla
4. ✅ Yeni sekmede `alegstudio.com/kasa` açılır (404 değil)

## 💡 Mimari Not

İleride başka yerlerde de `/kasa` linki olursa aynı pattern uygulanır. Veya `lib/utils/kasa-url.ts` helper yazılabilir:

```typescript
export function getKasaUrl(): string {
  if (typeof window === 'undefined') return '/kasa';
  if (window.location.hostname.startsWith('panel.')) {
    return `${window.location.protocol}//${window.location.hostname.replace('panel.', '')}/kasa`;
  }
  return '/kasa';
}
```

Şu anki durumda 2 yerde inline kontrol — yeterli. 3. yerde gerekirse helper yazarız.
