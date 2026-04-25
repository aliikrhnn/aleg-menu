# 🎛 GARSON — VARYANTLAR + SEÇENEKLER

Garson sipariş alma modalına varyant ve option_preset desteği eklendi. Bottom sheet seçim modalı ile gerçek POS deneyimi.

**1 dosya · Migration yok · `createManualOrder` zaten options destekliyordu (sadece UI işi).**

## 🎯 Akış

```
Sipariş alma modalı
   ↓
Ürün kartına tıkla
   ↓
Eğer varyantlı veya option_preset'li ise
   → Bottom sheet seçim modalı açılır:
     ├─ Header: ürün adı + açıklama + ✕
     ├─ VARYANT (radio): Boyut → Küçük/Orta/Büyük (+₺X)
     ├─ OPTION PRESET'LER:
     │   ├─ Single (radio): Şeker → Yok/Az/Normal/Bol
     │   └─ Multi (checkbox): Ekstralar → Sucuk +₺5, Kaşar +₺5, ...
     ├─ Müşteri Notu (input)
     └─ Footer: TOPLAM (real-time) + + Sepete Ekle
   ↓
Düz ürün ise (varyant + preset yok)
   → Direkt sepete eklenir
```

## ✨ Özellikler

### Bottom Sheet Modal
- **Mobile**: aşağıdan slide-up (rounded top)
- **Desktop**: ortada modal (rounded full)
- Backdrop tıklanınca kapanır
- Animasyon: spring bounce in

### Varyant Seçimi (radio)
- Tek seçim, ilk varyant default
- Her satırda fiyat farkı (`+₺5`, `+₺10`)
- Seçili olan accent border + filled radio dot

### Option Preset'ler
- **Single** type → radio buttons
- **Multi** type → checkboxes
- **Required** preset → "* ZORUNLU" rozet, seçilmeden eklenemez
- **Default values** otomatik seçili (DB'deki `is_default`)
- Her değer için price_delta gösterimi

### Real-Time Fiyat
```
TOPLAM = base_price + variant_delta + sum(selected_options.price_delta)
```
Her seçim değişikliğinde anında güncellenir.

### Validation
- Tüm `required` alanlar dolu olana kadar **+ Sepete Ekle** butonu disabled
- Disabled state: opaklık 40%

### Sepette Görünüm
- Her cart item'da seçilen options küçük accent chip'leri
- Format: `Orta · Az şeker · Yulaf süt · Bademli`
- Chip'lerde price_delta da görünür (`+₺5`)

### ProductCard Önizleme
- Varyantlı veya option'lı ürünlerde sağ üstte **"◈ SEÇENEK"** rozeti
- Garson hangi ürünlerin seçenekli olduğunu önceden görür

### Hash Bazlı Birleştirme
Sepete ekleme key:
```
${productId}__${variantId || 'none'}__${optsHash}__${note || ''}
```

- **Aynı seçimli aynı ürün** → adet artar
- **Farklı seçimli aynı ürün** → yeni satır

Örnek:
```
1× Latte (Büyük) · Bol şekerli       ← bir satır
1× Latte (Orta)  · Şekersiz · Bademli ← ayrı satır
2× Latte (Büyük) · Bol şekerli       ← üstüne tıklanırsa adet 2 olur
```

## 📦 Dosya (1)

```
app/garson/order-taking-modal.tsx     (CartItem.options + ProductOptionsPicker + chip'ler)
```

## 🚀 Push

```powershell
git add .
git commit -m "feat(garson): varyant + option_preset seçim modalı (radio/checkbox/required)"
git push
```

## 🧪 Test

### A) Varyantlı Ürün
1. Panel'den bir ürüne varyant ekle (örn Kahve: Küçük/Orta/Büyük, fiyat farklarıyla)
2. Garson → masa tıkla → modal açılır
3. Kahve kartında ✅ "◈ SEÇENEK" rozeti görünür
4. Karta tıkla → ✅ seçim modalı açılır (bottom sheet)
5. Boyut listesinde 3 seçenek + her birinde fiyat farkı
6. "Orta" seç → ✅ TOPLAM güncellenir
7. **+ Sepete Ekle** → sepette `Latte (Orta)` görünür, accent chip: `Orta`

### B) Option Preset (Single + Required)
1. Bir ürüne preset ekle: "Şeker" (single, required, values: Yok/Az/Normal/Bol)
2. Modal aç → "Şeker" başlığında ✅ "* ZORUNLU" rozet
3. **+ Sepete Ekle** disabled (henüz seçim yok ya da default'tan dolayı seçili olabilir)
4. "Az" seç → buton aktif → ekle
5. Sepette chip: `Az`

### C) Option Preset (Multi)
1. Ürüne preset ekle: "Ekstralar" (multi, optional, values: Sucuk +5, Kaşar +5, Mantar +3)
2. Modal aç → "Ekstralar" başlığı + "Birden fazla seçilebilir" subtitle
3. Sucuk + Mantar seç → toplam +₺8 artar
4. Ekle → sepette: `Sucuk +₺5 · Mantar +₺3` chip'leri

### D) Default Values
1. Bir preset value'sını `is_default=true` yap
2. Modal aç → ✅ o değer otomatik seçili gelir
3. Required preset için en az bir default varsa → buton aktif gelir

### E) Aynı/Farklı Seçim Birleştirme
1. Latte (Büyük) + Az şekerli ekle
2. Aynı seçimle tekrar Latte (Büyük) + Az şekerli ekle → ✅ adet 2 olur
3. Latte (Büyük) + **Bol şekerli** ekle → ✅ ayrı satır olarak eklenir

### F) Düz Ürün
1. Varyantsız ve option_preset'siz bir ürüne tıkla
2. ✅ Modal AÇILMAZ, direkt sepete eklenir (eski akış)

### G) Mutfağa Gönder
1. Çeşitli seçimlerle birkaç ürün ekle
2. **✓ Mutfağa Gönder**
3. Garson "Siparişler" sekmesinde kartı aç
4. ✅ Her kalemde ürün adı + adet + (varsa) options görünür
5. Mutfak panel/POS'ta da options ile birlikte yazdırılır

## 💡 Mimari

### Backend Değişikliği YOK
`createManualOrder` action zaten `items[].options` parametresi alıyordu:
```typescript
options?: Array<{
  preset_name: string;
  value_name: string;
  price_delta: number;
}>;
```

DB'ye `order_items.options` JSONB olarak yazılır. Mutfak/POS sipariş gösterirken zaten okuyor.

### State Yapısı
```typescript
const [pickerProduct, setPickerProduct] = useState<ProductForPos | null>(null);
const [variantId, setVariantId] = useState<string | undefined>(...);
const [selectedOpts, setSelectedOpts] = useState<Record<string, string[]>>(...);
```

`selectedOpts` haritası: `presetId → [valueId, ...]`. Single'da tek eleman, multi'de birden fazla.

### Validation
```typescript
const isValid = sortedPresets.every((p) => {
  if (!p.required) return true;
  return (selectedOpts[p.preset_id] || []).length > 0;
});
```

## 🗺️ Durum

| | |
|---|---|
| Garson sipariş alma | ✅ |
| **Varyantlar + option preset'ler** | **✅ BU PAKET** |
| Süper admin paneli | 🔜 |
| Modül yönetimi | 🔜 |

## 🔮 Sonra

- **Açık masaya kalem ekleme** — yeni bağımsız sipariş yerine mevcut hesaba ekleme
- **Hızlı satış** garson tarafında (masa olmayan paket/al-götür)
- **Kalem düzenleme** sepette → seçimleri tekrar açma
- **Geçmiş sipariş şablonları** — sık tekrar siparişler

Push → test → çalışırsa sonraki feature'a 🚀
