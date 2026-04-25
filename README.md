# 🔧 KASA LİNK FİX — Subdomain'de Doğru Yere Götür

Panel sidebar'daki "Kasa Uygulaması" linki `panel.alegstudio.com/kasa` adresine gidiyordu. Ama:
- Middleware `panel.*` subdomain'inde URL'leri `/panel/*`'a rewrite ediyor
- `panel.alegstudio.com/kasa` → `/panel/kasa` route'a gider
- Ama `/panel/kasa` route'u **yok** (kasa root'ta `/kasa`)
- Sonuç: **404**

**1 dosya.**

## ✅ Fix

Sidebar'da `external: true` linkler için subdomain'deyken **root domain'e tam URL** ile yönlendir:

```diff
  const resolvedHref = external
-   ? item.href                                  // /kasa
+   ? isOnPanelSubdomain
+     ? `${window.location.protocol}//${window.location.hostname.replace('panel.', '')}${item.href}`
+     : item.href
    : ...
```

### Sonuç

**Eskiden:**
- `panel.alegstudio.com` → "Kasa Uygulaması" → `panel.alegstudio.com/kasa` → ❌ 404

**Şimdi:**
- `panel.alegstudio.com` → "Kasa Uygulaması" → `https://alegstudio.com/kasa` → ✅ açılır (yeni sekmede)
- `localhost:3000/panel` → "Kasa Uygulaması" → `localhost:3000/kasa` → ✅ açılır

External nav item'lar `target="_blank"` zaten ayarlı — yeni sekmede açılır.

## 📦 Dosya

```
components/panel/sidebar.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(panel): kasa link goes to root domain when on subdomain" && git push
```

## 🧪 Test

1. `https://panel.alegstudio.com` → giriş → ana sayfa
2. Sol menü → **Kasa Uygulaması** tıkla
3. ✅ Yeni sekmede `https://alegstudio.com/kasa` açılır
4. Kasa sayfası gelir (PIN ekranı varsa PIN, yoksa direkt panel)
5. Telefondan QR menüden çağrı yap
6. ✅ Kasada ses + toast + rozet

## 🔮 Sonra

Kasa sayfasında bildirimler çalışıyorsa:
- D2 başlat (yeni sipariş bildirimi)
- veya garson ekranı

Çalışmıyorsa debug ederiz.
