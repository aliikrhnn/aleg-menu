# 🔧 LINT FIX 2 — table-detail-modal PrintButton

## 🐛 Hata
```
./app/kasa/table-detail-modal.tsx
14:10  Error: 'PrintButton' is defined but never used
```

## ✅ Çözüm
`table-detail-modal.tsx` dosyasını **bu paketteki** ile **tam değiştir**.

`PrintButton` import'u zaten yok (UX Paket 1B'deki sürümde de yoktu).
Paket önceki ekstrakt sırasında lokal kopyana tam yazılmamış olabilir.

## 🚀 Push

```powershell
# Bu paketi extract ettikten sonra:
git add . && git commit -m "fix(lint): clean unused PrintButton import" && git push
```

## ⚡ Alternatif: Manuel Fix

Paket'siz hızlı fix istersen:
1. `app/kasa/table-detail-modal.tsx` dosyasını aç
2. İlk 20 satırda `import { PrintButton } ...` satırını bul ve **sil**
3. Push

Bu daha hızlı.
