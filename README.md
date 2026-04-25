# 🔔 ÇAĞRI SİSTEMİ — DÜZELTMELER

İki sorun:
1. **Yeni eklenen butonlar menüde görünmüyor** → 60sn cache yüzünden
2. **Kasaya bildirim gelmiyor** → realtime publication problemi olabilir

**3 dosya · 1 yeni migration.**

## 🐛 Sorun 1: Buton Cache

Menü sayfası `revalidate = 60` ile **60 saniye cache**'leniyor. Panelden buton ekleyince 60sn beklenen kadar görünmez.

### ✅ Fix
Sheet (bottom sheet) açıldığında `getPublicCallButtons` ile **anlık fetch** yapıldı.

```tsx
// Sheet açılışında en güncel butonları getir
useEffect(() => {
  if (!serviceSheetOpen) return;
  (async () => {
    const result = await getPublicCallButtons(business.id);
    if (result.success) setCallButtons(result.buttons);
  })();
}, [serviceSheetOpen, business.id]);
```

İlk render server-side'dan gelir (hızlı), sheet her açıldığında client-side refresh olur.

## 🐛 Sorun 2: Realtime Bildirim

Realtime için 2 şart:
1. `waiter_calls` tablosu `supabase_realtime` publication'da olmalı
2. `REPLICA IDENTITY FULL` (UPDATE event payload'ı için)

Migration 0027'de varmış ama bazen Supabase Dashboard'dan kontrol gerekli.

### ✅ Fix - Çift Çözüm

**A) Realtime garantili migration `0028_realtime_fix.sql`:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE waiter_calls;
ALTER TABLE waiter_calls REPLICA IDENTITY FULL;
```

**B) Polling fallback (kasada):**
Realtime çalışmasa bile, kasa **5 saniyede bir** aktif çağrıları kontrol eder:
- Yeni çağrı varsa: ses + toast + rozet bump
- Yoksa: sessiz

Bu sayede:
- Realtime varsa → **anlık** (saniye altı)
- Realtime yoksa → **5 saniye içinde** her halükarda bildirim gelir

## 📦 Dosyalar (3)

```
app/menu/[slug]/menu-view.tsx                    ← Sheet açılınca refresh
app/kasa/register-panel.tsx                      ← Polling 5sn fallback
supabase/migrations/0028_realtime_fix.sql        ← Realtime garantili
```

## 🚀 Kurulum

### 1. Migration çalıştır

Supabase Dashboard → SQL Editor → `0028_realtime_fix.sql` içeriğini yapıştır → **Run**

### 2. Realtime ayarını manuel kontrol et (önemli!)

Supabase Dashboard → **Database** → **Replication**
- `supabase_realtime` publication'a tıkla
- `waiter_calls` tablosu listede olmalı ✅
- Yoksa "Add table" → seç → ekle

### 3. 3 dosyayı yerleştir + push

```powershell
git add .
git commit -m "fix: çağrı butonları cache + realtime fallback polling"
git push
```

## 🧪 Test

### Buton Cache
1. Kasayı kapat (test için), panel'e geç
2. Çağrı Butonları → "Test Buton" 🎉 ekle
3. Hemen QR menüye geç → ✋ tıkla → "Test Buton" listede ✅

### Bildirim Akışı
1. Bilgisayarda: Kasa sekmesini aç
2. Telefonda: QR menüden çağrı yap
3. Bilgisayarda **en geç 5 saniye içinde**:
   - 🔔 3'lü ding sesi
   - Toast: "🔔 MASA X · Buton Adı"
   - Header'da rozet pop

### Sürekli Test
Console aç (F12) → kasa sekmesinde:
- Network tab → her 5 saniyede `getActiveWaiterCalls` çağrısı görünür
- Realtime çalışıyorsa: WebSocket connection (yeşil) `realtime.supabase.co`

## 💡 Neden Polling?

**Realtime avantajları:**
- Anlık (< 1sn)
- WebSocket - tek bağlantı

**Polling avantajları:**
- Her zaman çalışır (firewall/proxy sorunu yok)
- Basit ve güvenilir
- Migration sorunlarına dirençli

**İkisi birlikte = bulletproof.** Realtime varsa hızlı, yoksa 5sn'de yedekler.

## 🗺️ Durum

| İş | Durum |
|---|---|
| Çağrı butonları (D1) | ✅ |
| **Buton cache + realtime fix** | **✅ BU PAKET** |
| D2 (yeni sipariş bildirimi) | 🔜 |

Push → migration → test → çalışırsa **"D2 başlat"** veya **"garson ekranı"** de. 🚀
