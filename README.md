# LINT FİX — JSX TIRNAK ESCAPE

**1 dosya.**

## 🐛 Sorun

```
Error: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.
2442:31  react/no-unescaped-entities
```

JSX içinde **`"{call.note}"`** yazmıştım. ESLint çift tırnağı escape edilmiş HTML entity ile istiyor.

## ✅ Fix

```diff
- "{call.note}"
+ &ldquo;{call.note}&rdquo;
```

`&ldquo;` ve `&rdquo;` daha şık görünür de — açık ve kapalı çift tırnak (typographic quotes). Browser'da `"` ve `"` olarak render olur, alıntı havası verir.

## 📦 Dosya

```
app/kasa/register-panel.tsx
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(lint): jsx escape quotes in call note"
git push
```
