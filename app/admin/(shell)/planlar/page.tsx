import { getPlansWithStats } from '@/lib/actions/admin-billing';
import { Eyebrow, SerifTitle } from '@/components/admin/primitives';
import { PlansClient } from '@/components/admin/plans-client';

export default async function PlansPage() {
  const plans = await getPlansWithStats();

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto grid gap-5">
      <div>
        <Eyebrow>BİLLİNG · PLANLAR</Eyebrow>
        <SerifTitle size={42} className="mt-2">
          Abonelik planları
        </SerifTitle>
        <p className="text-ink-2 text-base mt-3 max-w-[640px]">
          Platformun ücretlendirme planlarını yönet. Sıralamayı oklarla değiştir,
          plan arşivlersen yeni işletmeler seçemez ama mevcut aboneler etkilenmez.
        </p>
      </div>

      <PlansClient initialPlans={plans} />
    </div>
  );
}
