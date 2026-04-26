# 🎯 UX HELPERS + LINT FIX

UX Paket 1'in helper'ları (yeni dosyalar) **+** lint fix tek pakette.

**6 dosya · Migration yok.**

## 📦 İçerik

### Yeni Dosyalar (UX Paket 1 helpers)

```
lib/hooks/use-escape-key.ts          ✨ YENİ — Modal'lara ESC tuşu desteği
components/ui/skeleton.tsx           ✨ YENİ — Loading iskelet (6 şablon)
components/ui/empty-state.tsx        ✨ YENİ — Standart boş hal
components/ui/spinner.tsx            ✨ YENİ — Inline yükleniyor
components/ui/index.ts               🔄 GÜNCEL — yeni export'lar
```

### Lint Fix

```
app/panel/(shell)/pos/cash-session-modal.tsx   🔧 unused useEffect import kaldırıldı
```

## 🐛 Lint Fix Sebebi

Paket 1B'de `cash-session-modal.tsx`'teki eski ESC handler kaldırıldı,
ama `useEffect` import'u kullanılmaz hale geldi → lint error:

```typescript
- import { useState, useTransition, useEffect } from 'react';
+ import { useState, useTransition } from 'react';
```

## ⚠️ Push Sırası

Bu paket **UX Paket 1B'den ÖNCE** push edilmeli. Aksi halde import hatası olur:

```
import { useEscapeKey } from '@/lib/hooks/use-escape-key';   // ❌ dosya yok
import { Skeleton } from '@/components/ui/skeleton';          // ❌ dosya yok
import { EmptyState } from '@/components/ui/empty-state';     // ❌ dosya yok
```

### Senaryolar

**A) Henüz Paket 1B push'lamadıysan** (önerilen):
```powershell
# Önce bu pakedi (helpers + lint fix)
git add . && git commit -m "feat(ui): paket 1 helpers + lint fix" && git push

# Sonra Paket 1B
git add . && git commit -m "feat(ux): paket 1B - esc + skeleton yayma" && git push
```

**B) Paket 1B'yi çalışmıyor durumda push'ladıysan**:
Bu paket'i normal çıkar → tek commit'te push:
```powershell
git add . && git commit -m "fix: ux helpers + lint fix" && git push
```

## ✨ Helper'ların Özeti

### `useEscapeKey(onClose, enabled?)`
Modal'lara ESC tuşu desteği — tek satır:
```typescript
useEscapeKey(onClose);                       // her zaman aktif
useEscapeKey(onClose, !submitting);          // submit hariç
useEscapeKey(onClose, open && !innerOpen);   // koşullu
```

### `<Skeleton.X />`
Loading iskelet placeholder, 6 hazır şablon:
- `Skeleton.Box` — özel boyut
- `Skeleton.Text` — tek satır metin
- `Skeleton.Card` — kart
- `Skeleton.List` — avatar + 2 satır + tutar
- `Skeleton.Tile` — istatistik kartı
- `Skeleton.Stats` — 4'lü grid

### `<EmptyState />`
Standart boş hal — sadece "veri yok" değil, kullanıcıya ne yapacağını söyler:
```tsx
<EmptyState
  icon="📒"
  title="Henüz cari kullanıcı yok"
  description="İlk cari kullanıcını ekleyerek başla"
  actionLabel="+ Yeni Kullanıcı"
  onAction={() => setOpen(true)}
/>
```

### `<Spinner />`
Inline yükleniyor:
```tsx
{loading ? <Spinner size={14} /> : '✓ Kaydet'}
```

## 🗺️ Durum

| | |
|---|---|
| **UX Paket 1 (helpers) + lint fix** | **✅ TESLİM (bu paket)** |
| UX Paket 1B (yayma) | ⏳ ÖNCE BU PAKEDİ PUSH ET, sonra 1B |
| UX Paket 2 (Mobile) | 🔜 |
| UX Paket 3 (Kod kalitesi) | 🔜 |
