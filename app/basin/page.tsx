import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Basın Kiti',
  description: 'Aleg logo, marka ve medya kaynakları - yakında.',
};

export default function BasinPage() {
  return (
    <ComingSoon
      eyebrow="MEDYA · BASIN"
      title="Basın"
      titleItalic="kiti."
      description="Aleg logosu, marka renkleri, kurucu röportajları, basın bültenleri ve yüksek çözünürlüklü medya varlıkları hazırlanıyor. Acil ihtiyacın varsa doğrudan bize yaz."
      contactMail="info@alegstudio.com"
      contactLabel="Medya talebi gönder"
    />
  );
}
