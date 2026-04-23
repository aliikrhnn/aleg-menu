import { ContentPage } from '@/components/content-page';

export const metadata = {
  title: 'Çerez Politikası',
  description: 'Aleg çerezleri nasıl kullanıyor? Hangilerini reddedebilirsin?',
};

export default function CerezlerPage() {
  return (
    <ContentPage
      eyebrow="YASAL · ÇEREZLER"
      title="Çerez"
      titleItalic="politikası."
      intro="Aleg ile ilgili çerezlerin ne olduğunu, neden kullandığımızı ve nasıl reddedebileceğini açıklıyoruz."
      lastUpdated="23 Nisan 2026"
    >
      <h2>1. Çerez Nedir?</h2>
      <p>
        Çerezler, tarayıcının sakladığı küçük metin dosyalarıdır. Web siteleri,
        seni hatırlamak ve deneyimini iyileştirmek için kullanır.
      </p>

      <h2>2. Hangi Çerezleri Kullanıyoruz?</h2>

      <h3>Zorunlu çerezler</h3>
      <p>
        Aleg&apos;i kullanabilmen için şart olanlar. Oturum açma, güvenlik,
        sepetini hatırlama gibi temel işlevler.
      </p>
      <ul>
        <li>
          <code>aleg-session</code> — oturum bilgini tutar
        </li>
        <li>
          <code>aleg-cookie-consent</code> — çerez tercihini hatırlar
        </li>
        <li>
          <code>aleg-remember-email</code> — &quot;beni hatırla&quot;
          işaretlediysen e-postan
        </li>
      </ul>
      <p>Bu çerezler reddedilemez — site çalışamaz.</p>

      <h3>Analitik çerezler</h3>
      <p>
        Siteyi nasıl kullandığını anlamamıza yardımcı olur: hangi sayfalar daha
        popüler, nerede takıldın, nereden bıraktın. Anonim.
      </p>
      <ul>
        <li>Sayfa ziyaret sayıları</li>
        <li>Ortalama oturum süresi</li>
        <li>Tıklama ve scroll davranışı</li>
      </ul>

      <h3>Pazarlama çerezleri</h3>
      <p>
        Aleg ile ilgili haberleri ve güncelleme kampanyalarımızı sana
        ulaştırmamıza yardım eder.
      </p>
      <ul>
        <li>E-posta kampanya takibi</li>
        <li>Reklam performans ölçümü (varsa)</li>
      </ul>

      <h2>3. Çerezleri Nasıl Yönetirim?</h2>
      <p>
        Site alt tarafındaki çerez banner&apos;ından tercihlerini seçebilirsin.
        Tarayıcı ayarlarından da tüm çerezleri silebilir veya engelleyebilirsin.
        Dikkat: tüm çerezleri engellersen giriş yapamayabilirsin.
      </p>

      <h2>4. Üçüncü Taraf Çerezleri</h2>
      <p>
        Analitik için şu araçları kullanabiliriz (kullanıcı onayına bağlı):
      </p>
      <ul>
        <li>Plausible / Google Analytics (sayfa ziyaret istatistikleri)</li>
        <li>Sentry (hata izleme)</li>
      </ul>
      <p>
        Pazarlama çerezleri için reklam platformları (varsa) kullanıma
        sunulmadan önce açık onayın alınır.
      </p>

      <h2>5. Çerezlerin Saklanma Süresi</h2>
      <ul>
        <li>Oturum çerezleri: tarayıcı kapanınca silinir</li>
        <li>Kalıcı çerezler: 12 aya kadar</li>
        <li>Tercih çerezi: 12 ay</li>
      </ul>

      <hr />

      <p>
        Soru varsa:{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
      </p>
    </ContentPage>
  );
}
