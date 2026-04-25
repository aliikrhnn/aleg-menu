# LINT FİX — D2 unused state

**1 dosya.**

## 🐛 Sorun

```
Error: 'seenOrderIds' is assigned a value but never used.
Error: 'newOrderBump' is assigned a value but never used.
```

`seenOrderIds` state olarak tutuluyordu ama hiçbir UI render etmedik (sadece setter'da updater function ile mutate ediyorduk). `newOrderBump` ise hiç kullanılmamıştı (UI'da animasyon planlamıştım, eklemedim).

## ✅ Fix

- `seenOrderIds` state → `seenOrderIdsRef` (`useRef<Set<string>>`)
  - Render trigger gerekmediği için ref daha doğru
  - Tüm `setSeenOrderIds(prev => ...)` çağrıları → `seenOrderIdsRef.current = ...`
- `newOrderBump` tamamen silindi

Bonus: Realtime callback temizlendi — gereksiz iç içe `setSeenOrderIds(prev => ...) → (async () => ...)` IIFE pattern'i kaldırıldı, düz async function oldu.

## 📦 Dosya

```
app/kasa/kasa-board.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(lint): seenOrderIds → useRef, remove unused newOrderBump" && git push
```
