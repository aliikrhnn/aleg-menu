# Polish Düzeltmeleri - Sidebar Hover + Logo Toast + Rate Limit

## DEĞİŞEN DOSYALAR (üstüne yaz)

1. lib/actions/settings.ts                                     (layout cache invalidate)
2. components/panel/sidebar.tsx                                (nav item hover + logo kutusu)
3. components/panel/ai-slogan-modal.tsx                        (mount'ta rate limit fetch)
4. components/panel/ai-monogram-modal.tsx                      (mount'ta rate limit fetch)
5. app/api/ai/slogan/route.ts                                  (GET endpoint - rate limit status)
6. app/api/ai/monogram/route.ts                                (GET endpoint - rate limit status)
7. app/panel/(shell)/ayarlar/settings-manager.tsx              (logo toast + initialSettings sync)

## KOMUT

Remove-Item -Recurse -Force .next
npm run dev

## YAPILAN 4 DÜZELTME

### 1. Sidebar Nav Item Hover

Artık her menü item'ı üstüne gelince BELIRGIN hissiyat:
- Arka plan beyaza döner (var(--card))
- Hafif sağa kayar (translate-x-0.5)
- Hafif gölge bırakır
- SOL TARAFTA ince accent çizgi BÜYÜR (0 → 18px)
- İKON rengi accent turuncuya döner
- 200ms smooth geçiş

Aktif menü öğesi zaten sol border'da accent var.

### 2. Modal'larda Kalan Hak Baştan Görünür

Önce sadece üretimden sonra görünüyordu. Şimdi:
- Modal açılır açılmaz GET /api/ai/slogan veya /monogram fetch eder
- Rate limit bilgisi alınır
- Rozet hemen görünür:
  - "0/5 KULLANILDI" (yeşil nokta)
  - "5/5 KULLANILDI · 18 SAAT SONRA YENİLENİR" (kırmızı)
- Limit doluysa Generate butonu disabled olur

### 3. Logo için Özel Toast

Önce kaydet bar'ı hiç çıkmıyordu. Şimdi logo upload/remove için ÖZEL TOAST:

Logo yüklenince:
┌─────────────────────────────────────┐
│ ✓ Logo kaydedildi                   │  (yeşil arka plan)
│   Sidebar ve önizlemeler güncellendi │
└─────────────────────────────────────┘

Logo kaldırılınca:
┌──────────────────────────────────┐
│ 🗑 Logo kaldırıldı                 │  (siyah arka plan)
│   Varsayılan monograma döndün     │
└──────────────────────────────────┘

3 saniye görünür, sonra kaybolur.

### 4. Sidebar'da Logo Güncellenmesi

- uploadBusinessLogo action'a revalidatePath('/panel', 'layout') eklendi
- Layout cache'i invalidate olur
- Server component (layout.tsx) yeniden çalışır
- Yeni logo_url ile sidebar rerender
- Logo kutusu: açık bej arka plan + ince border + orijinal renkleri korur
  (öncesinde siyah arkaplanda invert filter ile beyaz yapılıyordu, rengi
  olan logolar kötü duruyordu)

## TEST SENARYOSU

### Nav Hover Test:
1. Panel aç
2. "Ana Sayfa" menüsünün üstüne mouse götür
3. Arka plan beyaz olur, sol kenarda turuncu çizgi çıkar, ikon turuncu, hafif sağa kayar
4. "Masalar", "Menü", "İşletme Ayarları" için aynı

### Rate Limit Test:
1. Ayarlar → Kimlik → "AI ile Monogram Üret"
2. Modal açılır, HEMEN "0/1 KULLANILDI" yeşil rozet görünür
3. 3 Monogram Üret → üret
4. Rozet güncelle: "1/1 KULLANILDI · 24 SAAT SONRA YENİLENİR" kırmızı
5. Buton disabled
6. Modal'ı kapa, yeniden aç → yine "1/1 KULLANILDI" hatırlıyor

### Logo Toast Test:
1. Ayarlar → Kimlik → Logo yükle
2. Alt ortada yeşil toast: "✓ Logo kaydedildi · Sidebar ve önizlemeler..."
3. Aynı anda sol sidebar'daki "a" harfi → senin logon
4. Toast 3 saniye sonra kayar gider
5. Logo kaldır → siyah toast "Logo kaldırıldı"

### Sidebar Logo Test:
1. AI Monogram Üret → bir varyant seç
2. Logo yüklenince:
   - Kimlik kartında logo
   - Önizlemelerde logo
   - SAL SIDEBAR ÜSTÜNDE logo (açık bej kutu içinde)
   - Sayfa yenileme gerekmez
