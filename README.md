# 🔧 LINT FIX 5 — day-summary-wizard hoist

## 🐛 Hata
```
Type error: Block-scoped variable 'handleCloseAttempt' used before its declaration.
> 108 |   useEscapeKey(handleCloseAttempt, open);
```

## 🔍 Sebep
`useEscapeKey` 108. satırda çağrılıyor, ama `handleCloseAttempt` 220'de tanımlı.
TS strict mode JS'in kendi hoisting davranışına rağmen `let/const` için
`block-scoped variable used before its declaration` hatası veriyor.

## ✅ Çözüm
**Ref pattern** ile çözüldü:

```typescript
// Yukarıda - ref tanımı
const handleCloseAttemptRef = useRef<(() => void) | null>(null);

// 109'da - lambda ile çağırma
useEscapeKey(() => {
  handleCloseAttemptRef.current?.();
}, open);

// 232'de - fonksiyon tanımlandıktan sonra ref'i bağla
const handleCloseAttempt = () => { ... };
handleCloseAttemptRef.current = handleCloseAttempt;
```

Bu pattern `useEscapeKey`'in **runtime'da** doğru fonksiyona erişmesini sağlar
ama TS hoisting hatasından kaçar.

## 🚀 Push

```powershell
Expand-Archive -Path lint-fix-5.zip -DestinationPath . -Force

git add . && git commit -m "fix(ts): day-summary-wizard handleCloseAttempt hoist" && git push
```

## 💡 Manuel Alternatif

İstersen sadece tek satır değiştir:

```typescript
// Eski
useEscapeKey(handleCloseAttempt, open);

// Yeni
useEscapeKey(() => onClose(), open);
```

Bu **handleCloseAttempt'i atlar** ve direkt onClose çağırır. Confirm dialog
göstermez (kullanıcı yazılı veriyi silebilir). Daha basit ama davranış farklı.

Önerilen: Bu paket'teki **ref pattern** çözümü.
