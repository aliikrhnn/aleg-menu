import { ContentPage } from '@/components/content-page';

export const metadata = {
  title: 'Gizlilik Politikası',
  description:
    "Aleg Studio olarak kişisel verilerinizi nasıl topladığımız, sakladığımız ve koruduğumuz hakkında şeffaf bilgi.",
};

export default function GizlilikPage() {
  return (
    <ContentPage
      eyebrow="YASAL · GİZLİLİK"
      title="Gizlilik"
      titleItalic="politikası."
      intro="Aleg Studio olarak kişisel verilerinize saygı duyuyor, onları işletmelerinizi büyütmek dışında hiçbir amaçla kullanmıyoruz. Bu politika, hangi verileri topladığımızı ve neden topladığımızı açıklar."
      lastUpdated="23 Nisan 2026"
    >
      <h2>1. Veri Sorumlusu</h2>
      <p>
        <strong>
          Econexsus Mühendislik Danışmanlık Taahhüt Dijital Teknolojiler Sanayi
          Ticaret Limited Şirketi
        </strong>{' '}
        (&quot;Aleg Studio&quot;, &quot;biz&quot;, &quot;bize&quot;), 6698
        sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri
        sorumlusudur.
      </p>
      <p>
        <strong>Adres:</strong> Ahmet Yesevi Mahallesi, Hasat Sokak, Akarsu
        Plaza, Balat/Bursa
        <br />
        <strong>E-posta:</strong>{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
      </p>

      <h2>2. Topladığımız Veriler</h2>
      <p>
        Aleg hizmetini sunabilmek ve geliştirebilmek için aşağıdaki kategorilerde
        veri topluyoruz:
      </p>
      <h3>2.1 Hesap bilgileri</h3>
      <ul>
        <li>Ad, soyad, unvan</li>
        <li>E-posta adresi</li>
        <li>Telefon numarası (isteğe bağlı)</li>
        <li>İşletme adı, adresi, vergi bilgileri</li>
      </ul>
      <h3>2.2 Kullanım verileri</h3>
      <ul>
        <li>Sipariş kayıtları, menü içeriği, ciro verileri</li>
        <li>Oturum açma tarih/saatleri, IP adresi</li>
        <li>Tarayıcı ve cihaz bilgisi</li>
        <li>Sayfa ziyaret geçmişi (analitik)</li>
      </ul>
      <h3>2.3 Müşterilerinizin verileri</h3>
      <p>
        QR menü üzerinden sipariş veren müşterilerinizin siparişleri ve (varsa)
        değerlendirmeleri, işletmeniz adına tarafımızda saklanır. Bu verilerin
        sorumlusu işletmenizdir; biz yalnızca veri işleyen rolündeyiz.
      </p>

      <h2>3. Verileri Nasıl Kullanıyoruz?</h2>
      <ul>
        <li>Hizmetimizi sunmak ve size fatura kesmek için</li>
        <li>Teknik destek sağlamak için</li>
        <li>Ürünümüzü geliştirmek (anonim analitik)</li>
        <li>Yasal yükümlülüklerimizi yerine getirmek için</li>
        <li>
          İzniniz olduysa, Aleg hakkında bilgilendirici e-postalar göndermek
          için
        </li>
      </ul>
      <p>
        <strong>
          Verilerinizi üçüncü taraflara satmıyoruz. Pazarlama amacıyla
          paylaşmıyoruz. Asla.
        </strong>
      </p>

      <h2>4. Verilerinizi Nerede Saklıyoruz?</h2>
      <p>
        Verileriniz Avrupa Birliği sınırları içindeki Supabase altyapısında,
        şifreli olarak saklanır. İletişim HTTPS üzerinden kuruludur. Yedekler
        günlük alınır ve 30 gün saklanır.
      </p>

      <h2>5. Haklarınız (KVKK m.11)</h2>
      <p>KVKK kapsamında şu haklara sahipsiniz:</p>
      <ul>
        <li>Verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Verilerinizin düzeltilmesini, silinmesini isteme</li>
        <li>Verilerinizin tarafınıza aktarılmasını talep etme</li>
      </ul>
      <p>
        Haklarınızı kullanmak için bize{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>{' '}
        adresinden ulaşabilirsiniz. Taleplerinize en geç 30 gün içinde yanıt
        veririz.
      </p>

      <h2>6. Çerezler</h2>
      <p>
        Çerez kullanımımız hakkında detaylı bilgi için{' '}
        <a href="/cerezler">Çerez Politikamıza</a> göz atın.
      </p>

      <h2>7. Değişiklikler</h2>
      <p>
        Bu politikada değişiklik yaparsak bu sayfayı güncelleriz ve son
        güncelleme tarihini yukarıya yazarız. Önemli bir değişiklik olursa size
        e-postayla bildirim göndeririz.
      </p>

      <hr />

      <p>
        Bir soru veya endişen varsa yazmaktan çekinme:{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
      </p>
    </ContentPage>
  );
}
