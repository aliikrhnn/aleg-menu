# 🎯 CARİ MANUEL PAKET A — Kasa Yansıması

Manuel borç ve manuel alacak hareketleri artık **kasaya yansıyor** ve **gün
sonu raporunda detaylı görünüyor**.

**5 dosya · Migration yok.**

## ✅ Yapılan

### 1. Manuel Borç (`addManualCharge`)
- ❗ **Kasa oturumu zorunlu** (kapalıysa "Önce kasayı aç" hatası)
- Aktif oturumla otomatik bağlanır
- `payment_logs`'a `method='other'` olarak kayıt → ciroya dahil değil
- `customer_transactions` kayıt: cashier_id + cash_session_id + payment_log_id
- Z raporunda "Yeni borçlanma" listesinde **MANUEL** rozetiyle görünür

### 2. Manuel Alacak (`addManualCredit`) — 3 Tip
```typescript
creditType: 'cash' | 'card' | 'adjustment'
```

| Tip | Davranış |
|-----|----------|
| 💵 **Nakit** | Kasaya nakit girişi (avans tahsilatı). Kasa zorunlu. `payment_logs.method='cash'` |
| 💳 **Kart** | Kasaya kart girişi. Kasa zorunlu. `payment_logs.method='card'` |
| 📝 **Düzeltme** | Sadece bakiyeyi düzeltir, kasaya yazılmaz. Kasa opsiyonel. |

### 3. UI (Cari Detay Modal)
- **Manuel Alacak** modalında 3 tip seçim butonları
- Tip seçimine göre dinamik açıklama:
  - Nakit/Kart → "kasaya girer"
  - Düzeltme → "sadece bakiye, kasaya yazılmaz"
- **Manuel Borç** modalında uyarı bandı: "Kasa oturumu zorunlu"

### 4. Z Raporu Genişletildi
`getZReport.on_account_summary` artık 4 hareket tipini de dahil ediyor:

```typescript
new_charges: [
  { customer_name, amount, time, source: 'order' | 'manual' }
]
payments_received: [
  { customer_name, amount, time, method, source: 'payment' | 'manual_credit' }
]
```

**Kategori mantığı:**
- **Yeni Borçlanma** (kırmızı):
  - `charge` (sipariş açık hesaba) → `source: 'order'` → "SİPARİŞ" rozet
  - `manual_charge` (panelden manuel) → `source: 'manual'` → "MANUEL" rozet
- **Tahsilat** (yeşil):
  - `payment` (cari ödeme alındı) → `source: 'payment'` → "TAHSİLAT" rozet
  - `manual_credit` kasalı (avans nakit/kart) → `source: 'manual_credit'` → "AVANS" rozet
  - `manual_credit` düzeltme → **listede görünmez** (kasa hareketi değil)

### 5. Z Modal UI — Source Badges
Detay listesinde hareket başına etiket:
```
14:30 · Ahmet Yılmaz [SİPARİŞ]              +₺120
15:00 · Mehmet Demir [MANUEL]               +₺50
15:30 · Ahmet Yılmaz [TAHSİLAT] Nakit       −₺200
16:00 · Veli Bey [AVANS] Nakit              −₺100
```

### 6. Z Raporu PDF
Aynı source bilgisi PDF'e de yansıdı:
```
14:30  Ahmet Yilmaz [SIPARIS]                +120,00 TL
15:00  Mehmet Demir [MANUEL]                  +50,00 TL
15:30  Ahmet Yilmaz [TAHSILAT] (Nakit)       -200,00 TL
16:00  Veli Bey [AVANS] (Nakit)              -100,00 TL
```

## 📦 Dosyalar (5)

```
lib/actions/customers.ts                          (helper + 2 action)
lib/actions/payments.ts                           (Z rapor + type)
lib/utils/z-report-pdf.ts                         (PDF source label)
app/panel/(shell)/pos/z-report-modal.tsx          (UI source badge)
app/panel/(shell)/cari-hesaplar/
  customer-detail-modal.tsx                       (3 tip + uyarı)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(cari): manuel borç/alacak kasaya yansısın + z rapor source"
git push
```

## 🧪 Test

### A) Manuel Borç (Kasa Zorunlu)
1. **Kasa kapalıyken**: Cari → Ahmet → + Manuel Borç → ₺50 → ✅ Hata: "Açık kasa oturumu yok"
2. Kasiyer kasayı aç (₺200 açılış)
3. Aynı işlemi tekrar dene → ✅ Toast "Eklendi"
4. ✅ Ahmet'in borcu +₺50
5. Z Raporu → "Açık Hesap (Cari)" bölümü:
   - ✅ Yeni borçlanma: 1 sipariş ₺50
   - ✅ Detayda: "Ahmet Yılmaz [MANUEL] +₺50"

### B) Manuel Alacak — 3 Tip

**Tip 1: Nakit (Avans)**
1. Cari → Ahmet → + Manuel Alacak → 3 buton görünür
2. **Nakit** seç → açıklama: "kasaya nakit girişi olarak yazılır"
3. ₺100 → Onayla → ✅
4. Z Raporu: "Tahsilat ₺100 [AVANS] Nakit" görünür
5. Kasa nakit toplamı +₺100

**Tip 2: Kart (Avans)**
1. **Kart** seç → ₺200 → Onayla
2. Z Raporu: "AVANS Kart ₺200" — kart toplamına dahil

**Tip 3: Düzeltme**
1. **Düzeltme** seç → açıklama: "sadece bakiye, kasaya yazılmaz"
2. Kasa kapalı bile olsa çalışır
3. ₺30 → Onayla → ✅
4. Z Raporu: **liste'de YOK** (çünkü kasa hareketi değil)
5. Cari hareketinde görünür: "Manuel Alacak (Düzeltme) +₺30"

### C) Kasa Yansıması
1. Bugün 1 manuel borç (₺50), 1 avans nakit (₺100), 1 ödeme (₺200)
2. Kasa ekranında "Bugünkü Ciro ₺0" (sipariş yok)
3. Z Raporu:
   - Yeni borçlanma: 1 ₺50 (manuel)
   - Tahsilat: 2 ₺300 (1 avans + 1 ödeme)
   - Net: +₺250 (kasaya net giriş)
4. Kasa nakit toplamı: ₺300 (₺100 avans + ₺200 ödeme)

### D) Z Raporu PDF
1. PDF İndir
2. ✅ "ACIK HESAP (CARI)" bölümü
3. ✅ Detay listesinde her satırda **[SIPARIS]** / **[MANUEL]** / **[TAHSILAT]** / **[AVANS]** etiketi
4. ✅ Yöntem (Nakit/Kart/Havale) parantezde

## 💡 Mantık Özeti

```
Hareket Tipi → Kasa Yansıması?

charge          → ❌ ciro yansımaz (sipariş zaten ciroda) ama yeni borç olarak listelenir
manual_charge   → ❌ ciroya yansımaz, sadece "yeni borç" listesinde
payment         → ✅ kasaya method'a göre yansır (nakit/kart/havale)
manual_credit (cash/card)  → ✅ kasaya yansır (avans tahsilatı)
manual_credit (adjustment) → ❌ sadece bakiye düzeltir
```

## 🗺️ Durum

| | |
|---|---|
| Cari Paket 1: Backend + Panel | ✅ |
| Cari Paket 2: Kasa Entegrasyonu | ✅ |
| Cari Paket 3: Z Rapor + İyileştirmeler | ✅ |
| **Cari Manuel Paket A: Kasa Yansıması** | **✅ TESLİM** |
| Paket B: Yeni siparişler kolonu silme + flash | 🔜 |

---

Push → test → çalışırsa **Paket B** (kasa yeni sipariş kolonu silme + 5dk
kırmızı flash bildirim + otomatik onay) söyle 🚀
