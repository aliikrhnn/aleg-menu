import { ContentPage } from '@/components/content-page';

export const metadata = {
  title: 'KVKK Aydınlatma Metni',
  description:
    '6698 sayılı KVKK kapsamında Aleg Studio veri işleme ve koruma politikası.',
};

export default function KvkkPage() {
  return (
    <ContentPage
      eyebrow="YASAL · KVKK"
      title="Aydınlatma"
      titleItalic="metni."
      intro="6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, veri sorumlusu olarak yükümlülüklerimizi yerine getirmek amacıyla hazırlanmıştır."
      lastUpdated="23 Nisan 2026"
    >
      <h2>Veri Sorumlusu</h2>
      <p>
        <strong>
          Econexsus Mühendislik Danışmanlık Taahhüt Dijital Teknolojiler Sanayi
          Ticaret Limited Şirketi
        </strong>
        <br />
        <strong>Adres:</strong> Ahmet Yesevi Mahallesi, Hasat Sokak, Akarsu
        Plaza, Balat/Bursa
        <br />
        <strong>İletişim:</strong>{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
      </p>

      <h2>İşlenen Kişisel Veriler</h2>
      <p>Aşağıdaki veri kategorileri işlenmektedir:</p>
      <ul>
        <li>
          <strong>Kimlik bilgileri:</strong> Ad, soyad, unvan, doğum tarihi
          (isteğe bağlı)
        </li>
        <li>
          <strong>İletişim bilgileri:</strong> E-posta, telefon, işletme adresi
        </li>
        <li>
          <strong>Finansal bilgiler:</strong> Fatura bilgileri, ödeme kayıtları
          (ödeme aracıları tarafından şifreli tutulur, biz saklamaz)
        </li>
        <li>
          <strong>İşlem güvenliği:</strong> IP adresi, log kayıtları, oturum
          bilgileri
        </li>
        <li>
          <strong>Müşteri işlem bilgileri:</strong> Sipariş kayıtları, menü
          etkileşimleri
        </li>
      </ul>

      <h2>Veri İşleme Amaçları</h2>
      <p>Kişisel veriler aşağıdaki amaçlarla işlenmektedir:</p>
      <ul>
        <li>Sözleşmenin kurulması ve ifası</li>
        <li>Hizmetin sunulması ve teknik destek sağlanması</li>
        <li>Faturalandırma ve muhasebe süreçlerinin yürütülmesi</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        <li>Hukuki uyuşmazlıklarda delil olarak kullanılması</li>
        <li>Açık rıza olduğu hallerde pazarlama ve bilgilendirme</li>
      </ul>

      <h2>Veri İşlemenin Hukuki Sebepleri</h2>
      <p>Kişisel verileriniz KVKK m.5 uyarınca:</p>
      <ul>
        <li>Sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla</li>
        <li>Hukuki yükümlülüğün yerine getirilebilmesi için zorunlu olması</li>
        <li>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat</li>
        <li>Açık rıza</li>
      </ul>
      <p>sebepleri ile işlenmektedir.</p>

      <h2>Kişisel Veri Aktarımı</h2>
      <p>
        Verileriniz, hizmetin sunulması için zorunlu olan durumlar dışında
        üçüncü taraflara aktarılmaz. Aktarım yapılan taraflar:
      </p>
      <ul>
        <li>Bulut altyapı sağlayıcıları (Supabase, Vercel — AB sınırlarında)</li>
        <li>Ödeme kuruluşları (fatura süreçleri için, sadece zorunlu bilgi)</li>
        <li>Yasal yükümlülükler gereği yetkili kamu kurumları</li>
      </ul>

      <h2>Kişisel Veri Saklama Süreleri</h2>
      <ul>
        <li>Hesap aktif olduğu sürece + 3 yıl (muhasebe yükümlülüğü)</li>
        <li>Log kayıtları: 2 yıl (5651 sayılı kanun)</li>
        <li>Fatura ve muhasebe kayıtları: 10 yıl (VUK)</li>
        <li>Pazarlama izinli veriler: izin geri alınana kadar</li>
      </ul>

      <h2>İlgili Kişi Hakları (KVKK m.11)</h2>
      <p>Verileri işlenen kişi olarak:</p>
      <ul>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse bilgi talep etme</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
        <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
        <li>Silinmesini veya yok edilmesini isteme</li>
        <li>Aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
        <li>Otomatik sistemlerle aleyhte sonuç oluşması durumunda itiraz etme</li>
        <li>Kanuna aykırı işleme nedeniyle zarara uğramanız halinde tazminat talep etme</li>
      </ul>

      <h2>Başvuru Yöntemi</h2>
      <p>Haklarınızı kullanmak için:</p>
      <ul>
        <li>
          <strong>E-posta ile:</strong>{' '}
          <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>
        </li>
        <li>
          <strong>Posta ile:</strong> Ahmet Yesevi Mah. Hasat Sk. Akarsu Plaza,
          Balat/Bursa
        </li>
      </ul>
      <p>
        Başvurunuza en geç <strong>30 gün</strong> içinde ücretsiz olarak yanıt
        verilecektir.
      </p>

      <hr />

      <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
        Bu metin KVKK, Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak
        Usul ve Esaslar Hakkında Tebliğ ve ilgili mevzuat çerçevesinde
        hazırlanmıştır.
      </p>
    </ContentPage>
  );
}
