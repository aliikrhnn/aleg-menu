# 🍽 GARSON — TÜM SİPARİŞLER DETAYLI + TÜM MASALAR

Garson sekmesi büyük revizyon. **Eski "Hazır" sekmesi kaldırıldı, yerine "Siparişler" geldi** — tüm aktif siparişleri (yeni/onaylandı/hazırlanıyor/hazır) gösterir, kalemler ve istasyon bilgisiyle birlikte.

**2 dosya · Migration yok.**

## 🎯 Değişiklikler

### 1. Tab Adları
| Eski | Yeni |
|------|------|
| 🍽 Hazır | 🍽 Siparişler |
| ◍ Tümü | ◍ Tüm Masalar |

### 2. Yeni "Siparişler" Sekmesi
Eskiden sadece `status='ready'` olan siparişleri gösteriyordu. Şimdi:
- **Status filtresi:** `received / confirmed / preparing / ready` — son 24 saat
- **Yeni ready'ye geçen** siparişlerde **ses + toast** çalar (transition tracking)
- **Mevcut akışlar bozulmaz** — mutfak/POS hâlâ statüleri yönetir

### 3. Tıklanabilir Sipariş Kartı
Her kart **collapsed** başlar, tıklayınca açılır.

**Collapsed (kapalı) hali:**
- Status indicator (ikon + renk):
  - 🟠 ◉ **YENİ** (received)
  - 🟡 ◈ **ONAYLANDI** (confirmed)
  - 🟧 ◐ **HAZIRLANIYOR** (preparing)
  - 🟢 ✓ **HAZIR** (ready)
- Hedef başlığı: **Masa 5** / **Paket** / **Kapıya**
- Toplam ürün adedi + bekleme süresi
- Tutar
- Genişle/daralt ikon (▾)
- 3dk+ ready için kırmızı uyarı (⚠)

**Expanded (açık) hali:**
- Her kalem için satır:
  - **Adet** (örn `2×`)
  - **Ürün adı**
  - **İstasyon rozet** (icon + renk + isim) — Mutfak / Bar / Pastane vb. (varsa)
  - **Müşteri notu** (italic, varsa)
- `status === 'ready'` ise **✓ Teslim Ettim** butonu görünür

### 4. İstasyon Bilgisi
Backend'de `order_items.product_id → products.station_id → stations` join yapılır. Her kalemin istasyonu otomatik tespit edilir. İstasyon yoksa rozet hiç görünmez.

## 📦 Dosyalar (2)

```
lib/actions/waiter.ts                  (getAllActiveOrders + WaiterOrder/Item types)
app/garson/waiter-board.tsx            (tab adları + OrdersTab component)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(garson): tüm aktif siparişler + kalem detay + istasyon rozet"
git push
```

## 🧪 Test

### A) Tab Adları
1. Garson aç → ✅ "🍽 **Siparişler**" ve "◍ **Tüm Masalar**" görünür

### B) Sipariş Akışı
1. Telefondan QR menüden bir sipariş ver (örn 2 ürün, birinde not)
2. Garson "Siparişler" sekmesi → ✅ kart **YENİ** rozetiyle görünür
3. **Henüz ses çalmaz** (ready değil)
4. Mutfak/POS'tan status'u **"Hazırlanıyor"** yap → ✅ kartta **HAZIRLANIYOR** rozet
5. **"Hazır"** yap → ✅ Garsonda **ses çalar + toast + ✓ Teslim Ettim butonu görünür** (genişletilince)
6. Karta tıkla → genişler:
   - Her kalem: adet + ürün adı + istasyon rozet (varsa)
   - Notlu kalemde italic notu görünür
7. **✓ Teslim Ettim** → kart kaybolur, status `delivered`, toast "Sipariş teslim edildi"

### C) İstasyon Rozet
1. Bir ürünü Panel → Menü → o ürüne git → istasyon ata (örn "Mutfak")
2. Bu üründen sipariş ver
3. Garson Siparişler sekmesi → karta tıkla
4. ✅ Kalemde "🔪 MUTFAK" rozeti görünür (config'e göre icon ve renk)

### D) 3dk+ Uyarı
1. Bir ready sipariş 3dk+ beklerse → kırmızı border + ⚠ uyarı
2. Hâlâ teslim edilmemişse Garson dikkat etmeli

## 💡 Mimari Notlar

### `getAllActiveOrders` Action
3 sorgu yapısı:
1. **Orders** (status filtresi + son 24 saat)
2. **Order_items** (orderIds için tek sorgu)
3. **Products + stations** (kalemlerin product_id'leri için)
4. **Tables** (table_id resolve için)

Tüm joinler **manuel map ile** yapılır — Supabase nested select'inden daha kontrollü ve performanslı.

### Ses Transition Tracking
```typescript
const freshlyReady = newOrders.filter(
  (o) => o.status === 'ready' && !lastReadyIds.has(o.id)
);
```

Bir sipariş `preparing → ready` geçtiğinde **bir kez** ses çalar. Aynı ready siparişi tekrar polling'de gelirse ses çalmaz (lastReadyIds'a girmiştir).

### State Reset
`firstFetch` flag — ilk yüklemede zaten ready olan siparişlerde ses çalmaz (sadece sayfa açıldı).

## 🗺️ Durum

| | |
|---|---|
| Auth izolasyon + sipariş refresh | ✅ |
| **Tüm siparişler + kalem detay** | **✅ BU PAKET** |
| Garson sipariş alma | 🔜 (sonraki paket) |
| Süper admin paneli | 🔜 |

## 🔮 Sonraki Paket: Garson Sipariş Alma

Bu pakette **Tüm Masalar** sekmesi sadece görünüm. Bir sonraki pakette:
- Masa kartına tıklayınca → POS-benzeri sipariş alma ekranı
- Ürün seçme + adet + not + masaya gönderme
- Açık masaya yeni kalem ekleme
- Kasa register-panel'in sadeleştirilmiş versiyonu

İstediğinde "**garson sipariş alma**" deyip o paketi başlatırız.

Push → test → çalışırsa garson sipariş almaya geçeriz 🚀
