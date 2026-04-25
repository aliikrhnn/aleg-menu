# 🎨 PAYLAŞILAN MASA TASARIMI

Garson ve kasa uygulamasında ortak, editorial, status-aware masa kartı sistemi. Tek bir paylaşılan component üzerinden tüm masa görünümleri tutarlı.

**3 dosya · Migration yok.**

## 📐 Tasarım

```
┌────────────────────────────────────────────────────────────────────┐
│ [Tümü 43] [Bahçe 13] [Bar 12] [Teras 8]      ● Yeni ● Dolu ● ...  │  ← Filter + Legend
├────────────────────────────────────────────────────────────────────┤
│ ▌ Bahçe   4/8 DOLU · ₺1.855 AÇIK            ━━━━━━━─────         │  ← Zone başlığı
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                    │
│ │YENİ 3× │  │BOŞ  4p │  │DOLU 7× │  │HESAP   │                    │
│ │ B1     │  │ B2     │  │ B3     │  │ B5     │                    │
│ │  ₺220  │  │        │  │  ₺485  │  │  ₺840  │                    │
│ └────────┘  └────────┘  └────────┘  └────────┘
```

### Kart Anatomisi
- **Üst rozet**: Status (YENİ/DOLU/BOŞ/HESAP/REZERVE/TEMİZLİK) + sağda adet (3×) veya kapasite (4p) + süre (18 dk)
- **Orta**: Masa adı (büyük serif italic) + tutar (mono italic)
- **Alt** *(opsiyonel)*: Garson adı + son sipariş kategori — `waiterName` ve `lastCategory` props ile (paket 2'de backend enrichment)

### Status Renkleri
| Status | Renk | Kullanım |
|--------|------|----------|
| BOŞ | ink-3 | Müşteri yok |
| DOLU | gold | Aktif sipariş var |
| YENİ | accent | Mutfağa yollanmamış kalem |
| HAZIR | ok | Teslim edilmemiş hazır var |
| HESAP | super | Ödeme bekliyor |
| REZERVE | olive | Rezervasyon |
| TEMİZLİK | ink-3 | Temizlik gerekli |

### Filter Bar
- **Tümü** + her zone bir chip (renk + sayı)
- Aktif olan dolu, pasif olanlar zone rengiyle nokta + isim + sayı
- Yatay scroll (mobile-first)

### Legend
- Sağ üstte küçük renk legend'ı
- ● Yeni ● Dolu ● Hesap ● Rezerve ● Temizlik

### Zone Header
- Renk noktası + zone adı (italic serif)
- "4/8 DOLU · ₺1.855 AÇIK" özet
- Alt bar: doluluk progress (zone rengiyle)

## 📦 Bileşenler

`components/tables/table-card.tsx` 5 export sağlar:

### `TableCard`
Tek bir masa kartı. Standalone kullanılabilir.
```tsx
<TableCard
  table={tableWithStatus}
  callCount={3}
  onClick={(t) => openModal(t)}
  waiterName="Ayşe"      // opsiyonel
  lastCategory="İçecek"  // opsiyonel
/>
```

### `TableFilterBar`
Tümü + zone chip'leri. Yatay scroll.

### `TableLegend`
Status renk legend'ı.

### `TableZoneSection`
Bir zone başlık + alt bar + grid.

### `TablesFullView` ⭐ (En çok kullanılan)
Hepsi bir arada: filter bar + legend üstte + zone section'ları.
```tsx
const [filter, setFilter] = useState<ZoneFilterId>('all');

<TablesFullView
  zones={zones}
  activeFilter={filter}
  onFilterChange={setFilter}
  callsByTable={callsByTable}
  onSelectTable={(t) => openModal(t)}
/>
```

## 🔧 Kullanım Yerleri

### 1. Garson `app/garson/waiter-board.tsx`
- **"Açık Masa"** tab → `ActiveTablesView` (sadece dolu olanları filtreler) → `TablesFullView`
- **"Tüm Masalar"** tab → `TablesFullView` direkt
- Eski `ActiveTablesTab` + `AllTablesTab` + local `TableCard` silindi (~210 satır azaldı)

### 2. Kasa `app/kasa/tables-grid.tsx`
- Eski filter (Tümü/Boş/Dolu/Hesap) + custom card → `TablesFullView`
- Eski helper component'ler (`FilterPill`, `TableCard`, `ZoneHeader`) silindi (~440 satır azaldı)
- Mevcut `onTableClick` ve `callsByTable` props korundu

## 📦 Dosyalar (3)

```
components/tables/table-card.tsx         (yeni - 470 satır, paylaşılan)
app/garson/waiter-board.tsx              (TablesFullView entegrasyonu, eski component'ler silindi)
app/kasa/tables-grid.tsx                 (TablesFullView entegrasyonu, ~440 satır azaldı)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(design): paylaşılan masa kartı tasarımı (garson + kasa)"
git push
```

## 🧪 Test

### A) Garson — Açık Masa
1. Garson → **📋 Açık Masa** tab
2. ✅ Üstte filter chip'leri (Tümü + zone'lar) + sağda legend
3. ✅ Zone başlıkları: "Bahçe 4/8 DOLU · ₺1.855 AÇIK" + alt bar
4. ✅ Sadece dolu/yeni/hazır/hesap masalar görünür
5. ✅ Kart üst: status rozet + adet/kapasite + süre
6. ✅ Kart orta: masa adı (italic) + tutar
7. Bir masaya tıkla → ✅ sipariş alma modalı açılır

### B) Garson — Tüm Masalar
1. **◍ Tüm Masalar** tab
2. ✅ Boş masalar da dahil hepsi görünür
3. **Bahçe** chip'ine tıkla → sadece Bahçe zone'u
4. **Tümü** → tüm zone'lar geri gelir

### C) Kasa — Masalar Tab
1. Kasa → **Masalar** tab (varsa)
2. ✅ Aynı tasarım: filter + legend + zone'lar
3. ✅ Çağrı rozeti masalarda görünür (kırmızı 🔔)
4. Masaya tıkla → ✅ mevcut akış (açık siparişler + ödeme)

### D) Responsive
1. Telefon: 2 sütun grid
2. Tablet: 3 sütun
3. Desktop: 4-6 sütun
4. Filter bar yatay scroll

### E) Boş Durumlar
1. Hiç masa yoksa → "Henüz masa tanımlı değil" + masa ayarlarına git
2. Filter aktifken eşleşen yoksa → "Bu bölgede masa yok"
3. Hata → kırmızı hata kutusu

## 💡 Mimari

### Single Source of Truth
`TableCard` ve `TablesFullView` tek dosyada. Kasada veya garsonda görünüm değişmek istendiğinde **bir yerden** güncellenir.

### Forward Compatibility
`TableCard` props'ları `waiterName` ve `lastCategory` opsiyonel — şu an tetiklenmez (data yok). Paket 2'de backend `getTablesWithStatus`'a bu alanlar eklendiğinde direkt görünmeye başlar.

### Çağrı Rozeti
`callsByTable: Map<string, number>` — masa ID → çağrı sayısı. Kart sağ üstte 🔔 rozet, animated pulse.

### Filter ID Tipi
```typescript
export type ZoneFilterId = string | 'all';
```

`'all'` veya zone UUID'si. State management dışarıda, prop ile geçilir.

## 🔮 Sonra (Paket 2: Backend Enrichment)

`getTablesWithStatus` action'a eklenebilir:
- `assigned_waiter_name` — siparişi alan kasiyer/garson adı (orders join)
- `last_item_category` — son siparişin son kalemi (order_items + categories join)

Ekran görüntüsündeki "Ayşe" ve "İçecek" alt satırları o zaman görünür hale gelir. Kart kodu **zaten hazır**, sadece backend dönmeye başlayacak.

## 🗺️ Durum

| | |
|---|---|
| Garson varyantlar | ✅ |
| **Paylaşılan masa tasarımı** | **✅ BU PAKET** |
| Backend enrichment (waiter+category) | 🔜 Paket 2 |
| Süper admin paneli | 🔜 |

Push → test → çalışırsa "**masa enrichment**" veya "**süper admin paneli**" söyle 🚀
