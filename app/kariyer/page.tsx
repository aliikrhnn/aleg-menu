import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Kariyer',
  description: 'Aleg ekibine katıl — yakında pozisyonlar açılacak.',
};

export default function KariyerPage() {
  return (
    <ComingSoon
      eyebrow="ALEG EKİBİ"
      title="Bizimle"
      titleItalic="çalış."
      description="Yazılımcı, tasarımcı, içerik yazarı, satış uzmanı — Aleg büyüdükçe farklı yetenekler arıyor olacağız. Özgeçmişini bize göndermek için bekleme!"
      expectedDate="Açık pozisyonlar yakında"
      contactMail="info@alegstudio.com"
      contactLabel="CV gönder"
    />
  );
}
