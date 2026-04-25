# 🔔 MASA ÇAĞRI ROZETİ

Masalar tab'ında bir masadan çağrı geldiyse, masa kartının **sağ üst köşesinde kırmızı yanan rozet** görünür.

**2 dosya.**

## ✅ Ne Yapıldı

### KasaBoard
- `callsByTable: Map<tableId, count>` memo — `activeCalls`'tan otomatik üretilir
- TablesGrid'e prop olarak geçilir

### TablesGrid + TableCard
- `callsByTable` prop alır
- Her masa kartı kendi `activeCallCount` ile render olur
- Sağ üst köşede **mini rozet**:
  - 1 çağrı → 🔔 zil ikonu
  - 2+ çağrı → sayı
  - Accent renkte, paper outline, callsBumpPulse + callsPing animasyonları
  - Sürekli yanıp söner (dikkat çeker)

## 📦 Dosyalar

```
app/kasa/kasa-board.tsx       (callsByTable memo + prop)
app/kasa/tables-grid.tsx      (TableCard rozet UI)
```

## 🚀 Push

```powershell
git add . && git commit -m "feat(kasa): masa kartında çağrı rozeti" && git push
```

## 🧪 Test

1. Hard refresh (Ctrl+Shift+R)
2. Kasa → **Masalar** tab
3. Telefondan masa-1'den çağrı yap
4. Masa-1 kartının sağ üst köşesinde **🔔 yanan rozet** görünür ✅
5. Aynı masadan ikinci çağrı (farklı buton) → rozet **2** olur
6. Header'daki rozet'e tıkla → panel → ✓ Çözüldü → masa rozeti kaybolur

## 🎨 Detay

**Konum:** Sağ üst, kart sınırının dışına 6px taşar (üzerinden kesilir gibi durur)
**Renk:** `var(--accent)` — kırmızıya yakın brick
**Outline:** `var(--paper)` 2.5px — karttan ayırır
**Animasyon:** 
- `callsBumpPulse` 1.4s sürekli (büyüyüp küçülür)
- `callsPing` 1.8s ease-out (halka yayılır)

## 🗺️ Durum

| | |
|---|---|
| Çağrı butonları (D1) | ✅ |
| Bildirim fix (KasaBoard) | ✅ |
| **Masa rozeti** | **✅ BU PAKET** |
| D2 (yeni sipariş) | 🔜 |
| Garson ekranı | 🔜 |

Push → test → çalışırsa **"D2 başlat"** veya **"garson ekranı"** de. 🚀
