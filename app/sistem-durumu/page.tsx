import { ContentPage } from '@/components/content-page';
import { StatusDashboard } from './status-dashboard';

export const metadata = {
  title: 'Sistem Durumu',
  description: 'Aleg platformunun canlı sağlık durumu.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SistemDurumuPage() {
  return (
    <ContentPage
      eyebrow="OPERASYON · CANLI"
      title="Sistem"
      titleItalic="durumu."
      intro="Aleg altyapısının anlık sağlık durumu. Bir sorun olursa en önce burada görünür."
    >
      <StatusDashboard />

      <h2>Geçmiş olaylar</h2>
      <p>
        Şimdiye kadar yaşanan planlanmış bakımlar ve kesintiler burada
        listelenecek. Şu an büyük bir kesinti yok.
      </p>

      <div
        className="not-prose rounded-[var(--r)] p-5 my-4 flex items-start gap-3"
        style={{
          background: 'color-mix(in srgb, var(--ok) 6%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--ok) 20%, var(--line))',
        }}
      >
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--ok) 18%, transparent)',
            color: 'var(--ok)',
            fontSize: 14,
          }}
        >
          ✓
        </span>
        <div>
          <div
            className="mb-1"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 17,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Son 30 günde kayıt edilmiş bir kesinti yok
          </div>
          <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Uptime: %99.97
          </div>
        </div>
      </div>

      <h2>Bir sorun mu fark ettin?</h2>
      <p>
        Sayfalar yavaş yükleniyorsa veya bir hata alıyorsan bize yaz:{' '}
        <a href="mailto:destek@alegstudio.com">destek@alegstudio.com</a>. Bir
        işletme panelinde çalışıyorsan, sağ alttaki &quot;yardım&quot;
        butonundan da ulaşabilirsin.
      </p>
    </ContentPage>
  );
}
