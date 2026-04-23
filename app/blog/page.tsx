import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Blog',
  description: 'Aleg ekibinden kafe dünyasına dair yazılar — yakında.',
};

export default function BlogPage() {
  return (
    <ComingSoon
      eyebrow="ALEG BLOG"
      title="İlk yazı"
      titleItalic="pişiyor."
      description="Kafe sahiplerine ilham, rehber ve içgörü veren yazılar hazırlıyoruz. İlk yayına çıkışta haberdar olmak ister misin?"
      expectedDate="Yaz 2026"
      notifyLabel="İlk yazı çıkınca haber ver"
    />
  );
}
