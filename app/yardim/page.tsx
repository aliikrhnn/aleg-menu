import { ContentPage } from '@/components/content-page';
import Link from 'next/link';

export const metadata = {
  title: 'Yardım Merkezi',
  description: 'Aleg ile ilgili sık sorulan sorular, rehberler ve destek.',
};

export default function YardimPage() {
  return (
    <ContentPage
      eyebrow="DESTEK · YARDIM"
      title="Nasıl yardımcı"
      titleItalic="olabiliriz?"
      intro="Aleg ile ilgili aklındaki soruların yanıtı burada. Bulamadığın şey varsa bize yaz — genelde aynı gün dönüyoruz."
    >
      {/* Hızlı aksiyon kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-8 not-prose">
        <HelpCard
          icon="◆"
          title="Hemen bir sorunum var"
          description="Teknik destek, çalışmayan özellik, acil yardım"
          href="mailto:destek@alegstudio.com"
          external
        />
        <HelpCard
          icon="☏"
          title="Aleg'i tanımak istiyorum"
          description="Demo talep et, fiyatları öğren, özellikleri keşfet"
          href="/iletisim"
        />
        <HelpCard
          icon="✎"
          title="Geri bildirim vermek istiyorum"
          description="Öneri, şikayet, iyileştirme fikri"
          href="mailto:info@alegstudio.com"
          external
        />
      </div>

      <h2>Sık Sorulan Sorular</h2>

      <h3>Aleg ne işe yarar?</h3>
      <p>
        Aleg; kafe, restoran ve barların tüm operasyonunu tek platformda
        birleştirir: QR menü, kasa (POS), mutfak ekranı (KDS), stok takibi,
        sadakat programı, paket servis ve raporlar.
      </p>

      <h3>Kayıt olmak ücretli mi?</h3>
      <p>
        Hayır. Kayıt ücretsiz ve 30 günlük deneme süresi veriliyor. Pilot
        döneminde ilk 50 işletme için özel erken ortak programımız var —
        ayrıntılar için <a href="/iletisim">bize yaz</a>.
      </p>

      <h3>Kurulum ne kadar sürer?</h3>
      <p>
        Menüyü ekleyip QR&apos;ı yazdırabileceğin an hizmet başlıyor. Genellikle
        <strong> 48 saat içinde</strong> tam operasyona geçebiliyorsun.
        Kategoriler, ürünler, masalar, yazıcı ayarları — adım adım rehberle
        birlikte.
      </p>

      <h3>Hangi cihazlarda çalışır?</h3>
      <p>
        Aleg <strong>bulut tabanlı</strong> bir web uygulamasıdır — tarayıcı olan
        her cihazda çalışır. Tablet, telefon, bilgisayar fark etmez. Özel uygulama
        indirmene gerek yok.
      </p>

      <h3>Termal yazıcıya bağlanıyor mu?</h3>
      <p>
        Evet. ESC/POS standardını destekleyen tüm termal yazıcılara bağlanıyor:
      </p>
      <ul>
        <li><strong>Bluetooth:</strong> Tablet/telefondan doğrudan bağlantı</li>
        <li><strong>Network:</strong> Kafedeki her cihazdan aynı yazıcıya (Aleg Agent üzerinden)</li>
      </ul>
      <p>
        Tavsiye ettiğimiz modeller: XPrinter N160, Rongta RP326, Epson TM-T20III.
      </p>

      <h3>Verilerim nerede saklanıyor?</h3>
      <p>
        Avrupa Birliği sınırlarındaki Supabase altyapısında, şifreli. Günlük
        yedek alınıyor. Detaylar <a href="/gizlilik">Gizlilik Politikasında</a>.
      </p>

      <h3>Aboneliği iptal edebilir miyim?</h3>
      <p>
        Elbette. Panel &gt; Abonelik bölümünden istediğin zaman iptal
        edebilirsin. Dönem sonuna kadar hizmeti kullanmaya devam edersin,
        otomatik yenilenmez. Verilerinin bir kopyasını da 30 gün boyunca
        sağlıyoruz.
      </p>

      <h3>İnternet kesilirse ne olur?</h3>
      <p>
        Müşteri menüsü <strong>PWA (offline destekli)</strong> çalışır; zaten
        açılmış sayfada gezinmeye devam edilebilir. Panel içinse aktif
        internet gerekli — önemli operasyonlar (sipariş, ödeme) bulut tabanlı
        senkronize edilir.
      </p>

      <h3>QR kodu nasıl yazdırırım?</h3>
      <p>
        Panel &gt; Masalar sayfasından her masa için QR kod oluşturabilir,
        4 farklı tasarımdan seçebilir, PNG veya PDF olarak indirebilirsin.
        Toplu PDF özelliği ile tüm masaların QR&apos;ını tek tıkla
        yazdırabilirsin.
      </p>

      <h3>Kaç şubem varsa hepsi tek panelde mi?</h3>
      <p>
        Evet, çoklu şube yönetimi yol haritasının üst sırasında. Pilot sonrası
        2027&apos;de devreye giriyor. Şu an tek şube + birden fazla istasyon
        (bar, mutfak, pastane) destekleniyor.
      </p>

      <h2>Hâlâ cevap bulamadın mı?</h2>
      <p>
        Bize doğrudan yazabilirsin:
      </p>
      <ul>
        <li>
          <strong>Destek için:</strong>{' '}
          <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
        </li>
        <li>
          <strong>Genel sorular:</strong>{' '}
          <a href="mailto:info@alegstudio.com">info@alegstudio.com</a>
        </li>
        <li>
          <strong>İletişim formu:</strong>{' '}
          <Link href="/iletisim">buradan</Link>
        </li>
      </ul>

      <p>24 saat içinde dönüş yapıyoruz, genellikle çok daha hızlı.</p>
    </ContentPage>
  );
}

function HelpCard({
  icon,
  title,
  description,
  href,
  external,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    external ? (
      <a
        href={href}
        className="block rounded-[var(--r)] p-5 transition-all hover:scale-[1.01]"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          textDecoration: 'none',
        }}
      >
        {children}
      </a>
    ) : (
      <Link
        href={href}
        className="block rounded-[var(--r)] p-5 transition-all hover:scale-[1.01]"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          textDecoration: 'none',
        }}
      >
        {children}
      </Link>
    );

  return (
    <Wrapper>
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-3"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          color: 'var(--accent)',
          fontSize: 15,
        }}
      >
        {icon}
      </div>
      <div
        className="mb-1"
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        {title}
      </div>
      <div
        className="text-xs"
        style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}
      >
        {description}
      </div>
    </Wrapper>
  );
}
