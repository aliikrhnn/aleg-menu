import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export default async function BusinessesPage() {
  const supabase = createClient();

  // Tüm işletmeleri çek (plan bilgisiyle birlikte)
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, slug, name, city, subscription_status, trial_ends_at, created_at, plan_id')
    .order('created_at', { ascending: false });

  // Plan bilgilerini ayrıca çek (basit join yerine)
  const { data: plans } = await supabase
    .from('platform_plans')
    .select('id, name, slug');

  const planMap = new Map(plans?.map((p) => [p.id, p]) || []);

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div
            className="text-super uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            İŞLETMELER · TÜM TENANT&apos;LAR
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
            İşletmeler
          </h1>
          <p className="text-ink-2 text-base mt-3">
            Toplam {businesses?.length || 0} işletme. Yeni eklemek için sağ üstteki butonu kullan.
          </p>
        </div>

        <Link
          href="/isletmeler/yeni"
          className="h-11 px-5 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ fontFamily: 'var(--f-sans)' }}
        >
          <span style={{ fontFamily: 'var(--f-mono)' }}>+</span>
          Yeni İşletme
        </Link>
      </div>

      {/* Filtre çubuğu */}
      <div className="flex items-center gap-2 mb-6">
        <FilterChip label="DURUM" value="Tümü" active />
        <FilterChip label="PLAN" value="Tümü" />
        <FilterChip label="ŞEHİR" value="Tümü" />
      </div>

      {/* Tablo */}
      <div className="bg-card border border-line rounded-[var(--r)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-paper-2">
              <th className="text-left py-3 px-5">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  İŞLETME
                </span>
              </th>
              <th className="text-left py-3 px-5">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  ŞEHİR
                </span>
              </th>
              <th className="text-left py-3 px-5">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  PLAN
                </span>
              </th>
              <th className="text-left py-3 px-5">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  DURUM
                </span>
              </th>
              <th className="text-left py-3 px-5">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  KAYIT
                </span>
              </th>
              <th className="py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {businesses && businesses.length > 0 ? (
              businesses.map((b) => {
                const plan = b.plan_id ? planMap.get(b.plan_id) : null;
                return (
                  <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper-2/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-[var(--r-sm)] bg-super-soft text-super flex items-center justify-center flex-shrink-0"
                          style={{
                            fontFamily: 'var(--f-serif)',
                            fontStyle: 'italic',
                            fontSize: 16,
                            fontWeight: 500,
                          }}
                        >
                          {b.name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/isletmeler/${b.id}`}
                            className="font-medium text-ink hover:text-super transition-colors"
                          >
                            {b.name}
                          </Link>
                          <div className="text-xs text-ink-3 mt-0.5" style={{ fontFamily: 'var(--f-mono)' }}>
                            {b.slug}.alegstudio.com
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-ink-2">{b.city || '—'}</td>
                    <td className="py-4 px-5">
                      <span
                        className="text-sm px-2 py-1 rounded bg-paper-2 text-ink-2"
                        style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
                      >
                        {plan?.name || 'Yok'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={b.subscription_status} />
                    </td>
                    <td className="py-4 px-5 text-sm text-ink-3">{formatDate(b.created_at)}</td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/isletmeler/${b.id}`}
                        className="text-super text-xs uppercase hover:underline"
                        style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}
                      >
                        DETAY →
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-ink-3">
                  <div className="text-3xl mb-3">○</div>
                  <div>Henüz hiç işletme yok.</div>
                  <Link
                    href="/isletmeler/yeni"
                    className="text-super hover:underline text-sm mt-3 inline-block"
                  >
                    İlk işletmeyi oluştur →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Bileşenler
// ============================================================

function FilterChip({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] border text-xs ${
        active ? 'border-super bg-super/10 text-super' : 'border-line bg-card text-ink-2 hover:border-line-2'
      }`}
    >
      <span
        className="text-ink-3 uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    trial: { label: 'DENEME', color: 'var(--super)', bg: 'var(--super-soft)' },
    active: { label: 'AKTİF', color: 'var(--ok)', bg: 'color-mix(in oklab, var(--ok) 15%, transparent)' },
    past_due: { label: 'GECİKMİŞ', color: 'var(--warn)', bg: 'color-mix(in oklab, var(--warn) 15%, transparent)' },
    cancelled: { label: 'İPTAL', color: 'var(--danger)', bg: 'color-mix(in oklab, var(--danger) 15%, transparent)' },
    suspended: { label: 'ASKIDA', color: 'var(--ink-3)', bg: 'var(--paper-2)' },
  };

  const c = config[status] || config.trial;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}
