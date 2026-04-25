# 🔧 LINT FIX — OrderSection unused

Pre-push lint hook'unun blokladığı tek **error**'ı düzeltir.

## 🐛 Hata

```
./app/kasa/table-detail-modal.tsx
828:10  Error: 'OrderSection' is defined but never used.
```

## ✅ Çözüm

Flat list refactor'da kullanılmaz hâle gelen iki dead helper silindi:
- `OrderSection` component (~240 satır)
- `formatElapsed` utility (sadece OrderSection kullanıyordu)

Dosya **2079 → 1833 satır**.

## 📦 Dosya (1)

```
app/kasa/table-detail-modal.tsx
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(lint): kullanılmayan OrderSection ve formatElapsed kaldırıldı"
git push
```

## ℹ️ Diğer Warning'ler

Lint çıktısında listenen diğerleri **warning** (error değil) ve **pre-existing** — bu paketin sorumluluğunda değil:

- `kasa-board.tsx`: `useEffect` exhaustive-deps (4 yerde)
- `panel/yazicilar/...`: `<img>` ve `useEffect` deps
- `components/ui/toast.tsx`: ref cleanup

Pre-push hook **sadece error'larda fail** ediyorsa bu paket yeterli. Warning'lerde de fail ediyorsa, sonraki paket olarak hepsi temizlenebilir.

Push ✓
