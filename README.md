# 🎯 CARİ HESAPLAR — PAKET 2: Kasa Entegrasyonu

HesapPanel'de "Açık Hesap" akışı artık **kayıtlı cari kullanıcılarla** çalışır.

**3 dosya · Migration yok.**

## 🎨 Yeni Akış

```
HesapPanel → "📒 Açık Hes." seç → "Açık Hesap Olarak Kapat" buton
   ↓
CustomerPicker modal açılır:
┌─────────────────────────────────────────┐
│ AÇIK HESAP — KULLANICI SEÇ              │
│ ₺200 açık hesaba kaydedilecek           │
├─────────────────────────────────────────┤
│ 🔍 İsim veya telefon ara...             │
├─────────────────────────────────────────┤
│ A  Ahmet Yılmaz   📞 0532...   BORÇ ₺50│
│ M  Mehmet Demir   📞 0533...   ✓ TEMİZ│
│ R  Ramazan Bey    📞 0534...   ✓ TEMİZ│
├─────────────────────────────────────────┤
│ [Vazgeç]              [Ahmet'a Yaz 📒]  │
└─────────────────────────────────────────┘
   ↓ kullanıcı seçildiğinde
┌─────────────────────────────────────────┐
│ AÇIK HESAP — KULLANICI SEÇ              │
│ ₺200 açık hesaba kaydedilecek           │
├─────────────────────────────────────────┤
│ A  Ahmet Yılmaz       [✕ DEĞİŞTİR]     │
│    📞 0532...                           │
│    Mevcut borç: ₺50                     │
│                                         │
│ NOT (opsiyonel)                         │
│ [yarın ödeyecek_______________]         │
└─────────────────────────────────────────┘
   ↓ "Ahmet'a Yaz"
✅ Sipariş cariye yazıldı
✅ orders.customer_id = ahmet.id
✅ customer_transactions: 'charge' kaydı
✅ Ahmet'in borcu: ₺250 (eski 50 + yeni 200)
```

## ⚙️ Davranış

### Misafir / Hızlı Ekleme **YOK**
- Sadece panelde önceden eklenmiş kullanıcılar
- Boş listede mesaj: **"Henüz cari kullanıcı yok — Panel → Cari Hesaplar'dan ekle"**
- Kasa hızlı kullanıcı oluşturma butonu yok (bu özellik istenilmedi)

### Backend Atomik
`closeOrderOnAccount` artık tek seferde:
1. ✅ Kullanıcı güvenliği kontrol
2. ✅ Sipariş güvenliği kontrol
3. ✅ `payment_logs` insert (action='payment', method='other')
4. ✅ `orders.update` (paid + customer_id + note)
5. ✅ `customer_transactions.insert` (type='charge')
6. ✅ `customers.balance` recompute (cached)

### Çoklu Sipariş Desteği
- Tüm masa açık hesaba: her sipariş için ayrı `closeOrderOnAccount` çağrısı, hepsi aynı kullanıcıya
- Parsiyel açık hesap: kalemleri ayır → yeni siparişi cariye yaz

## 📦 Dosyalar (3)

```
lib/actions/tables-status.ts                   (closeOrderOnAccount güncellendi)
components/order/customer-picker.tsx           (yeni - search'lü kullanıcı seçim modal)
components/order/hesap-panel.tsx               (CustomerPicker import + handleOnAccount güncellendi)
```

### Detaylı Değişiklikler

**`tables-status.ts` — `closeOrderOnAccount`**:
- Yeni parametre: `customerId: string` (ZORUNLU)
- Customer güvenlik check
- `payment_logs` insert: `action: 'payment'` eklendi (zorunlu CHECK kolonu)
- `orders.update`: `customer_id` set
- `customer_transactions.insert`: type='charge'
- Inline balance recompute

**`customer-picker.tsx`** (yeni):
- Search'lü modal (debounce 250ms)
- Kullanıcı kart listesi (avatar + ad + telefon + borç rozet)
- Seçim sonrası: avatar + bilgi + not alanı
- Buton: "{Ad}'a Yaz" mor (super) renk
- Boş hal: "Panel'den ekle" yönlendirmesi

**`hesap-panel.tsx`**:
- Import: `CustomerPicker` eklendi
- Eski `OnAccountModal` componenti **silindi**
- `handleOnAccount` artık `(customer, note)` alıyor
- Toast: "{ad} hesabına yazıldı"

## 🚀 Push

```powershell
git add .
git commit -m "feat(cari): paket 2 kasa entegrasyonu - kullanıcı seçim + transaction"
git push
```

## 🧪 Test Senaryoları

### Ön Hazırlık
1. **Panel → Cari Hesaplar**'dan en az 2 kullanıcı ekle:
   - Ahmet Yılmaz (0532...)
   - Mehmet Demir (0533...)

### A) Tüm Masa → Açık Hesap
1. Bir masada sipariş aç (₺200)
2. Hesap Al → 📒 Açık Hes. → "Açık Hesap Olarak Kapat"
3. ✅ CustomerPicker modal açılır
4. ✅ Liste: Ahmet ve Mehmet görünür
5. "ahm" yaz → ✅ debounce sonrası filtre
6. Ahmet'e tıkla → ✅ seçili görünür, "DEĞİŞTİR" butonu görünür
7. Not yaz: "Yarın ödeyecek"
8. **"Ahmet'a Yaz"** → ✅ toast "Ahmet Yılmaz hesabına yazıldı"
9. Masa kapanır
10. **Panel → Cari Hesaplar → Ahmet** → ✅ borç ₺200 görünür
11. Hareketler → ✅ "Sipariş #X +₺200" + ürün listesi + "yarın ödeyecek" notu

### B) Parsiyel Açık Hesap
1. Masada 4 kalem (₺300 toplam)
2. Hesap Al → 2 kalem seç (₺150)
3. 📒 Açık Hes. → CustomerPicker → Mehmet seç → Yaz
4. ✅ Sadece seçili kalemler Mehmet'e yazıldı
5. ✅ Diğer 2 kalem masada kalır, kasiyer farklı şekilde ödeme alabilir
6. Panel → Mehmet → ✅ borç ₺150

### C) Boş Liste
1. Tüm cari kullanıcıları pasifleştir
2. Hesap Al → 📒 Açık Hes. → CustomerPicker
3. ✅ Mesaj: "Henüz cari kullanıcı yok — Panel → Cari Hesaplar'dan ekle"
4. **+ EKLE** YOK (kasa hızlı ekleme yok)
5. Vazgeç → eski ekrana döner

### D) Borçlu Kullanıcı Görünümü
1. Cari kullanıcının zaten ₺50 borcu var
2. Açık hesap modal → liste → ✅ "BORÇ ₺50" rozeti görünür (kırmızı)
3. Seçince: detay alanında **"Mevcut borç: ₺50"** uyarısı
4. Yaz → ✅ borç toplamı: ₺50 + yeni tutar

### E) Cari Ödeme (Paket 1'den korundu)
1. Müşteri kasaya geliyor: "Borcumu ödüyorum"
2. **Panel → Cari Hesaplar → Ahmet → + Ödeme Al**
3. ⚠️ Önce kasa oturumu açılmış olmalı
4. Tutar gir, Nakit seç, Onayla
5. ✅ Borç düşer, Z raporunda nakit girişi olarak görünür

## 💡 Mimari Notlar

### `customer_transactions` Tablosu Akışı
```
charge          → sipariş cariye yazıldı (paket 2)
payment         → kasada ödeme alındı (paket 1)
manual_charge   → panelden manuel borç (paket 1)
manual_credit   → panelden manuel alacak (paket 1)
```

### Z Raporu Etkisi (Paket 3'te detay)
Şu anda:
- **Kasada açık hesap kapanışı** → `payment_logs.method='other'` → Z raporu "Diğer" satırına düşer
- **Cari ödeme alındığında** → `payment_logs.method='cash/card/transfer'` → Z raporunda nakit/kart toplamına dahil ✓

İdeal olan: Z raporuna ayrı bir **"Açık Hesap"** satırı + "Net Açık Hesap" özeti. Bu Paket 3'e bırakıldı.

### Eksik Olanlar (Paket 3)
- 🔜 Z raporuna "Açık Hesap" özel satırı
- 🔜 Tarih filtreleri (Cari hareketler için)
- 🔜 CSV export
- 🔜 En aktif/borçlu kullanıcı özetleri
- 🔜 Sipariş detayında varyantlar/notlar

## 🗺️ Durum

| | |
|---|---|
| Paket 1: Backend + Panel | ✅ |
| **Paket 2: Kasa Entegrasyonu** | **✅ BU PAKET** |
| Paket 3: Z rapor + iyileştirmeler | 🔜 |

---

Push → test → çalışırsa **Paket 3** veya başka iş söyle 🚀
