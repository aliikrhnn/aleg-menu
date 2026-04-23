'use client';

import Link from 'next/link';

type TopProduct = {
  product_id: string;
  product_name: string | Record<string, string>;
  quantity: number;
  revenue: number;
};

// Defansif: string geldiyse onu, JSON obje geldiyse tr → en → ilk değeri kullan
function resolveName(name: string | Record<string, string> | null | undefined): string {
  if (!name) return 'Ürün';
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name.tr || name.en || Object.values(name)[0] || 'Ürün';
  }
  return String(name);
}

export function TopProductsCard({
  topProducts,
}: {
  topProducts: TopProduct[];
}) {
  const maxQty = Math.max(...topProducts.map((p) => p.quantity), 1);
  const hasData = topProducts.length > 0;

  return (
    <Link
      href="/panel/raporlar?preset=today"
      className="group block bg-card border border-line rounded-[var(--r)] p-6 transition-colors hover:border-[var(--line-2)]"
      style={{ minHeight: 260 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div
            className="text-ink-3 uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            BUGÜN · POPÜLER
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {hasData
              ? `En çok satan: ${resolveName(topProducts[0].product_name)}`
              : 'Henüz sipariş yok'}
          </h2>
        </div>
        <span
          className="text-ink-3 group-hover:text-accent transition-colors text-sm"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          Detay ↗
        </span>
      </div>

      {hasData ? (
        <div className="space-y-2.5">
          {topProducts.map((p, idx) => {
            const pct = (p.quantity / maxQty) * 100;
            return (
              <div key={p.product_id} className="group/row">
                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className="text-ink-3"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      width: 16,
                    }}
                  >
                    {idx + 1}.
                  </span>
                  <span className="flex-1 text-[13px] text-ink truncate font-medium">
                    {resolveName(p.product_name)}
                  </span>
                  <span
                    className="text-ink-2"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {p.quantity}x
                  </span>
                  <span
                    className="text-ink-3 text-right"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      width: 56,
                    }}
                  >
                    ₺{Math.round(p.revenue).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden ml-5"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background:
                        idx === 0
                          ? 'var(--accent)'
                          : idx === 1
                            ? 'var(--gold)'
                            : 'var(--line-2)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="flex items-center justify-center flex-col py-10"
          style={{ minHeight: 140 }}
        >
          <div className="text-4xl mb-3 opacity-30">☕</div>
          <p className="text-ink-2 text-sm text-center max-w-xs">
            İlk sipariş geldiğinde popüler ürünler burada belirecek.
          </p>
        </div>
      )}
    </Link>
  );
}
