# 🔔 ÇAĞRI BUTONLARI — PAKET 1

İşletmenin kendi çağrı butonlarını tanımlayabildiği, müşterinin QR menüden çağrı yapabildiği, kasada anlık ses + toast + panel ile yanıtlayabildiği tam sistem.

**10 dosya · 1 migration · End-to-end realtime.**

## 🎯 Konsept

İşletme istediği kadar farklı çağrı butonu oluşturabilir:
- **Kafe**: "Garson Çağır", "Hesap İste", "Su Getir"
- **Nargile kafe**: "Nargile Yenile", "Kömür Değiştir", "Çakmak"
- **Restoran**: "Garson Çağır", "Su", "Hesap", "Çatal-Bıçak"

Her butonun **adı**, **emojisi/ikonu**, **rengi** özelleştirilir. Müşteri masada otururken QR menüdeki turuncu hizmet butonuna basar → açılan listeden istediğini seçer → kasaya anlık ses + toast gider.

## 📋 Sistemin Akışı

```
                  PANEL
                    ↓
    [Çağrı Butonları sayfası]
    + Yeni Buton: "Nargile Yenile" 💨
                    ↓
                 Kayıt
                    ↓
          ─────────────────
                    
                MÜŞTERİ
                    ↓
         [QR menü açar]
            (?t=masa-5)
                    ↓
        Sağ alt: ✋ Hizmet butonu
         [Yumuşak nabız animasyonu]
                    ↓
      [Tıkla] → Bottom sheet açılır
                    ↓
    "Nasıl yardımcı olabiliriz?"
    ┌──────────────────────────┐
    │ 💨 Nargile Yenile  →    │
    │ 🔔 Garson Çağır    →    │
    │ 🧾 Hesap İste      →    │
    └──────────────────────────┘
                    ↓
         [Buton seç]
                    ↓
      ✓ "Çağrınız iletildi"
                    ↓
          ─────────────────
                    
                  KASA
                    ↓
   🔔 ses + toast (üstten)
   "🔔 MASA 5 · Nargile Yenile"
                    ↓
   Header'da rozet: 1 (pop animasyonu)
                    ↓
       [Tıkla → panel açılır]
   ┌──────────────────────────┐
   │ Aktif Çağrılar · 1       │
   │ ─────────────────────────│
   │ 💨 Nargile Yenile        │
   │    Masa 5 · 8 sn önce    │
   │    [✓ Çözüldü]           │
   └──────────────────────────┘
                    ↓
       [Çözüldü] → kayıt kapanır
```

## 📦 Dosyalar (10)

```
supabase/migrations/0027_call_buttons.sql      ← MIGRATION
lib/actions/call-buttons.ts                     ← Server actions
lib/sounds.ts                                   ← playCall() eklendi
app/panel/(shell)/cagrilar/page.tsx             ← Panel sayfası
app/panel/(shell)/cagrilar/call-buttons-manager.tsx ← Editorial UI
app/menu/[slug]/page.tsx                        ← Buttons fetch
app/menu/[slug]/menu-view.tsx                   ← Hizmet butonu + sheet
app/kasa/register-panel.tsx                     ← Realtime + rozet + panel
app/globals.css                                 ← 7 yeni keyframe
components/panel/nav-config.ts                  ← Menü item
```

## 🚀 Kurulum

### 1. Migration Çalıştır (zorunlu — yeni tablo)

Supabase Dashboard → SQL Editor → yeni query → `supabase/migrations/0027_call_buttons.sql` içeriğini yapıştır → **Run**.

Veya CLI ile:
```powershell
npx supabase db push
```

Migration ne yapar:
- `call_buttons` tablosu oluşturur
- `waiter_calls`'a `button_id`, `button_name_snapshot`, `button_emoji_snapshot` kolonları ekler
- Eski `call_type` enum constraint'ini kaldırır
- RLS policy'leri (üyeler CRUD + anonim public read)
- `waiter_calls` realtime publication'a eklenir
- **Mevcut tüm işletmelere "Garson Çağır" butonu otomatik eklenir** ✅

### 2. Dosyaları üstüne yaz

10 dosyayı projeye yerleştir.

### 3. Push

```powershell
git add .
git commit -m "feat: çağrı butonları sistemi (panel + qr menü + kasa realtime)"
git push
```

Vercel deploy bittikten sonra test.

## 🧪 Test Akışı

### ✅ 1. Panel — Buton Yönetimi

1. Panel'e gir → sol menü → **Operasyon** → **Çağrı Butonları**
2. ✅ "Garson Çağır" otomatik eklenmiş görünür (migration default)
3. **+ Yeni Buton Ekle** tıkla
4. Form aç:
   - Ad: "Nargile Yenile"
   - İkon: 💨 (preset'ten seç)
   - Renk: Gold
5. ✅ Önizleme canlı güncelleniyor
6. **Oluştur** → liste'ye eklenir
7. Açık/Kapalı toggle, Düzenle, Sil çalışır

### ✅ 2. QR Menü — Müşteri Tarafı

1. Telefondan QR kodu okut: `https://alegstudio.com/menu/karakoy?t=masa-1`
2. ✅ Menü açılır
3. ✅ Sağ alt köşede **turuncu ✋ hizmet butonu** görünür (sepet bar üstünde, scroll-top üstünde)
4. ✅ Buton sürekli yumuşak nabız efekti (dikkat çeker)
5. Tıkla → ✅ alt'tan **bottom sheet** spring ile açılır
6. ✅ Üstte: "MASA 1 · HİZMET" + "Nasıl yardımcı olabiliriz?"
7. ✅ Liste: Garson Çağır 🔔, Nargile Yenile 💨 (renkli kartlar)
8. Bir butona tıkla → ✅ spinner → çağrı gönderilir
9. ✅ Sheet kapanır, üstten ✓ "Çağrınız iletildi · Nargile Yenile" toast
10. **30 saniye spam koruma**: aynı butona aynı masada hızlı bas → "Az önce aynı çağrı yapıldı" hatası

### ✅ 3. Kasa — Personel Tarafı

1. **Kasa** sekmesini aç (bilgisayar veya tablet)
2. Müşteri QR menüden bir çağrı yapsın
3. ✅ **3'lü ding sesi** çalar (C6-C6-E6)
4. ✅ Üstten toast düşer: "🔔 MASA 1 · Nargile Yenile" (6sn)
5. ✅ Header'da **turuncu rozet** belirir: zil + sayı + pop animasyonu
6. ✅ Rozet sürekli **ping efekti** (dikkat çeker)
7. Rozete tıkla → ✅ sağdan **çağrı paneli** kayarak açılır
8. Liste: çağrı kartı (emoji + buton adı + masa + zaman)
9. **✓ Çözüldü** tıkla → ✅ liste optimistic kaldırılır
10. Tüm çağrılar bitince → "Hepsi tamam" boş hal görünür

### ✅ 4. Çoklu Çağrı

1. Farklı 3 masadan çağrı gelsin (3 farklı tab/cihaz)
2. ✅ 3 ses üst üste çalar (her biri için)
3. ✅ Toast'lar arka arkaya görünür
4. ✅ Rozet "3" olur, her seferinde pop
5. Panel aç → 3 kart listede
6. **⊘ Tümünü Çözüldü İşaretle** → hepsi temizlenir

### ✅ 5. Spam Koruma

Backend'de 30 saniye guard var:
```typescript
const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString();
// Aynı masada aynı butonla pending varsa engelle
```
Müşteri art arda basamaz.

### ✅ 6. QR Olmadan

QR'sız `/menu/karakoy` aç → ✅ hizmet butonu **gizli** (masa bilinmediğinden çağrı anlamsız).

### ✅ 7. Buton Yoksa

Panel'den tüm butonları sil → menüde ✅ hizmet butonu **gizli** (tıklanacak şey yok).

## 💡 Teknik Detaylar

### Realtime Subscription

```typescript
supabase.channel('waiter_calls_kasa')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'waiter_calls',
      filter: `business_id=eq.${businessId}` },
    async (payload) => {
      // Masa adını çek + listeye ekle + ses + toast
    }
  )
  .on('postgres_changes',
    { event: 'UPDATE', ... },
    (payload) => {
      // Çözüldüyse listeden çıkar
    }
  )
  .subscribe();
```

Migration sonunda `waiter_calls` `supabase_realtime` publication'a eklenmiş — anlık çalışır.

### Spam Koruma

Aynı masa + aynı buton + 30 saniye içinde pending varsa **insert reddedilir**, müşteriye "Az önce aynı çağrı yapıldı" hatası döner.

### Optimistic UI

Kasada çağrı çözümlerken önce listeden kaldırılır, sonra server'a istek gider. Hata olursa tekrar fetch ile geri yüklenir.

### Snapshot Pattern

`button_name_snapshot` + `button_emoji_snapshot` `waiter_calls`'a yazılır. Buton silinse bile geçmiş çağrı kayıtlarında isim kaybolmaz.

### Anonim Erişim

`call_buttons_public_read` policy'si: aktif aboneliği olan işletmelerin aktif butonları herkes okuyabilir.
`waiter_calls_public_insert` (zaten vardı): aktif abonelere anonim insert.

QR menü tarafı `createAdminClient()` kullanır (RLS bypass — sadece okuma için).

### Ses Tasarımı

`playCall()` 3'lü tiz ding (C6-C6-E6). `playDing()` daha yumuşak (sipariş için). `playSuccess()` triangle wave (tamamlama için).

## 🎨 UI Detayları

### Hizmet Butonu (QR Menü)
- 56x56 yuvarlak, accent renk
- ✋ el kaldır SVG ikon
- Sağ alt köşede (sepet bar varsa 84px yukarı, scroll-top varsa 144px)
- Sürekli `menu-service-pulse` (2.4sn ease-in-out)
- Tıklayınca scale-90 + 10ms haptic

### Bottom Sheet (QR Menü)
- Drag handle üstte
- "MASA X · HİZMET" mono caps + italic serif başlık
- Renkli kartlar (her butonun rengiyle): emoji 22px + isim 15px + sağ ok
- Tıklanan butonun yanında spinner
- İptal butonu altta (ink-3 transparan)

### Çağrı Rozeti (Kasa)
- Header sağ tarafta dev menü öncesi
- Accent dolu, beyaz metin
- Zil ikon + sayı (mono 11px)
- Yeni gelende `callsBumpPulse` 600ms spring
- Sürekli `callsPing` 2sn (subtle background expand fade)

### Çağrı Paneli (Kasa)
- Sağdan kaymalı (max 420px)
- Header: "AKTİF ÇAĞRILAR · N" + "Müşteri çağrıları" italic 28px
- Tümünü temizle linki (2+ çağrı varsa)
- Liste kartları:
  - Emoji 11x11 kutusu (accent soft bg)
  - Buton adı 15px bold + masa adı 12px + "X dk önce" mono
  - Not varsa italic alıntı
  - "✓ Çözüldü" yeşil mono buton
- Boş hal: "Hepsi tamam" italic + ✓ ikon
- Footer: "Anlık · Yeni çağrılar otomatik gelir" mono caps

## 🗺️ Durum

| İş | Durum |
|---|---|
| QR Menü Paket 1 (görsel) | ✅ |
| QR Menü Paket 2 (animasyon) | ✅ |
| QR Menü Paket 3 (incelikler) | ✅ |
| Selamlama + modes | ✅ |
| **Çağrı Butonları (D1)** | **✅ BU PAKET** |
| Yeni sipariş ses+notification (D2) | 🔜 |
| Garson ekranı | 🔜 |

## 🔜 Sonra Ne?

### D2 — Yeni Sipariş Bildirimi
- Kasada yeni QR sipariş gelince ses + toast
- Browser notification (sayfa background'da olsa bile)
- "Sessize al" toggle
- Yeni siparişler için ayrı ses (playDing kullan)

### Diğer Seçenekler
- **Garson Ekranı** — mobil sipariş alma
- **Modül Yönetimi** — loyalty/stock aktifleştirme UI
- **Dashboard İyileştirmeleri** — daha detaylı grafikler
- **Süper Admin Paneli** — birden fazla işletme yönetimi

Test et, çalışırsa "**D2 başlat**" veya "**garson ekranı başlat**" de. 🚀
