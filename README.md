# TYPE FİX v2 — CATEGORY REFS

TypeScript build hatası.

**1 dosya.**

## 🐛 Sorun

```
Type error: Argument of type 'HTMLElement | null' is not assignable to parameter of type 'HTMLDivElement | null'.
Property 'align' is missing in type 'HTMLElement' but required in type 'HTMLDivElement'.
```

`categoryRefs` Map'i `HTMLDivElement` bekliyor ama ref callback `<section>` element'ine bağlanıyor → `<section>` `HTMLElement` döner, `HTMLDivElement` değil.

## ✅ Fix

Map type'ı `HTMLElement` olarak genişlet:

```diff
- const categoryRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
+ const categoryRefs = useRef<Map<string, HTMLElement | null>>(new Map());
```

`HTMLElement` tüm HTML element'lerinin base type'ı, hem `<div>` hem `<section>` uyar. Scroll-spy için gereken tüm metodlar (`getBoundingClientRect`, `offsetTop` vs) `HTMLElement`'te zaten var.

## 📦 Dosya

```
app/menu/[slug]/menu-view.tsx
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(types): categoryRefs accept HTMLElement for section"
git push
```

Build geçmeli.
