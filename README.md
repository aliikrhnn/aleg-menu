# 🔧 Z-REPORT FIX — Props Tipi

TypeScript build hatası düzeltildi.

## 🐛 Hata

```
./app/panel/(shell)/pos/z-report-modal.tsx:34:3
Type error: Property 'businessName' does not exist on type 'Props'.

  32 |   open,
  33 |   onClose,
> 34 |   businessName: _businessName,
  35 |   businessAddress: _businessAddress,
  36 |   businessLogoUrl: _businessLogoUrl,
  37 | }: Props) {
```

## 🧠 Neden

Component destructure'da `businessName/Address/LogoUrl` alanlarını alıyor (underscore prefix ile, kullanılmadığı için), ama Props type'ında bu alanlar yoktu.

## ✅ Çözüm

Props type'a 3 alan **opsiyonel** olarak eklendi:

```typescript
type Props = {
  open: boolean;
  onClose: () => void;
  businessName?: string;
  businessAddress?: string;
  businessLogoUrl?: string;
};
```

**Neden opsiyonel?** Çünkü:
- Caller geçmek zorunda olmasın
- Sandbox tarafında destructure satırları yokken bile uyumlu kalır
- İleride raporda "İşletme adı, adres, logo" görünmesi istenirse direkt geçilebilir

Underscore-prefix sayesinde (önceki paket `lint-fix-2`) bu alanlar destructure'da kullanılmasa bile lint hatası vermez.

## 📦 Dosya (1)

```
app/panel/(shell)/pos/z-report-modal.tsx
```

## 🚀 Push

```powershell
npm run build  # ✅ başarılı
git add .
git commit -m "fix(z-report): Props tipine business alanları eklendi"
git push       # ✅ pre-push geçer
```

Push ✓
