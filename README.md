# 🎵 BİLDİRİM SESLERİ SEÇİMİ

İşletme paneli üzerinden müşteri çağrısı ve yeni sipariş bildirim seslerini özelleştirebilir, ses seviyesini ayarlayabilir ve önizleme yapabilir.

**5 dosya · Migration yok** (mevcut `businesses.settings` JSONB kolonu kullanılır).

## 🎯 Akış

```
PANEL → Ayarlar → Bildirim Sesleri
   ↓
6 farklı ses seçeneği · Ses seviyesi slider · ▶ Önizleme
   ↓
Kaydet
   ↓
KASA: 60 saniyede bir ayarları çeker
   ↓
Çağrı geldi → Çağrı sesi (kullanıcı seçimi)
Sipariş geldi → Sipariş sesi (kullanıcı seçimi)
```

## 🔊 6 Ses Seçeneği

| Ses | Karakteri | Kullanım Önerisi |
|-----|-----------|-------------------|
| **Zil** | 3'lü tiz ding (C6-C6-E6) — acil | Yoğun saatler, dikkat gerek |
| **Tını** | 2'li melodik (E6→A6) — sıcak | Normal akış, davetkar |
| **Nabız** | 4'lü hızlı atım (square wave) | Acil çağrı, alarm hissi |
| **Yumuşak** | Tek nota fade — sakin | Sessiz mekân, premium |
| **Marimba** | C-E-G akor — ahşap, sıcak | Cafe-restoran |
| **Klasik** | Tek "ding" (otel zili) | Geleneksel mekân |

Her ses **Web Audio API** ile sentezleniyor — dosya yok, network yok, anlık çalar.

## ✨ Özellikler

### Panel UI
- **Editorial tasarım** — italic serif başlıklar + mono caps eyebrow + brick accent
- **Kart seçim** — accent border + check işaret + soft glow
- **▶ Önizleme** — her sesin yanında küçük play butonu
- **Otomatik önizleme** — kart tıklayınca sesi de çalar
- **Volume slider** — %0..100 + 🔈 / 🔊 ikonları + TEST butonu
- **Sticky kaydet bar** — alta yapışık, "Kaydedilmedi" rozet uyarısı

### Kasa
- Mount'ta ve **60 saniyede bir** ayarları çeker (panel'den değiştirilince yakalansın)
- `playCallSound()` ve `playOrderSound()` helper'lar — mute kontrolü + seçili ses + volume
- `useRef` pattern — stale closure sorunu yok
- Mevcut tüm `playCall()`/`playOrderDing()` çağrıları otomatik dispatch edilir

### Veri
- `businesses.settings.kasa_sounds` JSONB içinde:
  ```json
  {
    "call_sound": "bell",
    "order_sound": "chime",
    "volume": 0.35
  }
  ```
- Migration GEREKMEZ — mevcut kolon kullanılır
- Default fallback: bell + chime + 0.35

## 📦 Dosyalar (5)

```
lib/sounds.ts                                       (+ 4 yeni ses + dispatch)
lib/actions/sound-settings.ts                       (yeni - get/update actions)
app/panel/(shell)/ayarlar/settings-manager.tsx      (sounds tab eklendi)
app/panel/(shell)/ayarlar/tabs/sounds-tab.tsx       (yeni - editorial UI)
app/kasa/kasa-board.tsx                             (playSound dispatch)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(sounds): bildirim sesleri seçimi - panel ayarlar + kasa dispatch"
git push
```

## 🧪 Test

### 1. Panel Ayarlar
1. Panel → **Ayarlar** → **Bildirim Sesleri** tab
2. ✅ Editorial başlık: "Sesi nasıl duymak istersin?"
3. **Ses seviyesi** slider %50'ye al → ▶ TEST → daha sessiz çalar
4. **Müşteri çağrı sesi** → "Nabız" kartına tıkla
   - ✅ Anında sesi çalar (önizleme)
   - ✅ Kart accent border + ✓ check işaret
5. **Yeni sipariş sesi** → "Marimba" kartına tıkla
   - ✅ Marimba akoru çalar
6. ✅ Alt bar'da kırmızı "● Kaydedilmedi" yazısı
7. **Kaydet** tıkla → toast "Ses ayarları kaydedildi" + bar yeşil

### 2. Kasa Tarafı
1. Kasa sekmesini **kapat ve yeniden aç** (veya 60sn bekle)
2. Telefondan **çağrı yap** → ✅ Nabız sesi (4'lü atım) çalar
3. Telefondan **sipariş ver** → ✅ Marimba (C-E-G akor) çalar
4. Volume %50 olduğu için ses daha düşük

### 3. Mute + Ses Seçimi Birlikte
1. Kasada hoparlör ikonuyla sessize al
2. Telefondan çağrı yap → toast gelir, **ses GELMEZ** ✅
3. Sesi aç → tekrar çağrı → seçili ses (Nabız) çalar ✅

### 4. Anında Önizleme Testi
Her sesi tek tek tıklayıp dinle — hissini anla:
- Zil (acil)
- Tını (davet)
- Nabız (alarm)
- Yumuşak (sakin)
- Marimba (sıcak)
- Klasik (geleneksel)

## 💡 Teknik Detaylar

### Ses Sentezi
Tüm sesler `Web Audio API` ile runtime'da üretilir. Avantajları:
- Dosya yok (0 KB extra bundle)
- Anlık (network yok)
- Volume parametresi destekli
- Browser cache problemi yok

### Sound ID Pattern
```typescript
type SoundId = 'bell' | 'chime' | 'pulse' | 'soft' | 'marimba' | 'classic';
playSound(id: SoundId, volume?: number) // dispatch
```

Yeni ses eklemek için:
1. `lib/sounds.ts` içine `playXxx` fonksiyonu yaz
2. `SoundId` tipine ekle
3. `SOUND_OPTIONS` array'e ad+açıklama ekle
4. `playSound` switch'ine case ekle

### Backend
- **Read**: `getSoundSettings()` → kasa için `getKasaSoundSettings(businessId)` (admin client, anonim erişim)
- **Write**: `updateSoundSettings(patch)` → `businesses.settings.kasa_sounds` günceller
- Hep mevcut settings'i merge eder, diğer settings'i bozmaz

### Kasa Refresh
60 saniye polling — kasiyer panel ayarını anlık görmese de bir dakika içinde çalmaya başlar. İstenirse Supabase realtime ile anında yapılabilir ama overkill.

## 🗺️ Durum

| | |
|---|---|
| Çağrı butonları (D1) | ✅ |
| D2 - Yeni sipariş bildirimi | ✅ |
| **Bildirim sesleri seçimi** | **✅ BU PAKET** |
| Garson ekranı | 🔜 |

## 🔮 Sonra

- **Garson ekranı** — mobil app, çağrılar + hazır siparişler + masa listesi
- **Mutfak ekranı sesleri** — yeni sipariş için mutfak da kendi sesini seçsin
- **Browser notification ses opsiyonu** — sayfa background'da olunca farklı ses
- **Custom mp3 upload** — işletmeye özel ses (ileri seviye)

Test et, çalışırsa **"garson ekranı başlat"** veya başka iş söyle. 🚀
