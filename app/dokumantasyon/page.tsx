import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Dokümantasyon',
  description: 'Aleg için teknik dokümantasyon ve rehberler — yakında.',
};

export default function DokumantasyonPage() {
  return (
    <ComingSoon
      eyebrow="TEKNİK · DOKÜMANTASYON"
      title="Detaylı"
      titleItalic="rehberler."
      description="Adım adım kurulum, API referansı, entegrasyon örnekleri ve ileri düzey senaryolar hazırlıyoruz. Acil bir sorun varsa yardım merkezine göz at."
      expectedDate="Güz 2026"
      notifyLabel="Hazır olunca haber ver"
    />
  );
}
