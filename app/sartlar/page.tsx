import { ContentPage } from '@/components/content-page';

export const metadata = {
  title: 'Kullanım Şartları',
  description: 'Aleg hizmetini kullanırken geçerli olan şartlar ve koşullar.',
};

export default function SartlarPage() {
  return (
    <ContentPage
      eyebrow="YASAL · ŞARTLAR"
      title="Kullanım"
      titleItalic="şartları."
      intro="Aleg'i kullanmaya başlamadan önce, bu şartları okumanı rica ediyoruz. Anlaşılır tutmaya çalıştık — hukukçu olmadan da okunabilir."
      lastUpdated="23 Nisan 2026"
    >
      <h2>1. Taraflar</h2>
      <p>
        Bu sözleşme; bir tarafta{' '}
        <strong>
          Econexsus Mühendislik Danışmanlık Taahhüt Dijital Teknolojiler Sanayi
          Ticaret Limited Şirketi
        </strong>{' '}
        (&quot;Aleg Studio&quot;, &quot;biz&quot;) ile diğer tarafta Aleg
        hizmetini kullanan işletme (&quot;Kullanıcı&quot;, &quot;sen&quot;)
        arasındadır.
      </p>

      <h2>2. Hizmetin Kapsamı</h2>
      <p>
        Aleg; kafe, restoran ve yiyecek-içecek işletmeleri için QR menü,
        POS/kasa, mutfak ekranı (KDS), sadakat, stok takibi ve raporlama gibi
        modüller sunan bulut tabanlı bir yazılım platformudur (SaaS).
      </p>

      <h2>3. Hesap ve Sorumluluk</h2>
      <ul>
        <li>
          Hesabını ve şifreni korumak senin sorumluluğundadır. Şifreni kimseyle
          paylaşma.
        </li>
        <li>
          Hesabından gerçekleşen tüm işlemlerden sen sorumlusun.
        </li>
        <li>Yetkisiz erişim fark edersen{' '}
          <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
          {' '}adresine derhal bildir.
        </li>
        <li>
          İşletmenin menüsünde yer alan bilgilerin (fiyat, içerik, alerjen vs.)
          doğruluğundan sen sorumlusun.
        </li>
      </ul>

      <h2>4. Ödeme ve Abonelik</h2>
      <p>
        Aleg, ücretli abonelik modeliyle sunulur. Fiyatlar, plan değişiklikleri
        ve fatura döngüsü hesap panelindeki &quot;Abonelik&quot; bölümünde
        görülebilir.
      </p>
      <ul>
        <li>İlk abonelikte belirtilen süre boyunca ücretsiz deneme sunulabilir.</li>
        <li>
          Aboneliğini istediğin zaman iptal edebilirsin; dönem sonuna kadar
          hizmeti kullanmaya devam edersin.
        </li>
        <li>İade politikamız için bize yazabilirsin.</li>
      </ul>

      <h2>5. Kabul Edilmeyen Kullanımlar</h2>
      <p>Aleg&apos;i kullanırken şunları yapmamalısın:</p>
      <ul>
        <li>Sistemin güvenliğini tehlikeye atmak, otomatik bot ile sömürmek</li>
        <li>Yasadışı ürün/hizmet satmak (uyuşturucu, silah vb.)</li>
        <li>Başkalarının telif haklarını ihlal eden içerik yüklemek</li>
        <li>Aleg platformunu taklit etmek, rakip hizmet üretmek için ters mühendislik yapmak</li>
        <li>Başka kullanıcıların verilerine yetkisiz erişim denemek</li>
      </ul>

      <h2>6. Fikri Mülkiyet</h2>
      <p>
        Aleg platformu, logosu, markaları ve yazılım kodu Econexsus Ltd.
        Şti.&apos;nin mülkiyetindedir. Sen de kendi içeriğini (menü, ürün
        fotoğrafları, işletme bilgilerini) sahiplenirsin; biz sadece sana hizmet
        verebilmek için kullanırız.
      </p>

      <h2>7. Hizmet Kesintileri</h2>
      <p>
        %99.9 uptime hedefliyoruz ama internet altyapısı, doğal afet veya üçüncü
        taraf sağlayıcılar nedeniyle kesinti olabilir. Kesintileri minimize
        etmek için elimizden geleni yaparız. Bakım duyuruları önceden{' '}
        <a href="/sistem-durumu">sistem durumu sayfasında</a> yayımlanır.
      </p>

      <h2>8. Sorumluluk Sınırı</h2>
      <p>
        Aleg Studio, hizmetten kaynaklanan dolaylı zararlar (kazanç kaybı,
        itibar zararı vb.) için sorumlu tutulamaz. Doğrudan zararlar için
        sorumluluğumuz, o ayki abonelik ücretiniz ile sınırlıdır.
      </p>

      <h2>9. Sözleşmenin Feshi</h2>
      <p>
        Bu şartları ihlal etmen durumunda hesabını askıya alabilir veya
        kapatabiliriz. Hesabın kapatılırsa verilerinin bir kopyasını 30 gün
        boyunca sağlarız.
      </p>

      <h2>10. Değişiklikler</h2>
      <p>
        Bu şartları zaman zaman güncelleyebiliriz. Önemli bir değişiklik olursa
        size e-postayla bildirim göndeririz ve panelde uyarı gösteririz.
      </p>

      <h2>11. Uygulanacak Hukuk</h2>
      <p>
        Bu sözleşme Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlık
        durumunda Bursa Mahkemeleri ve İcra Daireleri yetkilidir.
      </p>

      <hr />

      <p>
        Sorun varsa önce bize yaz, mahkeme sonra:{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
      </p>
    </ContentPage>
  );
}
