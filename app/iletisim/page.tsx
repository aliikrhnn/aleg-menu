import { ContentPage } from '@/components/content-page';
import { ContactForm } from './contact-form';

export const metadata = {
  title: 'İletişim',
  description: 'Aleg Studio ile iletişime geç — destek, satış veya sadece merhaba.',
};

export default function IletisimPage() {
  return (
    <ContentPage
      eyebrow="İLETİŞİM"
      title="Bize"
      titleItalic="yaz."
      intro="Destek, demo talebi veya bir kahve ikramı — hangisi olursa olsun. Mesajları 24 saat içinde yanıtlıyoruz."
    >
      {/* İletişim seçenekleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10 not-prose">
        <ContactCard
          label="GENEL"
          title="info@alegstudio.com"
          href="mailto:info@alegstudio.com"
          description="Her türlü soru ve iş birliği teklifleri"
        />
        <ContactCard
          label="DESTEK"
          title="destek@alegstudio.com"
          href="mailto:destek@alegstudio.com"
          description="Teknik problemler ve yardım talepleri"
        />
        <ContactCard
          label="ADRES"
          title="Balat/Bursa"
          description="Ahmet Yesevi Mh. Hasat Sk. Akarsu Plaza"
        />
      </div>

      <h2>Bize bir mesaj yaz</h2>
      <p>
        Aşağıdaki formu doldurursan doğrudan gelen kutumuza düşer. Genelde aynı
        iş günü içinde geri dönüyoruz.
      </p>

      <ContactForm />

      <hr />

      <h2>SSS</h2>
      <h3>Aleg ücretsiz mi?</h3>
      <p>
        Pilot döneminde ilk 50 işletme için özel erken ortak programı var. Genel
        fiyatlandırma için <a href="/#fiyatlar">fiyatlar sayfasına</a> göz at.
      </p>

      <h3>Kaç günde kurulur?</h3>
      <p>
        Aleg tamamen bulut tabanlı. Kayıt olduğun gün menü ekleyip QR basmaya
        başlayabilirsin. Ortalama kurulum süresi: <strong>48 saat.</strong>
      </p>

      <h3>Demo yapıyor musunuz?</h3>
      <p>
        Evet. <a href="/">Ana sayfadaki</a> &quot;Demo talep et&quot; butonuna
        tıkla ya da doğrudan{' '}
        <a href="mailto:info@alegstudio.com?subject=Demo%20talebi">
          info@alegstudio.com
        </a>{' '}
        adresine yaz.
      </p>
    </ContentPage>
  );
}

function ContactCard({
  label,
  title,
  description,
  href,
}: {
  label: string;
  title: string;
  description: string;
  href?: string;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    href ? (
      <a
        href={href}
        className="block rounded-[var(--r)] p-4 transition-all hover:scale-[1.01]"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          textDecoration: 'none',
        }}
      >
        {children}
      </a>
    ) : (
      <div
        className="rounded-[var(--r)] p-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        {children}
      </div>
    );

  return (
    <Wrapper>
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
        }}
      >
        {label}
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
      <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
        {description}
      </div>
    </Wrapper>
  );
}
