# PIN KİLİTLENME — KURTARMA PROSEDÜRÜ

Kasiyer/garson PIN'i 5 yanlış girilirse hesap **15 dakika kilitlenir**.
Acil durumda erken açmak gerekirse yöntemi:

## SENARYOLAR

### Senaryo A: Personelin PIN'i Unuttu
**Çözüm**: Yönetici paneli → Personeller → Yeni PIN ata

**Adımlar:**
1. panel.alegstudio.com'a yönetici olarak giriş yap
2. Sidebar → **Personeller**
3. İlgili personel → **Düzenle** → **Yeni PIN**
4. 4 haneli yeni PIN belirle (örn 1234)
5. Personel yeni PIN ile gir
6. Eski kilit otomatik temizlenir

### Senaryo B: Yanlış PIN ile Kilitlendi
**Çözüm**: Yöneticinin manuel kilit silmesi gerekir

**SQL ile (Supabase Dashboard → SQL Editor):**
```sql
-- Kilitleri görüntüle
SELECT 
  cashier_id,
  attempt_count,
  locked_until,
  EXTRACT(EPOCH FROM (locked_until - NOW())) AS kalan_saniye
FROM pin_attempts
WHERE locked_until > NOW();

-- Belirli bir kasiyerin kilidini aç
DELETE FROM pin_attempts 
WHERE cashier_id = '<KASIYER-ID>';

-- Tüm kilitleri aç (acil durum)
DELETE FROM pin_attempts WHERE locked_until > NOW();
```

**Veya yönetici paneliyle (eğer UI'ı varsa):**
1. Sidebar → Personeller
2. İlgili kişide "PIN kilidi açılı" göstergesi
3. "Kilidi Sıfırla" butonu (varsa)

### Senaryo C: Yöneticinin Kendi Şifresi Kilitlendi
**Çözüm**: Şifre sıfırlama emaili

1. panel.alegstudio.com/giris
2. **"Şifremi Unuttum"** linki
3. Email adresini gir
4. Inbox'tan reset linkine tıkla

**Email gelmezse:**
1. Supabase Dashboard → **Authentication** → Users
2. Kullanıcıyı bul
3. ⋯ menü → **Reset password**
4. Yeni geçici şifre Supabase'den otomatik gönderilir

### Senaryo D: Kimse Hiçbir Şekilde Giriş Yapamıyor (NUKLEAR)
**Bu durumda son çare**: SQL ile süper admin atama

```sql
-- 1. Mevcut auth.users'larda email'i bul
SELECT id, email, last_sign_in_at FROM auth.users 
WHERE email LIKE '%baq%';

-- 2. Şifreyi manuel sıfırla
UPDATE auth.users 
SET encrypted_password = crypt('GeciciSifre2026', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'uysalemin490@gmail.com';

-- 3. Kullanıcı 'GeciciSifre2026' ile girer
-- 4. /sifre-degistir sayfasında kalıcı şifre koyar
```

## ÖNCELİK KARAR ŞEMASI

```
PIN problemi mi?
├── EVET — Yanlışlıkla kilitlendi
│   └── SQL ile pin_attempts tablosunu temizle (1 dk)
│
└── HAYIR — Şifre sıfırlama
    │
    ├── Email çalışıyor mu?
    │   ├── EVET → "Şifremi Unuttum" linki
    │   └── HAYIR → Supabase Dashboard'dan manuel reset
    │
    └── Hiçbiri çalışmıyor mu?
        └── SQL ile crypt() fonksiyonu kullan
```

## ÖNLEMLER

### 1. Yedek Yönetici Hesabı
**Her zaman 2 yönetici** olsun. Biri kilitlenirse diğeri açar.

### 2. PIN Yönetim Sözlüğü
- Patron: 4 haneli, kimseyle paylaşılmaz
- Kasiyer 1, 2, 3...: Her vardiyada kontrol edilir
- Garson 1, 2, 3...: Her vardiyada kontrol edilir
- 1234, 0000 gibi tahmin edilebilir PIN'ler **YASAK**

### 3. Kilit Süresi Ayarı
Standart 15 dakika, ama isterseniz değiştirilebilir:
```sql
-- lib/actions/cashiers.ts:checkPinRateLimit fonksiyonunda
-- LOCKOUT_MINUTES sabiti — kod değişikliği lazım
```

### 4. Loglama
Her başarısız PIN denemesi `pin_attempts` tablosuna yazılır.
Şüpheli aktiviteyi görmek için:
```sql
SELECT cashier_id, COUNT(*) as deneme, MAX(created_at) as son
FROM pin_attempts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY cashier_id
ORDER BY deneme DESC;
```

Eğer bir kasiyer aynı gün 20+ kez yanlış girdiyse, içeriden bir
sorun olabilir — vardiya yöneticisine bildir.

## ACİL DURUM TELEFONLARI
Bu dokümanı yazıcıdan çıkar, kasanın yanına as. Personel
panik anında kullanır.
