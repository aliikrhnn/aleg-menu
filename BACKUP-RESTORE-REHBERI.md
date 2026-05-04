# BAQ COFFEE LOUNGE — VERİ YEDEKLEME VE KURTARMA REHBERİ

## OTOMATİK YEDEK (Supabase Pro Plan)

Mevcut planımız **Pro** olduğu için Supabase **günlük otomatik yedek** alıyor.
Yedekler 7 gün geriye saklanır.

### Yedeklerin Yeri
1. https://supabase.com/dashboard/project/sdunwbrvvvgodamekanh
2. Sol menü → **Database** → **Backups**
3. Son yedek tarih ve saati gözükür

### Yedek Sıklığı
- Otomatik: Her gün 02:00 UTC (Türkiye saati 05:00)
- Manuel: Önemli değişikliklerden önce ek yedek alabilirsin

## RESTORE PROSEDÜRÜ (Felaket Durumunda)

### Senaryo 1: Yanlışlıkla Ürün/Kategori Silindi
**Etki**: Düşük (sadece o tablo)
**Çözüm**: SQL ile geri al — tüm DB restore gerekmez

```sql
-- Örnek: Yanlış silinen ürün geri alma
-- 1. Supabase Dashboard → Database → Backups
-- 2. "Restore to point-in-time" → 1 saat öncesi
-- 3. NOT prod DB'ye! Yeni bir test DB'ye restore et
-- 4. SQL ile sadece silinen kayıtları kopyala
INSERT INTO products SELECT * FROM staging_db.products WHERE id IN (...);
```

### Senaryo 2: Tüm Bir Gün Sipariş Verisi Bozuldu
**Etki**: Yüksek (raporlama bozulur)
**Çözüm**: Tabloyu point-in-time restore et

1. Supabase Dashboard → **Database** → **Backups**
2. **"Restore"** → Hedef saat seç (sorun çıkmadan önceki saat)
3. Yeni bir Supabase projesine restore eder (canlıyı bozmaz)
4. Yeni projeden orders/payment_logs tablolarını export et
5. Canlı projeye INSERT et (önce mevcut bozuk veriyi sil)

### Senaryo 3: Veritabanı Komple Çöktü
**Etki**: Çok yüksek (hizmet duruyor)
**Çözüm**: Tam restore + DNS değişikliği gerek

**Acil Durum Adımları:**
1. Önce: Statik bir "geçici kapalıyız" sayfası canlıya al
2. Supabase ekibine ticket: support@supabase.com (Pro plan, 24h SLA)
3. Yeni proje aç → en son backup'tan restore et
4. .env dosyasındaki SUPABASE_URL ve key'i yeni projeyle güncelle
5. Vercel'de redeploy
6. Test et, müşteriye dön

**Tahmini süre:** 2-4 saat (Supabase desteği bekleme dahil)

## MANUEL EK YEDEK ALMA (Önerilen)

Önemli güncellemelerden önce **kendi yedeğini** al:

```bash
# pg_dump ile manuel yedek (Supabase connection string ile)
pg_dump -h db.sdunwbrvvvgodamekanh.supabase.co \
        -U postgres \
        -d postgres \
        --schema=public \
        -F c \
        -f baq-yedek-$(date +%Y%m%d).backup

# Geri yükleme
pg_restore -h ... -d postgres baq-yedek-20260503.backup
```

Şifre: Supabase Dashboard → Project Settings → Database → Connection String

## YEDEK TEST RUTİNİ (Aylık)

Her ay 1 kere:
1. Supabase'den son yedeği indir
2. Local Postgres'e restore et
3. Bir-iki SQL sorgusu çalıştır, veri tutarlı mı bak
4. Tutarlıysa yedek silinebilir

Bu test yapılmazsa **felaket anında yedeğin bozuk çıkma riski var**.

## ACİL DURUM TELEFONLARI

```
Supabase Support (Pro plan):  support@supabase.com
                              dashboard.supabase.com → Help → Contact

Vercel Support:               vercel.com/help

Senin yedek admin'in:         [Buraya bir teknik kişi adı/numarası yaz]
```

## KISA HATIRLATICI

✓ Günlük yedek otomatik (Supabase yapıyor)
✓ Önemli değişiklikten önce manuel ek yedek
✓ Aylık restore testi (yedek bozuk olabilir)
✓ Acil durumda kullanıcıya statik mesaj sayfası göster
✓ Supabase Pro plan SLA 24h, kritik için Enterprise düşün
