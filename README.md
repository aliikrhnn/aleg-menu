# LINT FİX — RegisterContent unused businessId

**1 dosya.**

## 🐛 Sorun

```
Error: 'businessId' is defined but never used.
146:3  @typescript-eslint/no-unused-vars
```

Önceki paket polling kodunu KasaBoard'a taşıdığında RegisterContent'in `businessId` parametresi boşa kaldı.

## ✅ Fix

`RegisterContent`'ten gereksiz `businessId` parametresini kaldırdım. `RegisterPanel`'de `businessId` hâlâ duruyor — `KasaPinLock` için kullanılıyor.

```diff
- <RegisterContent businessId={businessId} onLockRequest={...} />
+ <RegisterContent onLockRequest={...} />

- function RegisterContent({ businessId, onLockRequest }: {
-   businessId: string;
-   onLockRequest: () => void;
- }) {
+ function RegisterContent({ onLockRequest }: { onLockRequest: () => void }) {
```

## 📦 Dosya

```
app/kasa/register-panel.tsx
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(lint): remove unused businessId from RegisterContent" && git push
```
