# Aleg — Kafe İşletim Sistemi

Multi-tenant SaaS kafe ve restoran yönetim platformu.
QR menü · POS · Mutfak ekranı · Sadakat · Delivery — tek platformda.

## Özellikler (Planlanan)

- 🎨 QR tabanlı dijital menü (her kafe için özel subdomain)
- 🧾 POS / Kasa sistemi (adisyon, masa yönetimi)
- 👨‍🍳 Mutfak ve bar istasyon ekranları (KDS)
- 💳 Sadakat programı ve puan sistemi
- 🛵 Paket servis ve kurye yönetimi
- 📊 Detaylı raporlar ve analitik
- 📱 Offline-first PWA (internet kesilse bile çalışır)
- 🌍 Multi-tenant (tek platformda yüzlerce kafe)
- 🌐 Çok dilli (TR/EN)

## Teknoloji

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel
- **Offline:** IndexedDB (Dexie.js) + Service Worker

## Subdomain Yapısı

| URL | İçerik |
|-----|--------|
| `alegstudio.com` | Pazarlama sitesi |
| `admin.alegstudio.com` | Süper admin paneli |
| `panel.alegstudio.com` | İşletme paneli (kafe sahipleri) |
| `[kafe-slug].alegstudio.com` | Müşteri menüsü (QR'dan açılır) |

## Kurulum

Adım adım rehber için [KURULUM.md](./KURULUM.md) dosyasına bak.

Hızlı özet:

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Env dosyasını oluştur
cp .env.example .env.local
# .env.local'e Supabase değerlerini gir

# 3. Geliştirme sunucusunu başlat
npm run dev
```

## Proje Yapısı

```
aleg/
├── app/                      # Next.js App Router sayfaları
│   ├── admin/                # Süper admin (admin.alegstudio.com)
│   ├── panel/                # İşletme paneli (panel.alegstudio.com)
│   ├── menu/[slug]/          # Müşteri menüsü
│   └── page.tsx              # Pazarlama ana sayfası
├── components/
│   └── ui/                   # Ortak UI bileşenleri
├── lib/
│   ├── supabase/             # Supabase istemcileri
│   └── utils/                # Yardımcı fonksiyonlar
├── supabase/
│   ├── migrations/           # SQL şema dosyaları (sırayla çalıştırılır)
│   └── seed.sql              # Test verisi
├── types/
│   └── database.ts           # Supabase tipleri
├── middleware.ts             # Subdomain yönlendirmesi
└── tailwind.config.ts        # Tasarım sistemi
```

## Yol Haritası

Detaylı yol haritası için [ALEG_PROJE_DOKUMANI.md](./ALEG_PROJE_DOKUMANI.md) dosyasına bak.

- [x] Proje iskeleti
- [x] Veritabanı şeması
- [ ] Auth akışı
- [ ] İşletme paneli — menü yönetimi
- [ ] Müşteri menüsü
- [ ] Süper admin paneli
- [ ] POS ve masa yönetimi
- [ ] Offline-first katmanı
- [ ] Sadakat modülü
- [ ] Delivery modülü

## Lisans

Özel — tüm hakları saklıdır.
