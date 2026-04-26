# 🔧 LINT FIX 3 — z-report-modal Props

## 🐛 Hata

```
Type error: Property 'businessName' does not exist on type 'Props'.
  32 |   open,
  33 |   onClose,
> 34 |   businessName: _businessName,
```

## ✅ Çözüm

`z-report-modal.tsx` dosyasındaki kullanılmayan props (`businessName`,
`businessAddress`, `businessLogoUrl`) `Props` type'ında yoktu, ama
component destructure ediyordu → TS hatası.

Bu paket'te **temizlenmiş** versiyon var:

```typescript
export function ZReportModal({
  open,
  onClose,
}: Props) {
```

## 🚀 Push

```powershell
# Windows PowerShell - Force overwrite
Expand-Archive -Path lint-fix-3.zip -DestinationPath . -Force

git add . && git commit -m "fix(ts): clean unused props in z-report-modal" && git push
```

## 💡 Hızlı Manuel Fix Alternatifi

Paket'siz, daha hızlı:

1. `app/panel/(shell)/pos/z-report-modal.tsx` aç
2. Satır 34-36 civarı:
   ```typescript
   businessName: _businessName,
   businessAddress: _businessAddress,
   businessLogoUrl: _businessLogoUrl,
   ```
   Bu 3 satırı **sil**
3. Push
