import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Yol Haritası',
  description: 'Aleg ürün yol haritası — yakında yayınlanacak.',
};

export default function YolHaritasiPage() {
  return (
    <ComingSoon
      eyebrow="ÜRÜN · YOL HARİTASI"
      title="Nereye"
      titleItalic="gidiyoruz?"
      description="Önümüzdeki aylarda geliştireceğimiz özellikler, planladığımız entegrasyonlar ve büyüme hedeflerimiz bir şeffaf roadmap olarak yayınlanacak. Sen de oy verip etkilemek istersin değil mi?"
      expectedDate="Yaz 2026"
      notifyLabel="Yayınlanınca haber ver"
    />
  );
}
