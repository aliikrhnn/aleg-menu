# 🔧 KASA — Empty State Fix

Kasa "Günün özeti" ekranında sadece cari ödeme alındığı halde istatistikler
görünmeyen sorunu düzeltir.

**1 dosya.**

## 🐛 Sorun

Senaryo:
- Bugün hiç sipariş açılmamış
- 4 cari ödeme alınmış (₺2.035 toplam)
- Ekran: "Bugün henüz sipariş yok" gösteriyor
- Halbuki **kasada nakit girişi var, raporda görünmeli**

## 🔍 Sebep

```typescript
const hasData = report && report.total_orders > 0;
```

`hasData` sadece sipariş sayısına bakıyordu. Cari ödemeler ayrı tablolarda
(`customer_transactions` + `payment_logs`) tutulduğu için "veri yok" sanılıyordu.

## ✅ Çözüm

```typescript
const hasOnAccountActivity =
  report &&
  report.on_account_summary &&
  (report.on_account_summary.new_charges_count > 0 ||
   report.on_account_summary.payments_received_count > 0);

const hasData =
  report && (report.total_orders > 0 || !!hasOnAccountActivity);
```

Artık **sipariş VEYA cari aktivite** varsa "veri var" sayılır → istatistik
kartları + Açık Hesap (Cari) bölümü + analizler hepsi görünür.

## 🧪 Test

### A) Sadece Cari Aktivite
1. Bugün hiç sipariş açma
2. Panel → Cari → bir kullanıcıya ödeme al (₺200 nakit)
3. Kasa ekranı → "Günün özeti"
4. ✅ İstatistik kartları görünür (Sipariş 0, Sepet ort. ₺0)
5. ✅ "Açık Hesap (Cari)" bölümü: Tahsilat ₺200
6. ✅ Z raporu olarak indirilebilir

### B) Hiç Aktivite Yok
1. Bugün ne sipariş ne cari ödeme
2. ✅ "Bugün henüz sipariş yok" mesajı (eski davranış korundu)

### C) Karışık Aktivite
1. Bugün 5 sipariş + 2 cari ödeme
2. ✅ Tüm kartlar + Açık Hesap bölümü dolu

## 🚀 Push

```powershell
git add . && git commit -m "fix(kasa): cari aktivite varken istatistikleri göster" && git push
```

## 💡 Not

İlk görseldeki **"Bugünkü Ciro ₺0,00"** doğru kalır — çünkü ciro = bugün satılan
ürünler. Cari ödemeler önceki günlerin tahsilatı, ciroya dahil edilmemeli.
Ama **istatistik kartları + Açık Hesap özeti** artık görünür → kasiyer bağlamı
anlar.

## 🗺️ Bonus: Başka Şey Kaybolmadı

Dosya kontrol edildi:
- ✅ Sipariş / Sepet Ort. / Açık Sipariş kartları kodda var
- ✅ İptal / İade / En Yoğun Saat kartları kodda var
- ✅ Z Raporu modal kodda var
- ✅ Kasa kapatma kodda var
- ❌ Sorun: `hasData` flag yanlış hesaplanıyordu

Yani **tüm eski özellikler korundu**, sadece görünme kuralı (gating) düzeltildi.
