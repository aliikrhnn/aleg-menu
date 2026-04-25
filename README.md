# 👥 GARSON ROL AYRIMI + FIX'LER

Üç düzeltme bir arada:
1. **Garson rolü ayrımı** — kasiyer ≠ garson, panelden hem kasiyer hem garson hesabı oluşturulur
2. **"✓ Çözüldüm" → "✓ Çözüldü"** dil tutarlılığı
3. **Hazır siparişlerde doğru başlık** — "Al-Götür" yerine `order_type`'a göre Masa / Paket / Kapıya

**7 dosya · 1 yeni migration.**

## 🎯 Konsept

```
PANEL → Kasiyerler & Garson Hesapları
   ↓
+ Yeni Hesap → Form'da rol seçimi:
   ┌─────────────────────────────┐
   │  ₺ Kasiyer     ⌬ Garson     │
   │  ◆ Her İkisi                │
   └─────────────────────────────┘
   ↓
Kayıt edilir, PIN tanımlanır
   ↓
   ├─→ /kasa: cashier + both olanları listeler
   └─→ /garson: waiter + both olanları listeler
```

Aynı PIN'le hem kasada hem garsonda giriş yapabilir (eğer rol "Her İkisi" ise).

## ✅ Yapılanlar

### 1. Migration `0029_cashier_role.sql`
- `cashier_accounts.role` kolonu eklendi (`cashier` / `waiter` / `both`)
- Default: `'cashier'` (mevcut tüm kayıtlar otomatik kasiyer rolünde kalır)
- Constraint + index

### 2. `lib/actions/cashiers.ts`
- `CashierRole` type export
- `Cashier` type'a `role` alanı
- `listCashiers()` artık role'ü de döner
- **`listActiveCashiers(filterRole?: 'cashier' | 'waiter')`** — opsiyonel filtre
  - `'cashier'` → role IN (cashier, both)
  - `'waiter'` → role IN (waiter, both)
  - Yoksa → hepsi
- `createCashier`/`updateCashier`'a `role` parametresi
- "Bu isimde aktif bir **kasiyer**" → "...aktif bir **kayıt**"

### 3. `app/kasa/page.tsx` & `app/garson/page.tsx`
- Kasa: `listActiveCashiers('cashier')`
- Garson: `listActiveCashiers('waiter')`

### 4. `app/panel/(shell)/kasiyerler/cashier-manager.tsx`
- Sayfa başlığı: "Kasiyer & Garson hesapları"
- "+ Yeni Kasiyer" → "+ Yeni Hesap"
- Modal başlık: "Yeni Hesap" / "İsim · Düzenle"
- **Form'a 3 segmented control rol seçimi**:
  - ₺ Kasiyer (Sadece kasa)
  - ⌬ Garson (Sadece servis)
  - ◆ Her İkisi (Kasa + servis)
- Card'larda **rol badge** her zaman gösterilir (KASİYER/GARSON/HER İKİSİ)

### 5. `lib/actions/waiter.ts`
- `ReadyOrder` type'a `order_type` eklendi
- SELECT'te de çekilir

### 6. `app/garson/waiter-board.tsx`
- **`getOrderDestination(order)`** helper — toast başlığı için (CAPS)
  - dinein → masa adı (örn "MASA 5")
  - pickup → "PAKET"
  - delivery → "KAPIYA"
- **`getOrderDestinationDisplay(order)`** helper — kart UI için (Title case)
  - dinein → masa adı (örn "Masa 5")
  - pickup → "Paket"
  - delivery → "Kapıya"
- "✓ Çözüldüm" → "✓ Çözüldü"
- ReadyTab kartı: artık order_type'a göre doğru başlık gösteriyor

## 📦 Dosyalar (7)

```
supabase/migrations/0029_cashier_role.sql               (yeni - role kolonu)
lib/actions/cashiers.ts                                 (CashierRole + filter)
lib/actions/waiter.ts                                   (order_type eklendi)
app/kasa/page.tsx                                       (filter: cashier)
app/garson/page.tsx                                     (filter: waiter)
app/panel/(shell)/kasiyerler/cashier-manager.tsx        (rol UI + badge)
app/garson/waiter-board.tsx                             (Çözüldü + destination)
```

## 🚀 Kurulum

### 1. Migration çalıştır (zorunlu)

Supabase Dashboard → SQL Editor → `0029_cashier_role.sql` içeriğini yapıştır → **Run**.

Mevcut tüm kayıtlar otomatik `role='cashier'` olur.

### 2. Push

```powershell
git add .
git commit -m "feat: kasiyer/garson rol ayrımı + ready order labels + UI tutarlılığı"
git push
```

## 🧪 Test

### A) Mevcut Kayıtlar
1. Migration sonrası → Panel → Kasiyerler
2. ✅ Tüm mevcut kayıtlar **KASİYER** badge'iyle görünür (default)
3. `/kasa` → tüm mevcut kayıtlar görünür ✅
4. `/garson` → ✅ "Henüz hesap yok" (çünkü hiçbiri waiter rolünde değil)

### B) Yeni Garson Hesabı
1. Panel → Kasiyerler → **+ Yeni Hesap**
2. Form aç:
   - İsim: "Mehmet" (örn)
   - Renk + Emoji
   - **Rol: Garson** seç (3 kart arasından ortadaki)
   - PIN: 1234
3. Oluştur → ✅ liste'de "Mehmet" + **GARSON** badge ile görünür
4. `/kasa` → Mehmet **görünmez** ✅
5. `/garson` → Mehmet **görünür** ✅

### C) Her İkisi Rolü
1. Panel → Mevcut bir kasiyeri düzenle → Rol "Her İkisi" yap
2. Kayıtta artık **HER İKİSİ** badge'i (accent renk)
3. `/kasa` → ✅ görünür
4. `/garson` → ✅ görünür
5. Aynı PIN ile her iki ekrana giriş yapabilir

### D) Garson Ekranı Düzeltmeleri
1. Garson ekranında **🔔 Çağrılar** sekmesi
2. Çağrı kartında "**✓ Çözüldü**" yazıyor (Çözüldüm değil) ✅
3. **🍽 Hazır** sekmesinde:
   - **Masa siparişi** → kart başlığı "Masa 5" gibi ✅
   - **Paket siparişi** → kart başlığı "Paket" ✅
   - **Delivery siparişi** → kart başlığı "Kapıya" ✅

### E) Toast'larda Doğru Başlık
1. Telefondan masa-1'den sipariş ver → toast: "🍽 MASA 1 · Sipariş hazır..."
2. Pickup siparişi (eğer modes.pickup açıksa) → toast: "🍽 PAKET · Sipariş hazır..."

## 💡 Mimari

### Geriye Uyumluluk
- Migration default `'cashier'` — eski sistemler etkilenmez
- `listActiveCashiers()` parametresiz çağrı hâlâ çalışır (hepsi)

### Ortak PIN Sistemi
- Tek `cashier_accounts` tablosu, tek `CashierLogin` component
- Aynı kişi birden fazla rolde olabilir (`role = 'both'`)
- Lock/unlock akışı paylaşılır

### Order Destination Logic
```typescript
function getOrderDestination(o) {
  if (o.order_type === 'pickup') return 'PAKET';
  if (o.order_type === 'delivery') return 'KAPIYA';
  return o.table_name?.toUpperCase() || 'MASA';
}
```

`order_type` undefined ise → varsayılan dinein olarak ele alınır (`'MASA'` veya masa adı).

## 🗺️ Durum

| | |
|---|---|
| Garson ekranı v1 | ✅ |
| **Rol ayrımı + label fix'leri** | **✅ BU PAKET** |
| Garson sipariş detay modal | 🔜 |
| Süper admin panel | 🔜 |

## 🔮 Sonra İyileştirmeler

- Sipariş detayı modal (hazır sekmesinden tıklayınca tüm ürünler)
- Masa detay modal (açık siparişler/ödeme)
- Garson özel yetkileri (sipariş alma vs sadece teslim)
- Vardiya/shift takibi
- Performans metrikleri (kim kaç çağrıya cevap verdi)

Push → migration → test → çalışırsa "**süper admin paneli**" veya başka iş söyle 🚀
