# 🔔 ÇAĞRI BİLDİRİM FİX — KasaBoard Polling

**Asıl bug:** Polling kodu `RegisterPanel` içindeydi ama kasa sayfası `KasaBoard`'u render ediyor — `RegisterPanel` sadece `register` tab açıkken render olur. Yani sen "Masalar" tab'ındayken polling **hiç başlamıyordu**, o yüzden Network tab'da hiç istek görünmüyordu.

**2 dosya.**

## 🐛 Sorun

```
KasaPage → KasaApp → KasaBoard
                       ├─ activeTab='tables'   → TablesGrid
                       ├─ activeTab='orders'   → OrdersBoard
                       ├─ activeTab='quick'    → QuickSale
                       └─ activeTab='register' → RegisterPanel  ← polling burada
```

Sen "Masalar" sekmesinde olunca `RegisterPanel` **mount bile olmuyordu**, dolayısıyla polling/realtime/ses/toast/rozet çalışmıyordu.

## ✅ Çözüm

Tüm bildirim sistemi `KasaBoard` seviyesine taşındı — **tab'dan bağımsız çalışır**:

### KasaBoard'a eklendi

1. **State**: `activeCalls`, `callsPanelOpen`, `callsBump`
2. **Polling useEffect** — 5 saniyede bir `getActiveWaiterCalls`
3. **Realtime subscribe** — `waiter_calls_kasa_board` channel (ayrı isim, conflict önler)
4. **Header rozeti** — KILITLE butonu yanında, tüm tab'larda görünür
5. **Sağdan açılır panel** — çağrı listesi, çözüldü butonları
6. **handleResolveCall**, **handleResolveAllCalls** callbacks

### RegisterPanel'den çıkarıldı

- State, polling, realtime, callbacks (162 satır)
- Header rozet UI (51 satır)
- Panel modal UI (254 satır)
- Gereksiz importlar (`getActiveWaiterCalls`, `playCall`, `createClient`, vb.)

**Sonuç:** Çakışma yok, ses çift çalmıyor, herhangi bir sekmede çağrı bildirimi gelir.

## 📦 Dosyalar

```
app/kasa/kasa-board.tsx       (state + polling + realtime + header rozeti + panel modal)
app/kasa/register-panel.tsx   (waiter calls kodu silindi, sade kaldı)
```

## 🚀 Push

```powershell
git add .
git commit -m "fix(kasa): waiter calls notifications work on all tabs (kasa-board polling)"
git push
```

## 🧪 Test (önemli — hard refresh yap)

1. **Ctrl+Shift+R** ile kasa sayfasını yenile (cache temizle)
2. Kasa açıldıktan sonra (PIN sorulursa gir):
   - **F12 → Network → Fetch/XHR**
   - 5 saniyede bir `getActiveWaiterCalls` request görmen lazım ✅
3. **Masalar sekmesinde** dur (önemli!)
4. Telefondan QR menüden bir çağrı yap
5. **En geç 5 saniye içinde:**
   - 🔔 3'lü ding sesi ✅
   - Üst köşede toast ✅
   - Header'da turuncu rozet (KILITLE butonunun yanında) ✅
6. **Rozete tıkla** → sağdan panel kayar
7. **✓ Çözüldü** tıkla → liste güncellenir
8. Diğer sekmelere geç (Siparişler, Hızlı Satış) → rozet hâlâ görünüyor olmalı

## 💡 Mimari Notu

**Polling channel adı**: `waiter_calls_kasa_board` (RegisterPanel'in `waiter_calls_kasa` olanından farklı — eski deploy'da kalıntı varsa çakışmasın diye).

**Polling stratejisi**:
- İlk fetch sessiz (ses çalmaz, sadece state init)
- Sonraki fetch'lerde yeni ID varsa → ses + toast + bump
- Realtime varsa anında, yoksa 5sn'de yedek

## 🗺️ Durum

| | |
|---|---|
| Çağrı butonları sistemi (D1) | ✅ |
| Cache + realtime fix | ✅ |
| Lint quotes fix | ✅ |
| ConfirmDialog API fix | ✅ |
| Kasa link subdomain fix | ✅ |
| **KasaBoard polling fix (gerçek bug)** | **✅ BU PAKET** |
| D2 (yeni sipariş bildirimi) | 🔜 |
| Garson ekranı | 🔜 |

Push → hard refresh → test → çalışırsa **"D2 başlat"** veya **"garson ekranı"** de. 🚀
