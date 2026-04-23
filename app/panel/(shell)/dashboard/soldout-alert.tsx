import Link from 'next/link';
import { getSoldOutSummary } from '@/lib/actions/menu';

export async function SoldOutAlert() {
  const result = await getSoldOutSummary();

  if (!result.success || result.count === 0) return null;

  const products = result.products || [];

  // Uzun süredir tükendi olanlar (6+ saat) — "unutuldu mu?" uyarısı
  const stale = products.filter(
    (p) => p.hours_ago !== null && p.hours_ago >= 6
  );
  const hasStale = stale.length > 0;

  const previewNames = products.slice(0, 3).map((p) => p.name);
  const more = result.count - previewNames.length;

  return (
    <Link
      href="/panel/menu/urunler?filter=soldout"
      className="group block mb-6 rounded-[var(--r)] transition-all hover:border-[var(--line-2)]"
      style={{
        background: hasStale
          ? 'color-mix(in srgb, var(--warn) 8%, var(--card))'
          : 'color-mix(in srgb, var(--accent) 6%, var(--card))',
        border: `1px solid ${
          hasStale
            ? 'color-mix(in srgb, var(--warn) 22%, var(--line))'
            : 'color-mix(in srgb, var(--accent) 18%, var(--line))'
        }`,
      }}
    >
      <div className="p-4 flex items-start gap-3 flex-wrap">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: hasStale
              ? 'color-mix(in srgb, var(--warn) 18%, transparent)'
              : 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: hasStale ? 'var(--warn)' : 'var(--accent)',
            fontSize: 18,
          }}
        >
          {hasStale ? '⚠' : '⊘'}
        </div>

        {/* Metin */}
        <div className="flex-1 min-w-0">
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: hasStale ? 'var(--warn)' : 'var(--accent)',
            }}
          >
            {hasStale
              ? `${stale.length} ÜRÜN ${stale[0].hours_ago}+ SAATTİR KAPALI`
              : `${result.count} ÜRÜN TÜKENDİ`}
          </div>
          <div className="text-ink text-sm">
            {previewNames.join(', ')}
            {more > 0 && (
              <span className="text-ink-3"> ve {more} ürün daha</span>
            )}
          </div>
          {hasStale && (
            <div className="text-ink-2 text-xs mt-1">
              Unuttun mu? Stok geldiyse aç, müşteri menüde görsün.
            </div>
          )}
        </div>

        {/* Aksiyon */}
        <div
          className="flex-shrink-0 self-center text-accent group-hover:underline font-semibold text-sm flex items-center gap-1"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}
        >
          Yönet ↗
        </div>
      </div>
    </Link>
  );
}
