# 🎯 UX PAKET 1 — Görünür İyileştirmeler

Aleg'e yeni temel UI primitive'leri + cari modal'lara uygulamalar.

**8 dosya · Migration yok.** Yeni paket'lerde de kullanılacak helper'lar.

## ✨ Ne Eklendi?

### 1. `useEscapeKey` Hook 🎹

Modal'lara ESC tuşu desteği. Tek satır kullanım:

```typescript
import { useEscapeKey } from '@/lib/hooks/use-escape-key';

function MyModal({ onClose }) {
  useEscapeKey(onClose);
  return <div>...</div>;
}
```

- `enabled: false` → geçici devre dışı (örn. iç submit sırasında)
- Birden fazla modal açıkken sadece en üstteki kapanır

### 2. `Skeleton` Component 💀

Boş ekran iskelet placeholder. Pulse animation ile yükleniyor görsel efekti:

```tsx
import { Skeleton } from '@/components/ui';

{loading ? <Skeleton.List rows={3} /> : <RealList />}
```

**Hazır şablonlar:**
- `Skeleton.Box` — özel boyutlu kare/dikdörtgen
- `Skeleton.Text` — tek satır metin
- `Skeleton.Card` — kart (3 satır default)
- `Skeleton.List` — avatar + 2 satır + sağ taraf
- `Skeleton.Tile` — küçük istatistik kartı
- `Skeleton.Stats` — 4 grid stat layout

**Bonus**: `prefers-reduced-motion` desteği — animasyon hassas kullanıcılar
için otomatik durur.

### 3. `EmptyState` Component 📭

Standart "veri yok" hali. Sadece "boş" demez, **kullanıcıya ne yapacağını söyler**:

```tsx
import { EmptyState } from '@/components/ui';

<EmptyState
  icon="📒"
  title="Henüz cari kullanıcı yok"
  description="İlk cari kullanıcını ekleyerek başla"
  actionLabel="+ Yeni Kullanıcı"
  onAction={() => setModalOpen(true)}
/>
```

**Props:**
- `icon` — emoji veya ReactNode
- `title` — kısa, anlaşılır başlık
- `description` — opsiyonel açıklama
- `actionLabel` + `onAction` — opsiyonel CTA buton
- `variant` — `'dashed'` (default) veya `'solid'`
- `size` — `'sm'` / `'md'` / `'lg'`

### 4. `Spinner` Component 🔄

Inline yükleniyor göstergesi:

```tsx
import { Spinner } from '@/components/ui';

<button disabled={loading}>
  {loading ? <Spinner size={14} /> : '✓ Kaydet'}
</button>
```

## 📦 Uygulama Yerleri (Bu Pakette)

### Cari Detay Modal (`customer-detail-modal.tsx`)
- ✅ **ESC tuşu**: modal kapanır (iç action modal kapalıyken)
- ✅ **EmptyState**: "Henüz hareket yok" anlamlı mesaj + filter ipucu

### Cari Form Modal (`customer-form-modal.tsx`)
- ✅ **ESC tuşu**: modal kapanır (kayıt sırasında değil)

### Customer Picker (`customer-picker.tsx`) — Kasada açık hesap akışı
- ✅ **ESC tuşu**: picker kapanır
- ✅ **Skeleton.List**: liste yüklenirken iskelet (eski "Yükleniyor…" yerine)

## 🚀 Push

```powershell
git add .
git commit -m "feat(ui): skeleton + empty state + esc hook + cari uygulamalar"
git push
```

## 🧪 Test

### A) ESC ile Modal Kapama
1. Panel → Cari Hesaplar → Ahmet'e tıkla
2. **ESC** → ✅ modal kapanır
3. + Manuel Borç → modal açılır → **ESC** → ✅ iç action kapanır, ana modal açık kalır
4. Submit sırasında ESC bas → ✅ submit'i bozmaz

### B) Empty State
1. Panel → Cari Hesaplar → yeni bir kullanıcı oluştur
2. Detay aç → "HAREKETLER (0)"
3. ✅ **📒 Henüz hareket yok** ikonu + alt yazı + "Sipariş açık hesaba yazıldığında..."
4. Filter chip "Son 7 Gün" tıkla → ✅ "Bu aralıkta hareket yok" + "Farklı bir tarih..."

### C) Skeleton — Cari Picker
1. Kasa → masa hesabı → 📒 Açık Hes → "Açık Hesap Olarak Kapat"
2. CustomerPicker modal açılır
3. ✅ **Skeleton.List** kısa süre görünür (yükleniyor iskelet)
4. ✅ Sonra gerçek kullanıcı listesi

### D) ESC + Customer Picker
1. CustomerPicker açıldığında **ESC** → ✅ kapanır

## 💡 Sonraki Paketlerde Kullanım

Bu helper'lar **future paketlerde** çok iş görür:

```tsx
// Süper admin paneli işletme listesi
{loading ? <Skeleton.List rows={5} /> : <BusinessList />}
{businesses.length === 0 && (
  <EmptyState
    icon="🏢"
    title="Henüz işletme yok"
    actionLabel="+ İlk İşletme"
    onAction={() => router.push('/admin/isletmeler/yeni')}
  />
)}

// Modüller sayfası
function ModuleSettings() {
  useEscapeKey(onClose);
  return <ModuleGrid />;
}
```

## 🗺️ Durum

| | |
|---|---|
| Cari + Z Rapor + Paket B | ✅ |
| **UX Paket 1: Görünür İyileştirmeler** | **✅ TESLİM** |
| UX Paket 2: Mobile/Tablet | 🔜 |
| UX Paket 3: Kod kalitesi | 🔜 |

## 🔮 İlerideki Uygulamalar

Bu pakette sadece cari modal'lara uyguladık (gözlem amaçlı). Sonraki adımlar:

1. **Tüm modal'lara ESC** — 31 modal var, hepsine `useEscapeKey` ekle
2. **Tüm liste'lere Skeleton** — masa grid, sipariş listesi, ürün listesi
3. **Tüm boş hallere EmptyState** — tutarlı mesajlama

İstersen sonraki paket bu olabilir → "UX Paket 1B: Tüm yerlere uygula".

Push → test → çalışırsa söyle, devam edelim 🚀
