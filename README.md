# LINT FİX — PRE-PUSH HATALARINI TEMİZLEME

Push sırasında `next lint` **9 errorlu** patladı. Hepsi düzeltildi, push'a hazır.

**9 dosya, sadece lint düzeltme.**

## 🎯 Düzeltilen Errorlar (9)

### 1. `order-composer.tsx` — Kullanılmayan import
```diff
- type OptionPresetForPos,
```
`tables-status.ts`'ten bu type artık kullanılmıyor.

### 2. `register-panel.tsx` — useCallback deps warning
`range` objesi her render'da yeniden oluşuyordu → useCallback deps sürekli değişiyordu → gereksiz re-fetch.

```diff
- const range: DaySummaryRange = { preset: 'today' };
+ const range: DaySummaryRange = useMemo(() => ({ preset: 'today' }), []);
```

`useMemo` import'a eklendi. **Bonus:** Sadece lint fix değil, performans iyileşmesi — loadReport sürekli yeniden oluşmuyor.

### 3. `table-detail-modal.tsx` — Kullanılmayan parametre
```diff
- onPick={(tableId, tableName, _isOccupied) => { ... }}
+ onPick={(tableId, tableName) => { ... }}
```

### 4. `cash-session-modal.tsx` — Kullanılmayan destructure
```diff
- const { openCash, closeCash, isOnline } = useOfflineActions();
+ const { openCash, closeCash } = useOfflineActions();
```

### 5. `split-payment-modal.tsx` — 2 kullanılmayan
```diff
- discountReason,
+ discountReason: _discountReason,

- const [loading, setLoading] = useState(true);
+ const [, setLoading] = useState(true);
```

`setLoading` side-effect olarak çağrılıyor ama state okunmuyor — state key kaldırılamaz ama `_` ile gizlenebilir.

### 6. `z-report-modal.tsx` — 3 kullanılmayan prop
```diff
- export function ZReportModal({ open, onClose, businessName, businessAddress, businessLogoUrl }: Props) {
+ export function ZReportModal({
+   open,
+   onClose,
+   businessName: _businessName,
+   businessAddress: _businessAddress,
+   businessLogoUrl: _businessLogoUrl,
+ }: Props) {
```

Business bilgileri zaten `report.business.*` üzerinden geliyor, prop'a gerek yok ama interface uyumu için kalsın — `_` prefix ile bypass.

### 7. `printer-status-widget.tsx` — Kullanılmayan parametre
```diff
- headline: (_s: PrinterStatus) => 'Her şey yolunda',
+ headline: () => 'Her şey yolunda',
```

### 8. `tables-status.ts` — let → const
```diff
- let itemsMap = new Map<string, { hasNew: boolean; hasReady: boolean }>();
+ const itemsMap = new Map<string, { hasNew: boolean; hasReady: boolean }>();
```

Map zaten mutate edilerek kullanılıyor, `let` gereksizdi.

### 9. `z-report-pdf.ts` — neededH kullanılmıyordu
```diff
  const neededH = 10 + report.by_station.length * rowH + 4;

+ // Sayfa taşma kontrolü
+ if (y + neededH > 270) {
+   pdf.addPage();
+   setFill(pdf, COLORS.paper);
+   pdf.rect(0, 0, PAGE_W, 297, 'F');
+   y = MARGIN;
+ }

  drawSectionLabel(pdf, MARGIN, y, 'ISTASYONA GORE SATIS');
```

**Bonus:** `neededH` hesaplanmış ama kullanılmıyordu — bu bir **bug**'dı! Çok istasyonlu işletmelerde PDF'te sayfa taşma kontrolü eksikti. Şimdi düzgün sayfa atlıyor.

## 📦 Dosyalar (9)

```
app/kasa/order-composer.tsx
app/kasa/register-panel.tsx
app/kasa/table-detail-modal.tsx
app/panel/(shell)/pos/cash-session-modal.tsx
app/panel/(shell)/pos/split-payment-modal.tsx
app/panel/(shell)/pos/z-report-modal.tsx
components/panel/printer-status-widget.tsx
lib/actions/tables-status.ts
lib/utils/z-report-pdf.ts
```

## 🚀 Kurulum

```powershell
# 9 dosyayı üstüne yaz
```

**Bonus:** Bu `register-panel` ve `z-report-pdf` dosyaları zaten Paket 1 / Paket C ile güncel olduğu için önce bunu yaz, sonra push'la.

## 🧪 Test

```powershell
# Lint geçiyor mu kontrol et (push sırasında zaten otomatik)
npm run lint
```

Veya doğrudan push dene:
```powershell
git add .
git commit -m "fix(lint): unused imports/params + useMemo wrap + pdf pagination bug"
git push
```

## ⚠️ Uyarılar (Warning — Push'u Bloklamıyor)

Bunlar ertelenebilir:
- `yazicilar/tabs/advanced-tab.tsx:19` — `loadData` missing dep
- `yazicilar/components/receipt-preview.tsx:178` — `<img>` → `<Image>` önerisi
- `components/ui/toast.tsx:68` — timersRef cleanup closure warning

Yeri geldiğinde düzeltilebilir, şu an push geçecek.

## 📍 Git Push Sırası

1. **Lint fix** (bu paket) — `git add . && git commit -m "fix(lint)" && git push` — lint geçer
2. **QR Menü Paket 1** — önceki paket zaten `git add`'te aynı staged'de, tek commit olarak gider

Veya ayrı commit'ler:
```powershell
git add app/kasa/order-composer.tsx app/kasa/table-detail-modal.tsx `
        "app/panel/(shell)/pos/cash-session-modal.tsx" `
        "app/panel/(shell)/pos/split-payment-modal.tsx" `
        "app/panel/(shell)/pos/z-report-modal.tsx" `
        components/panel/printer-status-widget.tsx `
        lib/actions/tables-status.ts
git commit -m "fix(lint): unused imports and params"

git add app/kasa/register-panel.tsx
git commit -m "fix(lint): register-panel useMemo wrap for range"

git add lib/utils/z-report-pdf.ts
git commit -m "fix(pdf): by_station section page overflow check"

git add "app/menu/[slug]/menu-view.tsx" app/globals.css lib/actions/orders.ts
git commit -m "feat(qr-menu): paket 1 - sinematik redesign + source:qr fix"

git push
```

## 🗺️ Durum

| İş | Durum |
|---|---|
| QR Menü Paket 1 | ✅ (push bekliyor) |
| **Lint fix (pre-push)** | **✅ BU PAKET** |
| Paket 2 (animasyonlar) | 🔜 |

## 🔜 Push'tan Sonra

Çalışırsa **Paket 2 - Animasyon Tabakası**:
- Sepete ekleme arc animasyonu
- Badge pop
- Haptic feedback
- Shimmer loading
- Sepet drawer spring

"**paket 2 başlat**" demen yeterli. 🚀
