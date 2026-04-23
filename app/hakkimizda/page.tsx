import { ContentPage } from '@/components/content-page';

export const metadata = {
  title: 'Hakkımızda',
  description: 'Aleg Studio nasıl doğdu, ne hayal ediyoruz?',
};

export default function HakkimizdaPage() {
  return (
    <ContentPage
      eyebrow="ALEG STUDIO · HİKAYE"
      title="Küçük ekip,"
      titleItalic="büyük hayal."
      intro="Aleg, bir kafe sahibinin 'neden hiçbir sistem işletmemi gerçekten anlamıyor?' sorusuyla başladı. 2026 Isparta'da pilot, 2027 Avrupa'da büyüme."
    >
      <h2>Biz kimiz?</h2>
      <p>
        Econexsus Ltd. Şti. çatısı altında faaliyet gösteren Aleg Studio, kafe
        ve restoran işletmecilerine uçtan uca dijital platform sunmak için
        kurulmuş bir yazılım ekibidir.
      </p>
      <p>
        Ekibin kurucuları hem yazılım geliştirme hem de hizmet sektöründe
        yıllarını vermiş insanlardan oluşuyor. Amaç basit:{' '}
        <strong>
          işletmeci, müşterisine servis etmek dışında hiçbir şey düşünmesin.
        </strong>
      </p>

      <h2>Neye inanıyoruz?</h2>
      <ul>
        <li>
          <strong>Sade, hızlı, güzel.</strong> Yazılım görünmez olmalı. Görev
          bitene kadar değil, görev başlamadan önce hazır olmalı.
        </li>
        <li>
          <strong>Türkiye&apos;deki işletmeye Türkiye&apos;den çözüm.</strong>
          Yurt dışından gelen kurumsal SaaS ürünleri Türk esnafının ritmine
          uymuyor. Biz aynı pazarda yaşayıp aynı ürünü geliştiriyoruz.
        </li>
        <li>
          <strong>Pilot müşteri, ortak müşteridir.</strong> İlk 50 işletme için
          erken ortak programı yürütüyoruz. Ürüne yön veriyorlar, biz
          geliştiriyoruz.
        </li>
        <li>
          <strong>Veri senin.</strong> Asla satmayız, pazarlamaya
          kullanmayız, üçüncü tarafa açmayız. Nokta.
        </li>
      </ul>

      <h2>Yol haritamız</h2>
      <ul>
        <li>
          <strong>2026 Yaz:</strong> Isparta&apos;da ilk pilot kafe. QR menü +
          POS + KDS + sadakat modülleri canlı.
        </li>
        <li>
          <strong>2026 Güz:</strong> Türkiye&apos;de 50 işletme, erken ortak
          programı tamamlanıyor.
        </li>
        <li>
          <strong>2027 Bahar:</strong> Avrupa pazarına açılış (İngiltere ve
          Hollanda ilk hedefler).
        </li>
        <li>
          <strong>2027 Yaz:</strong> Franchise ve çoklu şube yönetimi, gelişmiş
          iş zekası, küresel ödeme sistemleri.
        </li>
      </ul>

      <h2>Bizimle çalışmak ister misin?</h2>
      <p>
        İş ortağı, pilot işletme, geliştirici, tasarımcı — hangisi olursa olsun
        kapımız açık. <a href="/iletisim">İletişim sayfasından</a> bize yaz.
      </p>

      <hr />

      <blockquote>
        Hayatın düzenini bozan ürünler değil, hayatı kolaylaştıran ürünler
        tasarlıyoruz. Aleg&apos;in de bu ailenin bir üyesi olmasını
        istiyoruz.
      </blockquote>
    </ContentPage>
  );
}
