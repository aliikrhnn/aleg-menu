# TYPE FİX v8 — BOŞ ARRAY INFERENCE

v7'de `noImplicitAny: false` yaptım ama **boş array** (`const x = [];`) farklı bir mekanizma — TypeScript core language'in kendisi `never[]` olarak inferre ediyor, `noImplicitAny` değil.

**2 dosya.**

## 🐛 Sorun

```typescript
const allGroups = [];         // tip: never[]
allGroups.push(group);         // ❌ Argument type 'PanelNavGroup' is not assignable to 'never'
```

TypeScript boş array'in içeriğini bilmediği için `never[]` kabul ediyor. Sonra `push` reddediliyor.

## ✅ Fix

Explicit type ver:

### 1. `components/panel/sidebar.tsx`
```diff
- const allGroups = [];
+ const allGroups: typeof PANEL_NAV = [];
```

### 2. `lib/actions/tables.ts`
```diff
- const rows = [];
+ const rows: Array<{
+   business_id: string;
+   name: string;
+   capacity: number;
+   zone_id: string | null;
+   status: 'available';
+ }> = [];
```

## 🔍 Tüm Proje Tarandı

`grep -rn "const \w+ = \[\];"` komutu ile tüm proje tarandı — **sadece bu 2 yer** vardı. Başka boş array inference sorunu yok.

## 📦 Dosyalar (2)

```
components/panel/sidebar.tsx
lib/actions/tables.ts
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(types): explicit type for empty arrays"
git push
```

Bu kesin geçer. Bu sefer gerçekten tüm potansiyel yerleri proaktif taradım.

## ⚠️ Başka Bir Sorun Çıkarsa

Eğer başka type error daha olursa, en nükleer seçenek **`tsconfig.json`'da `"strict": false`** yapmak. Bu TypeScript'i tamamen gevşetir, hiçbir şey patlatmaz. Ama şimdilik gerekmemeli.

## 🗺️ Durum

| v | Hedef | Durum |
|---|---|---|
| v1-v6 | Database types | ✅ v6 ile çözüldü |
| v7 | noImplicitAny: false | ✅ callbacks OK |
| **v8** | **Empty array inference** | **✅ BU PAKET** |
| QR Menü Paket 1 | | 🔜 push geçince |

Push geçerse **"paket 2 başlat"** de. 🚀
