# TYPE FİX — confirmDialog API

**1 dosya.**

## 🐛 Sorun

```
Type error: Object literal may only specify known properties, and 'message' does not exist in type 'ConfirmOptions'.
```

`confirmDialog` API'si `message`/`confirmText` değil, `body`/`confirmLabel` bekliyor.

## ✅ Fix

```diff
- message: `"${b.name}" butonu silinecek...`,
- confirmText: 'Sil',
+ body: `"${b.name}" butonu silinecek...`,
+ confirmLabel: 'Sil',
```

## 📦 Dosya

```
app/panel/(shell)/cagrilar/call-buttons-manager.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(types): confirmDialog API - body/confirmLabel" && git push
```
