# HAVALE ÖDEME YÖNTEMİNİ KALDIRMA

Havale/EFT ödeme seçeneği UI'dan kaldırıldı. Sadece **Nakit** ve **Kart** (ve bölünmüş ödemede ayrıca "Diğer") kalıyor.

**3 dosya, migration yok.**

## 🎯 Değişiklikler

### 1. Ana Ödeme Modal — Havale Butonu Kaldırıldı

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Nakit  │ │   Kart  │ │ Havale  │  ← SİLİNDİ
└─────────┘ └─────────┘ └─────────┘

↓

┌─────────────────┐ ┌─────────────────┐
│      Nakit      │ │       Kart      │
└─────────────────┘ └─────────────────┘
```

`payment-modal.tsx`'ten `<MethodButton active={method === 'transfer'} />` bloğu silindi.

### 2. Bölünmüş Ödeme — Havale Butonu Kaldırıldı

```
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ NAKİT │ │  KART │ │HAVALE │ │ DİĞER │  ← HAVALE kaldırıldı
└───────┘ └───────┘ └───────┘ └───────┘

↓ (3 kolon)

┌────────┐ ┌────────┐ ┌────────┐
│ NAKİT  │ │  KART  │ │ DİĞER  │
└────────┘ └────────┘ └────────┘
```

`split-payment-modal.tsx`'te:
- `methods` dizisinden transfer çıkarıldı
- `grid-cols-4` → `grid-cols-3`

### 3. Geriye Dönük Uyumluluk Korundu

**`PaymentMethod` type'ı** aynen kaldı:
```typescript
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'online' | 'split' | 'other';
```

**Sebep:** Daha önce havale ile ödenmiş siparişler var → DB'deki `orders.payment_method = 'transfer'` değerleri rapora dahil edilmeli. Type silinirse TypeScript hatası çıkar.

**Label'lar** (Havale/EFT) raporlar ve PDF için kalıyor:
- `lib/utils/z-report-pdf.ts` → `transfer: 'Havale/EFT'`
- `app/panel/(shell)/pos/z-report-modal.tsx` → `transfer: 'Havale/EFT'`
- `app/kasa/register-panel.tsx` → `transfer: 'Havale/EFT'`
- `app/kasa/day-summary-preview.tsx` → `transfer: 'Havale/EFT'`

### 4. Rapor Davranışı

Eski `transfer` ödemeleri:
- `byMethod.transfer` tablosunda kalır (eski veri)
- `other_total`'a dahil olur (çünkü `m !== 'cash' && m !== 'card'`)
- Yeni ödemelerde 0 olur (artık yazılmıyor)

Comment güncellendi: `other_total: number; // online/diğer (eski: havale dahildi)`

## 📦 Dosyalar (3)

```
app/panel/(shell)/pos/payment-modal.tsx        ← Havale butonu kaldırıldı
app/panel/(shell)/pos/split-payment-modal.tsx  ← Havale kaldırıldı, 3 kolon
lib/actions/payments.ts                         ← Comment güncellendi
```

## 🚀 Kurulum

```powershell
# 3 dosyayı üstüne yaz → F5
```

Hot reload yeterli. Migration yok, DB değişikliği yok.

## 🧪 Test Senaryoları

### ✅ 1. Ana Ödeme
1. Sipariş aç → ÖDEME AL
2. Ödeme modal'ı açılır
3. ✅ Sadece **Nakit** ve **Kart** butonları görünür
4. Havale butonu **YOK**

### ✅ 2. Bölünmüş Ödeme
1. Sipariş → ÖDEME AL → BÖLÜNMÜŞ ÖDEME
2. ✅ Split modal'da sadece NAKİT / KART / DİĞER (3 buton)
3. HAVALE butonu **YOK**

### ✅ 3. Eski Havale Siparişleri Rapor
1. Daha önce havale ile ödenmiş bir siparişiniz varsa
2. Gün Sonu raporu al (o günü içeren aralık)
3. ✅ Rapor'da **ödeme yöntemi dağılımında** "Havale/EFT" satırı görünür (eski veri için)
4. ✅ PDF'te aynı şekilde görünür
5. Yeni siparişlerde havale görünmez

### ✅ 4. TypeScript Tip Kontrolü
1. IDE'de lint/type check çalıştır
2. ✅ Hata yok (type'ta transfer hâlâ tanımlı)

## 💡 Tasarım Kararı: Type'ı Silmedik

Alternatif: `PaymentMethod` type'tan `'transfer'`'ı tamamen kaldırmak.

Neden yapmadık:
- Eski `orders.payment_method = 'transfer'` kayıtları DB'de var
- TypeScript catch etmez ama runtime'da label eşleşmeyebilir
- Rapor/PDF tarafında "Havale/EFT" label'ı lazım
- "Diğer" olarak grupla denebilir ama işletmeci kayıt için adını görmek ister

**Karar:** Sadece UI'dan kaldır, arka planda kalsın. Gerçek temizlik istenirse ileride DB migration ile `transfer` kayıtları `other`'a taşınabilir.

## 📍 Git Push

```powershell
git add "app/panel/(shell)/pos/payment-modal.tsx" "app/panel/(shell)/pos/split-payment-modal.tsx" lib/actions/payments.ts
git commit -m "feat(pos): havale ödeme yöntemi UI'dan kaldırıldı (geriye dönük uyumluluk korundu)"
git push
```

## 🗺️ Durum

| İş | Durum |
|---|---|
| Tüm önceki paketler | ✅ |
| **Havale kaldırma** | **✅ BU PAKET** |
| Rapor ödeme breakdown | 🔜 |
| QR menü | 🔜 |
| Garson ekranı | 🔜 |

## 🔜 Sırada

Hangisi devam etsin?
- 📋 **Rapor ödeme breakdown** — Panel raporda ödeme detayları
- 📱 **QR menü** — Müşteri tarafı `[cafe-slug].alegstudio.com`
- 🍽 **Garson ekranı** — Mobil sipariş girişi
