# Aleg — Kurulum ve Deploy Rehberi

Bu rehber proje iskeletini sıfırdan çalışır hale getirmek için.
**Adım adım takip et, atlama**. Her adımın sonunda bir kontrol maddesi var — o çalışıyorsa bir sonrakine geç.

---

## 🎯 Genel Bakış — Ne Yapacağız?

1. **Lokalde** projeyi çalıştır (kendi bilgisayarında)
2. **Supabase**'de veritabanını kur
3. **GitHub**'a kodu yükle
4. **Vercel**'e deploy et
5. **Domain**'i (alegstudio.com) bağla

Tahmini süre: 1-2 saat (ilk kez yapıyorsan).

---

## 📋 Gerekli Araçlar

Başlamadan önce bunların bilgisayarında olduğundan emin ol:

- [ ] **Node.js 20+** — https://nodejs.org (LTS versiyonu yeterli)
- [ ] **Git** — https://git-scm.com
- [ ] **Kod editörü** — [VS Code](https://code.visualstudio.com) öneriyorum
- [ ] **GitHub hesabı** (✓ var)
- [ ] **Supabase hesabı** (✓ var)

Kontrol: Terminal/Komut İstemi aç ve şunu yaz:
```bash
node --version   # v20.x.x veya üstü göstermeli
git --version    # herhangi bir versiyon olur
```

---

## 🚀 ADIM 1 — Lokalde Projeyi Çalıştır

### 1.1 Projeyi aç

Bu zip'i bir klasöre çıkar. Örneğin:
- Windows: `C:\Users\KULLANICI\Projects\aleg`
- Mac: `~/Projects/aleg`

VS Code ile bu klasörü aç. `File → Open Folder`.

### 1.2 Bağımlılıkları yükle

VS Code'un terminal'ini aç (`Terminal → New Terminal` veya `Ctrl+`` `) ve:

```bash
npm install
```

Bu 2-5 dakika sürebilir. Sonunda `node_modules` klasörü oluşacak — bu normal.

### 1.3 Env dosyasını oluştur

```bash
# Windows:
copy .env.example .env.local

# Mac/Linux:
cp .env.example .env.local
```

Bu dosyayı **şu an boş bırakabilirsin**, Supabase'i kurduktan sonra dolduracağız.

### 1.4 Geliştirme sunucusunu başlat

```bash
npm run dev
```

Şunu görmen lazım:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

Tarayıcıda `http://localhost:3000` aç.

✅ **Kontrol:** "Kafen, nefes alıyor." yazan pazarlama sayfasını görüyorsan, proje çalışıyor.

### 1.5 Subdomain testi

Terminal'i **durdurma**, yeni bir sekme aç ve test et:

Tarayıcıda:
- `http://localhost:3000` → Pazarlama
- `http://admin.localhost:3000` → Süper admin placeholder
- `http://panel.localhost:3000` → İşletme paneli placeholder
- `http://karakoy.localhost:3000` → Müşteri menüsü placeholder

> **Windows'ta** `*.localhost` çalışmayabilir. Eğer çalışmazsa, `hosts` dosyasına eklemek gerekir. Şimdilik atla, production'da gerçek domain olacak zaten.

✅ **Kontrol:** Üç placeholder sayfa da açılıyorsa iskelet düzgün kurulmuş demektir.

---

## 🗄️ ADIM 2 — Supabase Kurulumu

### 2.1 Yeni proje oluştur

1. https://supabase.com/dashboard adresine git
2. "New project" tıkla
3. Bilgileri doldur:
   - **Name:** `aleg-production` (veya `aleg`)
   - **Database password:** GÜÇLÜ bir şifre — **mutlaka kaydet**, kaybedersen geri alamazsın
   - **Region:** `Frankfurt (EU Central)` — Türkiye'ye en yakın
   - **Plan:** Free (başlangıç için yeterli)
4. "Create new project" tıkla ve 2 dakika bekle

### 2.2 API anahtarlarını al

Proje hazır olduğunda:

1. Sol menüden **Settings** (çark ikonu) → **API**
2. Şu üç değeri kopyala:

| Label | Değişken adı |
|-------|--------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** | `SUPABASE_SERVICE_ROLE_KEY` — **GİZLİ**, kimseyle paylaşma |

### 2.3 .env.local dosyasını doldur

VS Code'da `.env.local` dosyasını aç ve doldur:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...uzun...key
SUPABASE_SERVICE_ROLE_KEY=eyJ...uzun...key

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=alegstudio.com
```

**Terminal'de** `Ctrl+C` ile sunucuyu durdur ve yeniden başlat:
```bash
npm run dev
```

### 2.4 Veritabanı şemasını kur

Supabase Dashboard'a dön.

1. Sol menüden **SQL Editor** ikonuna tıkla
2. "New query" → `0001_core.sql` dosyasının **tüm içeriğini** kopyala (proje klasörünün içinde `supabase/migrations/0001_core.sql`)
3. Supabase SQL editöre yapıştır
4. Sağ altta **Run** butonuna tıkla
5. "Success. No rows returned" görmelisin

Aynı işlemi sırayla diğer migration'lar için de yap:
- [ ] `0001_core.sql` → Run
- [ ] `0002_menu.sql` → Run
- [ ] `0003_operations.sql` → Run
- [ ] `0004_modules.sql` → Run
- [ ] `seed.sql` → Run (test verisi — opsiyonel ama öneriyorum)

> **Önemli:** Sırayı bozma! Her migration öncekine dayanır.

✅ **Kontrol:** Sol menüden **Table Editor**'a git. 30 küsur tablo listelenmeli (`businesses`, `products`, `tables` vs.).

### 2.5 Kendini süper admin yap

1. Supabase Dashboard → sol menüden **Authentication** → **Users**
2. Üst sağda "Add user" → "Create new user"
3. Kendi e-posta adresini ve güçlü bir şifre gir
4. User ID'sini kopyala (uzun UUID)
5. **SQL Editor**'a dön, yeni query aç, şunu yaz (UUID'yi kendininkiyle değiştir):

```sql
INSERT INTO super_admins (user_id, full_name)
VALUES ('BURAYA-KOPYALADIGIN-USER-ID', 'Senin Adın');
```

Run et.

✅ **Kontrol:** `SELECT * FROM super_admins;` çalıştır, senin kaydın görünmeli.

---

## 📦 ADIM 3 — GitHub'a Yükle

### 3.1 Git'i hazırla

Terminal'de proje klasöründe:

```bash
git init
git add .
git commit -m "Initial commit: Aleg project skeleton"
```

### 3.2 GitHub'da yeni repo

1. https://github.com/new
2. Repository name: `aleg` (veya istediğin)
3. **Private** seç (kod gizli kalsın)
4. "Create repository"

### 3.3 Push et

GitHub sana komutları gösterecek. Şunları çalıştır (repo URL'ni kendi hesabınınkiyle değiştir):

```bash
git remote add origin https://github.com/SENIN-KULLANICI-ADIN/aleg.git
git branch -M main
git push -u origin main
```

GitHub şifre yerine personal access token isteyebilir. Şuradan üretirsin:
`Settings → Developer settings → Personal access tokens → Fine-grained → Generate new token`

✅ **Kontrol:** GitHub'daki repo sayfanda dosyalar görünmeli.

---

## 🌐 ADIM 4 — Vercel'e Deploy

### 4.1 Vercel hesabı

1. https://vercel.com/signup
2. "Continue with GitHub" — GitHub ile giriş yap
3. Ücretsiz (Hobby) plan yeterli

### 4.2 Projeyi import et

1. Vercel Dashboard → "Add New..." → "Project"
2. GitHub repo listenden `aleg`'i seç → "Import"
3. Framework Preset: **Next.js** (otomatik algılanır)
4. "Environment Variables" bölümünde `.env.local` dosyandaki 5 değişkeni tek tek ekle:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → **DEĞİŞTİR**: `https://alegstudio.com`
   - `NEXT_PUBLIC_ROOT_DOMAIN` → `alegstudio.com`
5. "Deploy" tıkla

2-3 dakika bekle. "Congratulations!" ekranı açılacak.

✅ **Kontrol:** Vercel sana `aleg-xxx.vercel.app` gibi geçici bir URL verir. Orada site açılıyor mu?

---

## 🔗 ADIM 5 — Domain Bağla (alegstudio.com)

### 5.1 Vercel'e domain ekle

Vercel Dashboard → Proje → **Settings** → **Domains**

Şu domain'leri tek tek ekle (her birini ekledikten sonra Vercel DNS kaydı göstercek):

1. `alegstudio.com`
2. `www.alegstudio.com`
3. `*.alegstudio.com` ← **WILDCARD, çok önemli!**

### 5.2 DNS kayıtları

Domain'i aldığın yerde (GoDaddy, Namecheap, Natro, İsimTescil vs.) DNS panel'ine git.

Şu kayıtları ekle/düzenle:

| Tür | Ad | Değer |
|-----|-----|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |
| CNAME | * | `cname.vercel-dns.com` |

> Vercel sana kendi gösterdiği değerleri koy — yukarıdakiler değişmiş olabilir. **Her zaman Vercel'in gösterdiğini kullan.**

DNS yayılması 5 dakika - 24 saat sürer. Genelde 10 dakika içinde çalışır.

✅ **Kontrol:**
- `https://alegstudio.com` → pazarlama sitesi
- `https://admin.alegstudio.com` → admin placeholder
- `https://panel.alegstudio.com` → panel placeholder
- `https://karakoy.alegstudio.com` → menu placeholder

Hepsi çalışıyorsa **proje canlıda!** 🎉

---

## 🔄 Sonraki Adımlar

Bu iskelet kuruldu. Şimdi gerçek ekranları inşa etmeye başlayacağız:

1. Sen Claude Design'da giriş ekranı + süper admin panelini tasarla
2. Bana getir, birlikte projeye aktaracağız
3. Ardından işletme paneli ekranlarını (zaten elinde hazır) aktarırız
4. Müşteri menüsü
5. Sıra POS'a gelir

## ❓ Sorun mu yaşadın?

Hangi adımda takıldıysan:
1. Hata mesajının tam metnini not et
2. Terminal çıktısının son 20 satırını kopyala
3. Hangi adımdayım, ne yapmıştım — yaz
4. Claude'a gel, adım adım çözelim

## 🆘 Sık Karşılaşılan Hatalar

### "Module not found"
→ `npm install` eksik. Yeniden çalıştır.

### "Failed to compile" — tsconfig hatası
→ VS Code'da TypeScript versiyonu yanlış olabilir. `Ctrl+Shift+P → TypeScript: Select version → Use workspace version`

### Supabase bağlanmıyor
→ `.env.local` dosyasındaki URL'nin sonunda `/` olmamalı. Örnek:
  - ❌ `https://abc.supabase.co/`
  - ✅ `https://abc.supabase.co`

### Vercel build başarısız
→ Env değişkenlerinin Vercel'de **Production** ortamına eklendiğinden emin ol.
