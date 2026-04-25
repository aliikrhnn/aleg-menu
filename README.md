# 📝 GARSON SİPARİŞ ALMA

Garson tüm masalardan tıklayarak sipariş alabilir. Kasa register-panel'in sadeleştirilmiş, mobile-first versiyonu.

**2 dosya · Migration yok · Mevcut `createManualOrder` action'ını kullanır.**

## 🎯 Akış

```
Garson → Tüm Masalar / Açık Masa
   ↓
Masaya tıkla
   ↓
Sipariş Alma Modal açılır:
   ├─ Header: ✕ + masa adı
   ├─ Search: ürün ara
   ├─ Category chips: yatay scroll
   ├─ Product grid: 2-3 sütun
   └─ Cart (sticky bottom):
       ├─ Her item: − adet + × kaldır + not
       ├─ Toplam
       └─ ✓ Mutfağa Gönder
   ↓
Sipariş DB'ye yazılır (status='confirmed', order_type='dine_in')
   ↓
Mutfak ekranında / POS'ta görünür
   ↓
Garson "Siparişler" sekmesinde de görünür (ONAYLANDI rozeti)
```

## ✨ Özellikler

### Modal UI
- **Tam ekran modal** (mobile-first)
- **Search box** — ürün adı + açıklamada arama
- **Kategori chips** — yatay scroll, hero_icon + isim, search aktif olunca gizlenir
- **Ürün kartları** — 2-3 sütun grid, hero_icon + isim + 2 satır açıklama + fiyat
- **Tıklayınca sepete eklenir** (aynı ürün → adet artar)
- **Variant desteği** — varyantlı ürünlerde ilki default seçilir (basit akış)

### Sepet (Sticky Bottom Sheet)
- **Item bazında kontroller:**
  - − / sayı / + (adet)
  - × kaldır
  - "+ NOT EKLE" / "DÜZENLE" — müşteri notu (örn "az şekerli")
- **TEMİZLE** butonu — sepeti boşaltır
- **Toplam** + **✓ Mutfağa Gönder** sticky footer

### Backend
- `createManualOrder()` action mevcut (kasa da kullanıyor)
- Parametreler:
  - `tableId`: masa ID
  - `orderType: 'dine_in'`
  - `cashierId`: garson hesabının ID'si
  - `items[]`: ürün + adet + not
  - `sendToKitchen: true` → status `confirmed`, mutfağa gider
- `payment_status` `pending` kalır (ödeme kasada alınır)

## 📦 Dosyalar (2)

```
app/garson/order-taking-modal.tsx     (yeni - tam fonksiyonel sipariş ekranı)
app/garson/waiter-board.tsx           (TableCard tıklanabilir + modal entegrasyon)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(garson): sipariş alma modal - masaya tıkla, ürün ekle, mutfağa gönder"
git push
```

## 🧪 Test

### A) Sipariş Alma
1. Garson sekmesi → **Tüm Masalar** veya **Açık Masa**
2. Bir masaya tıkla → ✅ tam ekran modal açılır, başlıkta masa adı
3. Search'te bir kelime yaz → ürünler filtrelenir, kategori chips gizlenir
4. Search'i temizle → kategoriler geri gelir
5. Bir kategori seç (Kahveler, Yemekler, vb.) → ✅ ürünler filtrelenir
6. Bir ürün kartına tıkla → sepete eklenir (sticky alttan açılır)
7. Aynı ürüne tekrar tıkla → adet 2 olur (ayrı satır değil)

### B) Sepet İşlemleri
1. Sepetteki bir ürünün **+** butonuna bas → adet artar
2. **−** ile azalt, 0'a inerse silinir
3. **×** ile direkt kaldır
4. **+ NOT EKLE** → input açılır → "az şekerli" yaz → ✓ ile kaydet
5. Not eklenmiş satır artık ayrı görünür (DÜZENLE ile değiştirilebilir)
6. **TEMİZLE** ile sepeti boşalt

### C) Mutfağa Gönder
1. Sepette ürünler varken → **✓ Mutfağa Gönder**
2. Loading "Gönderiliyor..." → toast "Masa X · sipariş gönderildi"
3. Modal kapanır
4. Garson **Siparişler** sekmesine geç → ✅ siparişin **ONAYLANDI** rozetiyle görünür
5. Karta tıkla → kalemleri + notları gör
6. Mutfak panel/POS'ta da görünür ✅

### D) Senaryolar
1. **Boş sepetle gönder** → toast "Sepet boş", gönderilmez
2. **Modal'ı kapat** → ✕ veya geri tuşuna bas, sepet temizlenir
3. **Açık masa zaten varken yeni sipariş** → her sipariş bağımsız (eski siparişler etkilenmez)

## 💡 Mimari Notlar

### Mevcut Action Kullanımı
`createManualOrder` action'ı zaten kasa register-panel'de kullanılıyordu. Aynı action garson için de mükemmel:
- Cashier güvenlik kontrolü ✓
- Masa güvenlik kontrolü ✓
- Total hesaplama ✓
- `sendToKitchen` parametresi ile direkt confirmed'a geçiş ✓
- `source: 'manual'` (kasa source'undan ayırt etmek için ileride filter konabilir)

### Cashier ID
`useCashierSession()` zaten garson login'de cashier objesini döndürüyor. `cashier.id` direkt kullanılır.

### Variant Sadeleştirmesi
Varyantlı ürünlerde **ilk varyant otomatik seçilir**. Bu basitlik için. İleri seviye:
- Varyant seçim modalı (kahve: küçük/orta/büyük)
- Option preset desteği (sütlü/sütsüz vs)

Şu an garson akışında bunlar yok; ekleneceği zaman ayrı bir paket olur.

### Ödeme Akışı
Sipariş `payment_status: 'pending'` ile yazılır. Müşteri ayrılırken garson masayı kasaya yönlendirir, kasada ödeme alınır. Bu mevcut akış değişmez.

## 🗺️ Durum

| | |
|---|---|
| Garson tüm siparişler + kalem detay | ✅ |
| **Garson sipariş alma** | **✅ BU PAKET** |
| Süper admin panel | 🔜 |
| Modül yönetimi | 🔜 |

## 🔮 Sonraki İyileştirmeler

- **Varyant seçim modalı** — küçük/orta/büyük gibi
- **Option preset desteği** — sütlü/sütsüz, az şekerli
- **Açık masaya kalem ekleme** — yeni bağımsız sipariş yerine mevcut hesaba ekleme
- **Hızlı satış** (masa olmayan paket/al-götür) — garson tarafında
- **Geçmiş sipariş şablonları** — sık tekrar edilen siparişler

Push → test → çalışırsa bir sonraki feature'a 🚀
