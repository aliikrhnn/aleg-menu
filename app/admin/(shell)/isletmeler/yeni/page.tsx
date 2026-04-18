import { createClient } from '@/lib/supabase/server';
import { CreateBusinessForm } from './form';

export default async function NewBusinessPage() {
  const supabase = createClient();

  // Aktif planları çek
  const { data: plans } = await supabase
    .from('platform_plans')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  return (
    <div className="px-8 py-10 max-w-[1000px] mx-auto">
      <div className="mb-10">
        <div
          className="text-super uppercase mb-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
          }}
        >
          YENİ İŞLETME
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Yeni bir kafe ekleyelim
        </h1>
        <p className="text-ink-2 text-base mt-3">
          Bilgileri doldur, hesap otomatik oluşur. Geçici şifre ekrana çıkar — sahibine WhatsApp&apos;tan gönderirsin.
        </p>
      </div>

      <CreateBusinessForm plans={plans || []} />
    </div>
  );
}
