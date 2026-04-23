import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Yenilikler',
  description: 'Aleg sürüm notları ve yeni özellikler — yakında.',
};

export default function YeniliklerPage() {
  return (
    <ComingSoon
      eyebrow="ÜRÜN · YENİLİKLER"
      title="Her hafta bir"
      titleItalic="küçük iyilik."
      description="Ürüne eklediğimiz her yenilik, iyileştirme ve hata düzeltmesi burada listelenecek. Düzenli bülten göndermeyi de planlıyoruz."
      expectedDate="Pilot sonrası"
      notifyLabel="Bültenden haberdar ol"
    />
  );
}
