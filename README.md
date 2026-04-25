# 🔧 SOUND `'use server'` FİX — Build Hatası Çözümü

Panel'de "Application error" çıkıyordu çünkü Next.js 14+ kuralı: `'use server'` dosyalarından **sadece async function** export edilebilir.

**4 dosya** (1 yeni `sound-types.ts`).

## 🐛 Sorun

`lib/actions/sound-settings.ts` `'use server'` direktifiyle başlıyordu ama içinde:
- `export type SoundSettings = ...`
- `export const DEFAULT_SOUND_SETTINGS = ...`

Bu Next.js build sistemine **runtime hata** veriyor — server actions dosyasından non-function export yapılamaz.

Sonuçlar:
- Build patlıyor → digest 306480349 production hatası
- Slider %NaN gösteriyor (DEFAULT_SOUND_SETTINGS düzgün gelmiyordu)
- Sayfa yenilenince "Application error: a server-side exception"

## ✅ Fix

### 1. Yeni dosya `lib/sound-types.ts`
Type ve const'lar ayrı dosyaya taşındı:
```typescript
export type SoundSettings = { ... };
export const DEFAULT_SOUND_SETTINGS: SoundSettings = { ... };
```

### 2. `lib/actions/sound-settings.ts`
- Type ve const tanımları silindi
- Bunları `@/lib/sound-types` dosyasından import ediyor
- Dosya artık tamamen `'use server'` uyumlu (sadece async function export)
- `revalidatePath` kaldırıldı (cache problemi yaratıyordu)

### 3. `app/panel/(shell)/ayarlar/tabs/sounds-tab.tsx`
- Type/const import'unu `@/lib/sound-types`'tan
- Action import'u `@/lib/actions/sound-settings`'tan
- NaN guard eklendi: volume validation

### 4. `app/kasa/kasa-board.tsx`
- Type/const import'u `@/lib/sound-types`'tan
- Action import'u sadece function'lar

## 📦 Dosyalar

```
lib/sound-types.ts                                     (yeni - shared types)
lib/actions/sound-settings.ts                          (sadece async functions)
app/panel/(shell)/ayarlar/tabs/sounds-tab.tsx          (import + NaN guard)
app/kasa/kasa-board.tsx                                (import güncellemesi)
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(sounds): use server compliance - extract types to separate file" && git push
```

## 🧪 Test

1. Panel → Ayarlar → **Bildirim Sesleri**
2. ✅ Sayfa açılır (500/digest hatası yok)
3. Slider gerçek yüzdeyle gözükür (%NaN değil)
4. Ses seç → ▶ önizleme çal
5. **Kaydet** → toast "Ses ayarları kaydedildi"
6. **Sayfayı yenile (F5)** → ✅ uygulama hatası YOK, ayarlar tekrar yüklenir
7. Kasayı yenile → telefondan çağrı → seçili ses çalar

## 💡 Next.js Bilgi Notu

`'use server'` dosyalarından **YALNIZCA**:
- ✅ `export async function ...`

Yapılamaz:
- ❌ `export const ...`
- ❌ `export type ...`
- ❌ `export default ...` (non-function)
- ❌ `export class ...`

Type ve constants için **ayrı dosya** kullan, hem server hem client'tan import et.

## 🗺️ Durum

| | |
|---|---|
| Bildirim sesleri seçimi | ✅ |
| **Use server fix** | **✅ BU PAKET** |
| Garson ekranı | 🔜 |

Push → test → çalışırsa **"garson ekranı"** veya başka iş söyle. 🚀
