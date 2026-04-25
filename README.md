# 🔧 HESAP PANEL — Mutfak Fişi Toggle

Sepete ürün eklenirken **kasiyer karar versin** — mutfağa gitsin mi gitmesin mi.

**2 dosya · Migration yok.**

## 🎨 UI

Sepet altında yeni bir toggle:

```
┌─────────────────────────────────────────┐
│ 🛒 SEPET                                │
│ ─────────────────────────────────────── │
│ 1× Su                            ₺10   │
│ 1× Bardak                        ₺5    │
│ ─────────────────────────────────────── │
│ 2 ÜRÜN              [+ Masaya Ekle]    │
│ ₺15                                     │
│ ─────────────────────────────────────── │
│ 🚫 MUTFAĞA YOLLAMA           [○──]    │  ← KAPALI (default)
│ Sadece hesaba eklenir                  │
└─────────────────────────────────────────┘

Toggle açıldığında:
┌─────────────────────────────────────────┐
│ 🖨️ MUTFAĞA YOLLA              [──●]   │  ← AÇIK
│ Fiş basılır, istasyona düşer            │
└─────────────────────────────────────────┘
```

## ⚙️ Davranış

- **HesapPanel'de default**: KAPALI (mutfağa gitmez)
- **Garson akışında default**: AÇIK
- Kasiyer her seferinde **toggle ile değiştirebilir**
- Sepet temizlenince state korunur (kasiyer ayarladığı gibi devam eder)

## 🎯 Kullanım Senaryoları

| Senaryo | Toggle |
|---------|--------|
| Müşteri "1 su daha ister" — masada zaten su var | KAPALI |
| Müşteri "1 yeni kahve" — barista yapacak | AÇIK |
| "Bardak getir" gibi servis ürün | KAPALI |
| Yemek sipariş ekleme | AÇIK |

## 🔧 API

```typescript
type Props = {
  tableId: string;
  targetOrderId?: string;
  cashierId: string;
  onAdded: () => void;
  /**
   * Toggle'ın başlangıç değeri.
   * HesapPanel: false (kapalı)
   * Garson/Quick Add: true (açık)
   */
  defaultSendToKitchen?: boolean;
  /**
   * Toggle'ı tamamen gizle (forced behavior)
   */
  hideKitchenToggle?: boolean;
};
```

## 📦 Dosyalar (2)

```
components/order/menu-picker.tsx    (toggle UI + state + ToggleSwitch component)
components/order/hesap-panel.tsx    (defaultSendToKitchen={false})
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(hesap-panel): mutfak fişi toggle - kasiyer karar versin"
git push
```

## 🧪 Test

### A) Hesap Panel — Default Kapalı
1. Hesap Al → sağ menü
2. Sepete ürün ekle
3. ✅ Toggle: **KAPALI** (gri 🚫 + "Sadece hesaba eklenir")
4. **+ Masaya Ekle** → ✅ mutfağa GİTMEZ, sadece hesaba düşer

### B) Toggle Açma
1. Sepette ürün varken toggle'a tıkla
2. ✅ Toggle accent renge döner (🖨️ + "Fiş basılır, istasyona düşer")
3. **+ Masaya Ekle** → ✅ mutfağa fiş basılır

### C) State Korunma
1. Toggle'ı AÇIK yap → ürün ekle → sepet temizlenir
2. Yeni ürün ekle
3. ✅ Toggle hâlâ AÇIK (kasiyerin tercihi korundu)

### D) Garson Akışı (etkilenmedi)
1. Garson masaya tıkla → OrderTakingModal
2. Bu MenuPicker değil OrderTakingModal — toggle yok
3. Eski davranış: her zaman mutfağa gider ✓

## 💡 Mimari

### State Yönetimi
```typescript
const [sendToKitchen, setSendToKitchen] = useState(defaultSendToKitchen);
```

- Component mount'ta `defaultSendToKitchen` ile başlar
- Kasiyer toggle ile değiştirir
- Component yeniden render olmadıkça state korunur

### `hideKitchenToggle` Prop
Toggle'ı tamamen gizlemek için (örn. ileride kiosk modunda):
```tsx
<MenuPicker hideKitchenToggle defaultSendToKitchen={true} />
```

### Görsel İpuçları

| Durum | İkon | Renk | Mesaj |
|-------|------|------|-------|
| Açık | 🖨️ | accent | "Fiş basılır, istasyona düşer" |
| Kapalı | 🚫 | gri | "Sadece hesaba eklenir" |

## 🗺️ Durum

| | |
|---|---|
| Hesap panel B (tam özellik) | ✅ |
| Ödenen kalem grileşme | ✅ |
| Kalan tutar + satır click | ✅ |
| **Mutfak fişi toggle** | **✅ BU PAKET** |
| Süper admin paneli | 🔜 |

Push → test → çalışırsa **"süper admin paneli"** veya başka iş söyle 🚀
