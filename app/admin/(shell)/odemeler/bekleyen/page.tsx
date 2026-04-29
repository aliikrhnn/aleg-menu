import { getPendingInvoices } from '@/lib/actions/admin-billing';
import { Eyebrow, SerifTitle } from '@/components/admin/primitives';
import { PendingInvoicesClient } from '@/components/admin/pending-invoices-client';

export default async function PendingInvoicesPage() {
  const { overdue, dueSoon, upcoming } = await getPendingInvoices();

  const total = overdue.length + dueSoon.length + upcoming.length;

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto grid gap-5">
      <div>
        <Eyebrow>BİLLİNG · BEKLEYEN ÖDEMELER</Eyebrow>
        <SerifTitle size={42} className="mt-2">
          Bekleyen ödemeler
        </SerifTitle>
        <p className="text-ink-2 text-base mt-3 max-w-[640px]">
          Henüz tahsil edilmemiş faturalar — vade durumuna göre üç gruba ayrıldı.
          Toplu seçim yap, hatırlatma sayacını arttır veya tek tıkla ödendi
          işaretle.
          {total > 0 && (
            <span className="ml-2 text-ink-3" style={{ fontFamily: 'var(--f-mono)' }}>
              · Toplam {total} fatura
            </span>
          )}
        </p>
      </div>

      <PendingInvoicesClient
        overdue={overdue}
        dueSoon={dueSoon}
        upcoming={upcoming}
      />
    </div>
  );
}
