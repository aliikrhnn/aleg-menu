# 🔧 HESAP PANELİ — İYİLEŞTİRMELER

İki sorunu birden çözer.

**3 dosya · Migration yok.**

## 🐛 Sorun 1: Ödenen Kalem Kayboluyordu

### Eski Davranış
1. 2 kalem seç → **Seçili Öde** → ödendi ✅
2. Hesap paneli yenileniyor → ödenen kalemler **görünmüyor** ❌

### Sebep
`getTableOrders` query'si sadece **aktif** veya **delivered+unpaid** siparişleri alıyordu. Ödenmiş (`status='delivered' + payment_status='paid'`) siparişler filtreden düşüyordu → kalemleri masa detayında görünmez.

### Çözüm
Üçüncü bir query eklendi: **Yakın zamanda ödenenler**

```typescript
// Son 4 saatte ödenmiş siparişleri de getir
.eq('payment_status', 'paid')
.gte('created_at', son_4_saat)
```

### Sonuç
- ✅ Ödenen kalemler **grileşmiş**, "✓ ÖDENDİ" rozetiyle listede kalır
- ✅ Opacity 0.55, accent kutu yerine ok (yeşil) tinted bg
- ✅ Checkbox disabled (tekrar seçilemez)
- ✅ Header'da **iki tutar**: "MASA TOPLAM ₺630" + altında "Kalan: ₺315" (sadece ödenmemiş)

## 🐛 Sorun 2: Kategoriler Yarım Görünüyordu

### Eski Davranış
Sağ menü dar (380px) → kategori chip'leri yatay scroll → kullanıcı kategoriyi göremiyor, scrollu fark etmiyor.

### Çözüm: Modern Dropdown
```
┌─────────────────────────────┐
│ [☕] Kahveler          ▼    │  ← seçili kategori, tıklanır
└─────────────────────────────┘
   ↓ (tıkla)
┌─────────────────────────────┐
│ ☕ Kahveler              ●  │  ← aktif accent
│ 🍵 Çaylar                   │
│ 🥐 Atıştırmalıklar          │
│ 🍰 Tatlılar                 │
│ 🥤 Soğuk İçecekler          │
│ 🍔 Ana Yemekler             │
│ 🥗 Salatalar                │
└─────────────────────────────┘
```

- **Compact**: tek satır, kategori adı + ▼ ok
- **Açılır**: modal değil dropdown (max 280px yükseklik, içeride scroll)
- **Akıllı kapatma**: dışarı tıklayınca kapanır
- **Aktif gösterim**: seçili kategoride accent renk + ● dot
- Tüm kategoriler ikon + isim ile rahat görünür

## 📦 Dosyalar (3)

```
lib/actions/tables-status.ts         (getTableOrders - 3. query: recently paid)
components/order/menu-picker.tsx     (CategoryDropdown component)
components/order/hesap-panel.tsx     (header - Kalan tutar gösterimi)
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(hesap-panel): ödenen kalem grileşsin + kategori dropdown"
git push
```

## 🧪 Test

### A) Ödenen Kalem Görünümü
1. Masa B5'te 6 kalem var
2. 2 kalem seç → **Seçili Öde** → onayla → ödendi
3. ✅ Hesap paneli yenilenince **ödenen 2 kalem grileşmiş** olarak listede görünür
4. ✅ "✓ ÖDENDİ" rozeti, line-through fiyat
5. ✅ Header: "MASA TOPLAM ₺630" + altında "Kalan: ₺315"
6. ✅ Checkbox tıklanmıyor (disabled, opacity düşük)
7. Kalan 4 kalem hâlâ seçilebilir, ödenebilir

### B) Kategori Dropdown
1. Sağ menü açık
2. ✅ Üstte: "[☕] Kahveler ▼" tek satırlık dropdown
3. Tıkla → ✅ tüm kategoriler aşağı açılır
4. Bir kategori tıkla → ✅ dropdown kapanır, ürünler değişir
5. Dropdown açıkken dışarı tıkla → ✅ kapanır
6. Çok fazla kategori varsa → ✅ dropdown içinde scroll çalışır (max 280px)
7. Aktif kategori → ✅ accent renk + ● dot

### C) Edge Case
- Tüm masa ödendi → "Kalan: ₺0" görünür mü? **Hayır, gizli** (`unpaidTotal !== tableTotal` kontrolü)
- 4 saatten eski ödemeler → görünmez (eski kalmasın, performans)

## 💡 Mimari

### `getTableOrders` Yeni Query
3. query: `payment_status='paid' AND created_at > 4saat önce`

**Neden 4 saat?** 
- Tipik bir oturum 1-3 saat
- 4 saat içinde ödenen kalemler hâlâ ekranda kalır
- Daha eski → silinmez ama listeye düşmez (performans + temizlik)

İstersen bu süreyi `12h` veya `1 gün` yapabiliriz.

### CategoryDropdown
- Native popover (extra dep yok)
- `setTimeout` ile dış tıklama yakalama (ilk açılış event'ini engellemek için)
- max-height 280px + scroll → çok kategoriye uyumlu
- Accent border açıkken (focus state)

## 🗺️ Durum

| | |
|---|---|
| Hesap Panel B (tam özellik) | ✅ |
| **Ödenen kalem + kategori dropdown** | **✅ BU PAKET** |
| Süper admin paneli | 🔜 |

Push → test → çalışırsa **"süper admin paneli"** veya başka iş söyle 🚀
