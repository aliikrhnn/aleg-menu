# 🎯 Z RAPORU — Cari Ödemeler Tüm Modüllere Yansısın

Manuel borç/alacak ve cari ödemeler artık Z raporundaki **tüm modüllere** dahil
edilir: ödeme yöntemi dağılımı, saat bazlı, kasiyere göre, mutabakat.

**2 dosya · Migration yok.**

## 🐛 Sorun

Önceki paket sadece "Açık Hesap (Cari)" özet bölümünü ekledi. Ama:
- ❌ Ödeme yöntemi dağılımı — sadece sipariş ödemelerini topluyordu
- ❌ Saat bazlı ödeme — cari ödemeler görünmüyordu
- ❌ Kasiyere göre — cari işlemler atlanıyordu
- ❌ Yüzdeler `total_revenue` üzerinden hesaplanıyordu, cari dahil olunca aşıyordu

## ✅ Çözüm

`getZReport` artık `payment_logs`'tan **`order_id IS NULL`** olan kayıtları da
(cari ödemeler ve avans tahsilatları) entegre ediyor:

```typescript
const { data: cariPaymentLogs } = await admin
  .from('payment_logs')
  .select('id, amount, payment_method, performed_at, cashier_id')
  .eq('business_id', businessId)
  .is('order_id', null)
  .neq('payment_method', 'other')  // 'other' = manuel borç işareti, kasaya yansımaz
  .gte('performed_at', start.toISOString())
  .lte('performed_at', end.toISOString());
```

### Etkilenen Modüller

**1. Ödeme Yöntemi Dağılımı (`byMethod`)**
- Cari ödemeler `cash`/`card`/`transfer` olarak doğru kategoriye düşer
- Yüzde hesabı artık `byMethod` toplamı üzerinden (cari dahil), eskiden
  `total_revenue` üzerinden hesaplandığı için %100'ü aşabilirdi

**2. Saat Bazlı Ödeme (`byHour`)**
- Cari ödeme saatleri grafikte görünür
- "En yoğun saat" cari ödemeleri de hesaba katar

**3. Kasiyere Göre (`byCashier`)**
- Cari ödeme alan kasiyer kendi adına ciro olarak görünür
- `cashier_accounts.display_name` ile JOIN

**4. Mutabakat (`reconciliation`)**
- `cashTotal`, `cardTotal` byMethod'tan gelir → cari dahil ✓
- `expected_cash = opening + cashTotal - refunds` → kasiyerin gerçek beklenen
  nakit miktarı ✓ (avans + cari ödeme + sipariş hepsi sayılır)

### Hariç Tutulan: Manuel Borç

Manuel borç (`addManualCharge`) `payment_logs`'a `method='other'` ile yazılır.
Z raporu bu hareketleri **kasaya yansıtmaz** — sadece "Açık Hesap → Yeni
Borçlanma" listesinde görünür. Mantıklı çünkü manuel borç gerçek para
hareketi değil, sadece kayıt.

### Etkilenmeyen: `total_revenue` (Bugünkü Ciro)

`total_revenue` hâlâ sadece sipariş cirosudur. Cari ödemeler önceki günlerin
tahsilatı, bugünün cirosu değil. **Doğru davranış**:
- Bugünkü Ciro: ₺0 (sipariş yok)
- Nakit girişi: ₺2.035 (cari ödeme — kasada gerçekten var)

## 📦 Dosyalar (2)

```
lib/actions/payments.ts                       (cari payment_logs entegrasyonu)
app/panel/(shell)/pos/z-report-modal.tsx      (yüzde hesabı düzeltildi)
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(z-rapor): cari ödemeler tüm modüllere yansısın"
git push
```

## 🧪 Test Senaryosu

### Hazırlık
1. Kasiyer kasayı açar (₺200 açılış)
2. Bugün hiç sipariş açma
3. Cari işlemler:
   - Ahmet'e + Manuel Borç ₺50
   - Mehmet'e + Cari Ödeme ₺200 nakit
   - Ali'ye + Manuel Alacak ₺100 nakit (avans)
   - Veli'ye + Manuel Alacak ₺50 düzeltme

### Beklenen Z Raporu

**Bugünkü Ciro**: ₺0 (sipariş yok)

**Ödeme Yöntemi Dağılımı**:
- Nakit (2 ödeme) ₺300 (cari ₺200 + avans ₺100)
- 100% (toplam yöntem üzerinden)

**Saat Bazlı**: ödemelerin saatleri görünür

**Kasiyere Göre**: kasa açan kasiyer 3 işlem ₺300

**Açık Hesap (Cari)**:
- Yeni Borçlanma: 1 hareket ₺50 (manuel)
- Tahsilat: 2 hareket ₺300 (cari + avans)
- Net: +₺250

**Mutabakat**:
- Açılış: ₺200
- Nakit: ₺300
- Beklenen: ₺500

**Hariç Tutulan**: Manuel borç ₺50 ve düzeltme ₺50 ödeme yöntemine yansımaz
(payment_method='other' veya null).

## 💡 Davranış Tablosu

```
İşlem                         payment_logs   byMethod   Z Açık Hesap
────────────────────────────────────────────────────────────────────
Sipariş Nakit Ödeme             cash         ✅          ❌ (sipariş)
Sipariş Açık Hesap              other        ❌          ✅ (Sipariş)
Cari Ödeme Nakit                cash         ✅          ✅ (Tahsilat)
Cari Ödeme Kart                 card         ✅          ✅ (Tahsilat)
Manuel Borç                     other        ❌          ✅ (Manuel)
Manuel Alacak Nakit             cash         ✅          ✅ (Avans)
Manuel Alacak Kart              card         ✅          ✅ (Avans)
Manuel Alacak Düzeltme          (yazılmaz)   ❌          ❌
```

## 🗺️ Durum

| | |
|---|---|
| Cari Manuel Paket A | ✅ |
| **Z Raporu Tüm Modül Entegrasyonu** | **✅ TESLİM** |
| Paket B: Yeni siparişler kolonu silme + flash | 🔜 |

Push → test → çalışırsa **Paket B** başla 🚀
