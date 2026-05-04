# MIGRATION ARŞİV TEMİZLİĞİ — ÖNERİ

## SORUN

Repo'da düzensiz SQL dosyaları:

```
0017_reviews_FIXED.sql
MIGRATION-0010.sql
MIGRATION_UYGULANDI.sql
QUICK-FIX.sql
hepsi-birden.sql
migration_0039_products_nutrition.sql
migration_cashier_sessions.sql
migration_pin_attempts.sql
```

Bu durumda:
- Hangisi uygulandı, hangisi uygulanmadı belirsiz
- Yeni geliştiriciler/AI confused olur
- "Şu fix'i uygula" deyince yanlış dosyaya gidilir
- Yarın bug çıkarsa migration'ları gözden geçirmek zaman kaybeder

## ÇÖZÜM (Yarın Açılışından SONRA Yap)

### 1. Mevcut Durumu Tespit Et
Her SQL dosyasının başına yorum ekle:
```sql
-- DURUM: Uygulandı (Mart 2026, prod)
-- AÇIKLAMA: Reviews tablosu için RLS politikaları
```

### 2. Klasör Yapısı Oluştur
```
/migrations/
├── /applied/           ← Prod'a uygulanmış olanlar (referans için)
│   ├── 0010-...sql
│   └── 0039-products-nutrition.sql
├── /archive/           ← Eski/geçersiz olanlar
│   ├── QUICK-FIX.sql
│   └── hepsi-birden.sql
└── /pending/           ← Henüz uygulanmamış
    └── (boş şu an)
```

### 3. Drizzle Veya Prisma Migrate Kullan
Manuel SQL yerine bir migration tool kullan. Aleg Next.js olduğu için
**Drizzle ORM** öneriyorum:

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';
export default {
  schema: './lib/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Avantajları:**
- Otomatik versiyonlama (0001, 0002, 0003 sırayla)
- Diff oluşturma (schema değiştirince auto migration)
- Apply tracking (uygulandı mı bilgisi DB'de tutulur)

## ŞUAN İÇİN (Pratik Yaklaşım — Açılış Sonrası)

Yarınki açılışı bozmamak için **şimdi dokunma**. Bunu hafta içine bırak.

**Bugün yapılacak**: SQL dosyalarına başlangıç yorumu ekle (durum belirt)
**Bu hafta**: applied/archive klasör ayrımını yap
**Önümüzdeki ay**: Drizzle migrate'e geçiş (1-2 günlük iş)

## RİSK DEĞERLENDİRME

Bu temizlik **ZORUNLU değil** ama **kritik bir bug çıkarsa** zaman 
kaybettirir. Aciliyet: 🟡 Orta.

İdeal sıra:
1. ✅ Yarın açılış (bunlara takılmayacaksın)
2. ⏰ Açılış sonrası 1 hafta — gözlem
3. 📦 İkinci hafta — migration disiplini

## NOT

Eğer şu an SQL dosyalarını silersen:
- **Geri alma** zorlaşır (commit history içinde kalır ama her commit'i incele)
- **Production DB'nin gerçek schema'sı** ile drift oluşabilir

Bu yüzden öneri: **arşiv klasörüne taşı**, sil**me**.
