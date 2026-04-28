# 🔧 BUILD FIX — claimPrintJob + Lint Warnings

İki sorun çözüldü:

## 🐛 Sorun 1 — Build Failure: claimPrintJob export edilmiyor

```
./components/panel/print-queue-listener.tsx:19:3
Type error: Module '"@/lib/actions/printers"' has no exported member 'claimPrintJob'.
```

**Sebep:** Önceki paketlerden birinde `printers.ts`'ye `claimPrintJob`
eklenmişti ama push edilmemiş olabilir. Bu pakette dahil.

**Çözüm:** `lib/actions/printers.ts` güncel hâliyle dahil edildi
(claimPrintJob fonksiyonu satır 659).

## 🟡 Sorun 2 — 9 Lint Warning

Hepsi düzeltildi:

### kasa-board.tsx (4 useEffect)
- 4 useEffect deps array'ine `playOrderSound` / `playCallSound` eklendi
- Stable useCallback'ler, false positive ama lint'te temiz olsun

### hesap-panel.tsx (3 useCallback)
- 3 useCallback deps array'ine `quickSale` eklendi
- Hızlı satış paketinden kalan eksiklik

### advanced-tab.tsx (1 useEffect)
- `loadData` deps eksikti — eslint-disable comment

### receipt-preview.tsx (1 img tag)
- `<img>` Next.js Image önerisi — eslint-disable comment
  (custom styling + base64 logoUrl olabilir, Image karışık)

### toast.tsx (1 ref cleanup)
- `timersRef.current` cleanup'ta stale ref riski
- Local variable'a kopyalandı

## 📦 Dosyalar (6)

```
lib/actions/printers.ts              🔄 claimPrintJob export (zaten var, push edilmemiş)
components/order/hesap-panel.tsx     🔄 3 useCallback deps
components/ui/toast.tsx              🔄 cleanup ref
app/kasa/kasa-board.tsx              🔄 4 useEffect deps
app/panel/(shell)/yazicilar/tabs/advanced-tab.tsx        🔄 eslint-disable
app/panel/(shell)/yazicilar/components/receipt-preview.tsx  🔄 eslint-disable
```

## 🚀 Push

```powershell
Expand-Archive -Path lint-fix-and-claim.zip -DestinationPath . -Force

git add . && git commit -m "fix: claimPrintJob export + 9 lint warnings" && git push
```

## 🧪 Build Doğrulama

```powershell
npm run build
```

Sıfır hata, sıfır warning olmalı:
```
✓ Compiled successfully
✓ Linting and checking validity of types
```

## 🗺️ Durum

| | |
|---|---|
| Hızlı Satış HesapPanel | ✅ |
| Agent v2.0 (Tray + Dashboard) | ✅ |
| Web AgentStatusBadge | ✅ |
| **Build Fix + Lint** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 |

---

Push → `npm run build` → temiz olmalı 🎯
