# 🔧 CARİ DEBUG FIX — Açık Hesaba Aktarımda Hata Tanısı

## 🐛 Sorun
"Açık hesap olarak kapat" butonuna basınca:
```
HATA #A010D7BD: Sipariş bulunamadı
```

## 🔍 Sebep — Birkaç İhtimal

`closeOrderOnAccount` action'ı sıkı güvenlik kontrolleri yapıyordu ama
hata mesajları çok genel ("Sipariş bulunamadı") → **gerçek sebep gizli**:

1. ❓ Sipariş ID boş mu (frontend bug)?
2. ❓ Sipariş başka business'a mı ait (RLS / multi-tenant problem)?
3. ❓ Sipariş zaten ödenmiş mi (sayfa bayat)?
4. ❓ Sipariş iade edildi mi?
5. ❓ Kullanıcı pasifleştirilmiş mi?

## ✅ Çözüm — Detaylı Hata Mesajları

`closeOrderOnAccount` artık **spesifik sebebi** söyler:

| Sebep | Mesaj |
|-------|-------|
| Boş orderId | "Sipariş ID boş (orderId yok)" |
| Boş customerId | "Kullanıcı seçilmedi" |
| Boş cashierId | "Kasiyer bilgisi yok" |
| DB query hatası | "Sipariş query hatası: {detay}" |
| Sipariş yok | "Sipariş bulunamadı (ID: abc12345…). Sayfayı yenileyin." |
| Yanlış business | "Sipariş başka bir işletmeye ait" |
| Zaten ödenmiş | "Sipariş #ORD-101 zaten ödenmiş. Sayfayı yenileyin." |
| İade edilmiş | "Sipariş #ORD-101 iade edildi" |
| Yanlış müşteri | "Seçilen kullanıcı bulunamadı" |
| Pasif kullanıcı | "Ahmet Yılmaz pasif kullanıcı" |

## 🚀 Push

```powershell
Expand-Archive -Path cari-debug-fix.zip -DestinationPath . -Force

git add . && git commit -m "fix(cari): detailed error messages in closeOrderOnAccount" && git push
```

## 🧪 Test Et

Hatayı tekrar üret:
1. Masada sipariş aç (yeni)
2. Hesap Al → 📒 Açık Hes → "Açık Hesap Olarak Kapat"
3. CustomerPicker → kullanıcı seç → "X'a Yaz"

### Beklenen
Artık **spesifik mesaj** alacaksın:

**A) "Sipariş #X zaten ödenmiş. Sayfayı yenileyin."**
→ Sayfa bayat. F5 / Ctrl+F5 yap.

**B) "Sipariş bulunamadı (ID: abc...)"**
→ Frontend yanlış orderId gönderiyor. Browser DevTools → Network tab → action call body'ye bak. orderId değeri gerçekten doğru mu?

**C) "Sipariş başka işletmeye ait"**
→ RLS sorunu. Multi-tenant testlerinden kalma kayıt olabilir.

**D) "Sipariş ID boş (orderId yok)"**
→ HesapPanel'de `unpaidOrders` listesi state senkron değil.

## 💡 Görseldeki Durum

Görselde:
- Masa B5'te 1 kalem (Ice Matcha Latte ₺115)
- Kalem rozeti **HAZIR**
- Modal'da "1 KALEM"
- Toplam **₺115**

Ama `closeOrderOnAccount` "Sipariş bulunamadı" döndü. **En güçlü ihtimal**:
sipariş **daha önceki testlerde** zaten ödenmiş veya cariye yazılmış,
ama frontend hâlâ eski state'i gösteriyor.

**Hızlı çözüm**: F5 yap, modal'ı tekrar aç, tekrar dene.

Push edip yeni mesajları gör — sorunun **gerçek sebebi** belli olur 🎯
