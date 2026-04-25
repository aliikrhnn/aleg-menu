# 🔧 SOUND SETTINGS FİX — 500 hata + admin client

Panel → Ayarlar → Bildirim Sesleri tab'ı 500 dönüyordu (sayfa "Yükleniyor..." takılı kaldı).

**2 dosya.**

## 🐛 Sorun

`getSoundSettings`/`updateSoundSettings` actions'ı `createClient()` (server client) ile `businesses` tablosuna yazıp okuyordu. Mevcut çalışan pattern (`settings.ts`) ise her zaman:
1. `requireBusinessAccess()` → auth check + businessId
2. `createAdminClient()` → RLS bypass ile read/write

Bu nedenle 500 dönüyordu — büyük ihtimalle RLS politikası `businesses` UPDATE'ine izin vermiyor.

## ✅ Fix

### Backend (sound-settings.ts)
- Tüm DB operasyonları **`createAdminClient()`** ile (auth user yine kontrol ediliyor, sadece DB erişimi admin)
- `parseSoundSettings()` helper — JSONB parse + default fallback
- `revalidatePath('/panel/ayarlar')` (önceden `/panel/ayarlar/sesler` yanlıştı, böyle bir route yok)
- `getKasaSoundSettings`'te `businessId` boşsa default döner (kasa hata almaz)

### Frontend (sounds-tab.tsx)
- `loadError` state — yükleme hatası gösterilir
- Hata olsa bile **default ayarlarla devam eder**, kullanıcı kaydedebilir
- Üstte sarı uyarı banner: "⚠ {hata} — Varsayılan ayarlar gösteriliyor"
- Try/catch ile network/parse hatalarını yakalar

Eski davranış: 500 olunca "Yükleniyor..." sonsuz döngü.
Yeni davranış: 500 olunca uyarı + default değerler + kullanıcı kaydedip düzeltebilir.

## 📦 Dosyalar

```
lib/actions/sound-settings.ts                          (admin client)
app/panel/(shell)/ayarlar/tabs/sounds-tab.tsx          (error handling)
```

## 🚀 Push

```powershell
git add . && git commit -m "fix(sounds): admin client + error fallback in sounds tab" && git push
```

## 🧪 Test

1. Panel → Ayarlar → **Bildirim Sesleri**
2. ✅ Sayfa yüklenir (500 olmaz)
3. Çağrı sesi seç → ▶ önizleme
4. Sipariş sesi seç → ▶ önizleme
5. Volume ayarla
6. **Kaydet** → toast "Ses ayarları kaydedildi" ✅
7. Kasayı yenile → telefondan çağrı/sipariş → seçili sesler çalar ✅

## 💡 İpucu — Hâlâ 500 Geliyorsa

Vercel logs'a bak:
```
Vercel Dashboard → Project → Logs → Functions
```

Olası sebepler:
- `SUPABASE_SERVICE_ROLE_KEY` env var eksik (admin client çalışmaz)
- `businesses.settings` JSONB kolonu olmaması (migration 0001'de ekli olmalı)

Şu sql ile test:
```sql
SELECT id, name, settings FROM businesses LIMIT 1;
```
`settings` kolonu varsa ve obje dönüyorsa OK.
