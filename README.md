# 🔧 LINT FIX 4 — tables-status.ts Eksik Export

## 🐛 Hata
```
Type error: Module '"@/lib/actions/tables-status"' has no exported member 'cancelOrderItems'.
> 28 |   cancelOrderItems,
```

## 🔍 Sebep

`hesap-panel.tsx`, `cancelOrderItems` ve `closeOrderOnAccount` fonksiyonlarını
import ediyor ama **lokal `tables-status.ts` dosyanda bu fonksiyonlar yok**.

Bunlar geçmiş Cari/Kasa paketlerinde eklenmişti ama sanırım o paketler push
edilmemiş veya farklı bir branch'tan kalmış.

## ✅ Çözüm

Bu pakette **güncel** `tables-status.ts` (1890 satır, 14 export'lu) var:

- ✅ `getTablesWithStatus`
- ✅ `getPosMenu`
- ✅ `createManualOrder`
- ✅ `getTableOrders`
- ✅ `addItemsToOrder`
- ✅ `makeItemsComplimentary`
- ✅ `getOrderForPayment`
- ✅ `changeOrderTable`
- ✅ `mergeTables`
- ✅ `splitOrderItems`
- ✅ `listTablesForMove`
- ✅ `splitItemsFromMultipleOrders`
- ✅ **`cancelOrderItems`** ← Eksik olan
- ✅ **`closeOrderOnAccount`** ← Eksik olan (cari Paket 2'den, customerId zorunlu)

## 🚀 Push

```powershell
# -Force ile lokal dosyayı tam değiştir
Expand-Archive -Path lint-fix-4.zip -DestinationPath . -Force

git add . && git commit -m "fix: restore missing exports in tables-status (cancelOrderItems, closeOrderOnAccount)" && git push
```

## ⚠️ Önemli Not

Bu **kaybolma** dosya birkaç kez tekrar oldu — `Expand-Archive` `-Force`
flag'i kullanmadan paketleri çıkardığında **mevcut dosyalar üzerine yazılmadı**.

Bundan sonra mutlaka:
```powershell
Expand-Archive -Path PAKET.zip -DestinationPath . -Force
```

Aksi halde paket'in içindeki güncellemeler **uygulanmaz**, eski versiyon kalır.
