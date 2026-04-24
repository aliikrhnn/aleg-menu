'use client';

import { useState, useEffect } from 'react';
import { getZReport, type ZReport } from '@/lib/actions/payments';
import { generateZReportPdf } from '@/lib/utils/z-report-pdf';
import { toast } from '@/components/ui/toast';

type Props = {
  open: boolean;
  onClose: () => void;
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  transfer: 'Havale/EFT',
  online: 'Online Ödeme',
  split: 'Bölünmüş',
  other: 'Diğer',
};

const METHOD_COLORS: Record<string, string> = {
  cash: 'var(--ok)',
  card: 'var(--super)',
  transfer: 'var(--accent)',
  online: 'var(--gold)',
  split: 'var(--olive)',
  other: 'var(--ink-3)',
};

export function ZReportModal({
  open,
  onClose,
}: Props) {
  const [report, setReport] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    getZReport(date).then((r) => {
      if (!r.success) {
        setError(r.error || 'Rapor alınamadı');
      } else {
        setReport(r.report || null);
      }
      setLoading(false);
    });
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleDownloadPdf() {
    if (!report) return;
    setDownloading(true);
    try {
      await generateZReportPdf(report);
      toast.success('Z raporu PDF olarak indirildi');
    } catch (err) {
      toast.error(
        'PDF oluşturulamadı: ' +
          (err instanceof Error ? err.message : 'bilinmeyen hata')
      );
    } finally {
      setDownloading(false);
    }
  }

  if (!open) return null;

  const maxHourAmount = report
    ? Math.max(...report.by_hour.map((h) => h.amount), 1)
    : 1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes aleg-modal-in {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Başlık */}
        <div
          className="px-6 py-5 flex items-center justify-between gap-3"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              Z-RAPORU · GÜNLÜK ÖZET
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                color: 'var(--ink)',
              }}
            >
              Günün özeti
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="h-10 px-3 rounded-[8px] text-sm focus:outline-none focus:border-accent transition-colors"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-mono)',
                color: 'var(--ink)',
              }}
            />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors"
              style={{ color: 'var(--ink-2)' }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center" style={{ color: 'var(--ink-3)' }}>
            <div className="text-sm">Yükleniyor...</div>
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center">
            <div style={{ color: 'var(--danger)' }} className="mb-2">⚠</div>
            <div className="text-sm" style={{ color: 'var(--ink-2)' }}>{error}</div>
          </div>
        ) : report ? (
          <div className="px-6 py-5 space-y-6">
            {/* Hero metrikleri - 6 kart */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <HeroStat
                label="TOPLAM CIRO"
                value={fmt(report.total_revenue)}
                accent
              />
              <HeroStat
                label="SİPARİŞ"
                value={String(report.total_orders_paid)}
                sub={report.total_orders !== report.total_orders_paid ? `${report.total_orders} toplam` : undefined}
              />
              <HeroStat
                label="SEPET ORT."
                value={fmt(report.average_basket)}
              />
              <HeroStat
                label="AÇIK SİPARİŞ"
                value={String(report.open_orders)}
                color={report.open_orders > 0 ? 'var(--warn)' : undefined}
              />
              <HeroStat
                label="İPTAL"
                value={String(report.total_cancelled)}
                sub={report.total_cancelled_amount > 0 ? fmt(report.total_cancelled_amount) : undefined}
                color={report.total_cancelled > 0 ? 'var(--warn)' : undefined}
              />
              <HeroStat
                label="İADE"
                value={String(report.total_refunded)}
                color={report.total_refunded > 0 ? 'var(--danger)' : undefined}
              />
            </div>

            {/* Ekstra kazanç/düşüşler */}
            {(report.total_tip > 0 || report.total_discount > 0 || report.total_complimentary > 0) && (
              <div>
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  EKSTRALAR
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ExtraStat
                    label="BAHŞİŞ"
                    value={fmt(report.total_tip)}
                    tone="ok"
                    empty={report.total_tip === 0}
                  />
                  <ExtraStat
                    label="İNDİRİM"
                    value={fmt(report.total_discount)}
                    tone="warn"
                    empty={report.total_discount === 0}
                  />
                  <ExtraStat
                    label="İKRAM"
                    value={fmt(report.total_complimentary)}
                    tone="accent"
                    empty={report.total_complimentary === 0}
                  />
                </div>
              </div>
            )}

            {/* Kasiyere göre */}
            {report.by_cashier.length > 1 && (
              <div>
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  KASİYERE GÖRE
                </div>
                <div
                  className="rounded-[10px] overflow-hidden"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.by_cashier.map((c, i) => {
                    const pct =
                      report.total_revenue > 0
                        ? (c.amount / report.total_revenue) * 100
                        : 0;
                    return (
                      <div
                        key={(c.cashier_id || 'none') + i}
                        className="px-4 py-3"
                        style={{
                          borderBottom:
                            i < report.by_cashier.length - 1
                              ? '1px solid var(--line)'
                              : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: 'var(--accent)',
                                color: '#FAF5EA',
                                fontFamily: 'var(--f-serif)',
                                fontStyle: 'italic',
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              {c.cashier_name[0]?.toUpperCase() || '?'}
                            </span>
                            <span
                              className="text-sm font-semibold truncate"
                              style={{ color: 'var(--ink)' }}
                            >
                              {c.cashier_name}
                            </span>
                            <span
                              className="text-xs flex-shrink-0"
                              style={{ color: 'var(--ink-3)' }}
                            >
                              · {c.count} sipariş
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--ink)',
                            }}
                          >
                            {fmt(c.amount)}
                          </div>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{
                            background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ödeme yöntemi dağılımı */}
            {Object.keys(report.by_method).length > 0 && (
              <div>
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  ÖDEME YÖNTEMİ DAĞILIMI
                </div>
                <div className="space-y-2">
                  {Object.entries(report.by_method)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([method, data]) => {
                      const pct =
                        report.total_revenue > 0
                          ? (data.amount / report.total_revenue) * 100
                          : 0;
                      return (
                        <div
                          key={method}
                          className="rounded-[10px] p-3"
                          style={{
                            background: 'var(--paper-2)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block rounded-full"
                                style={{
                                  width: 8,
                                  height: 8,
                                  background: METHOD_COLORS[method] || 'var(--ink-3)',
                                }}
                              />
                              <span
                                className="text-sm font-semibold"
                                style={{ color: 'var(--ink)' }}
                              >
                                {METHOD_LABELS[method] || method}
                              </span>
                              <span
                                className="text-xs"
                                style={{ color: 'var(--ink-3)' }}
                              >
                                · {data.count} ödeme
                              </span>
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--f-mono)',
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--ink)',
                              }}
                            >
                              {fmt(data.amount)}
                            </div>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{
                              background: 'color-mix(in srgb, var(--ink) 8%, transparent)',
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: METHOD_COLORS[method] || 'var(--ink-3)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Saat bazlı */}
            {report.by_hour.length > 0 && (
              <div>
                <div
                  className="uppercase mb-3 flex items-center justify-between"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  <span>SAAT BAZLI ÖDEME</span>
                  {report.peak_hour !== null && (
                    <span style={{ color: 'var(--accent)' }}>
                      EN YOĞUN: {String(report.peak_hour).padStart(2, '0')}:00
                    </span>
                  )}
                </div>
                <div
                  className="rounded-[10px] p-4"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div className="flex items-end gap-1 h-24">
                    {report.by_hour.map(({ hour, amount, count }) => {
                      const h = Math.max(4, (amount / maxHourAmount) * 96);
                      const isPeak = hour === report.peak_hour;
                      return (
                        <div
                          key={hour}
                          className="flex-1 flex flex-col items-center gap-1 group relative"
                          title={`${hour}:00 · ${count} ödeme · ${fmt(amount)}`}
                        >
                          <div
                            className="w-full rounded-t transition-all group-hover:opacity-80"
                            style={{
                              height: h,
                              background: isPeak ? 'var(--accent)' : 'var(--ink-2)',
                              opacity: isPeak ? 1 : 0.55,
                            }}
                          />
                          <span
                            className="text-[9px]"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              color: isPeak ? 'var(--accent)' : 'var(--ink-3)',
                              letterSpacing: '0.05em',
                              fontWeight: isPeak ? 700 : 400,
                            }}
                          >
                            {String(hour).padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Top ürünler */}
            {report.top_products.length > 0 && (
              <div>
                <div
                  className="uppercase mb-3"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  EN ÇOK SATANLAR
                </div>
                <div
                  className="rounded-[10px] overflow-hidden"
                  style={{
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.top_products.slice(0, 5).map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between px-4 py-3"
                      style={{
                        borderBottom:
                          i < Math.min(4, report.top_products.length - 1)
                            ? '1px solid var(--line)'
                            : 'none',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: 'var(--card)',
                            border: '1px solid var(--line)',
                            fontFamily: 'var(--f-mono)',
                            fontWeight: 700,
                            color: 'var(--ink-2)',
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--ink)' }}
                        >
                          {p.name}
                        </span>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          × {p.quantity}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 13,
                          color: 'var(--ink-2)',
                        }}
                      >
                        {fmt(p.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.total_orders === 0 && (
              <div
                className="rounded-[10px] py-10 text-center"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px dashed var(--line-2)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--ink-2)',
                  }}
                >
                  Bu günde henüz sipariş yok
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div
            className="uppercase text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
              letterSpacing: '0.08em',
            }}
          >
            {date === new Date().toISOString().slice(0, 10)
              ? 'BUGÜN'
              : new Date(date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={!report || downloading || report.total_orders === 0}
              className="h-10 px-4 rounded-[10px] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
              }}
              title="Z raporunu PDF olarak indir"
            >
              {downloading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  HAZIRLANIYOR
                </>
              ) : (
                <>
                  <span style={{ fontSize: 14 }}>↓</span>
                  PDF İNDİR
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-[10px] font-semibold text-sm transition-all hover:opacity-70"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
  color,
  sub,
}: {
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: accent
          ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
          : 'var(--paper-2)',
        border: `1px solid ${accent ? 'color-mix(in srgb, var(--accent) 20%, var(--line))' : 'var(--line)'}`,
      }}
    >
      <div
        className="uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: color || (accent ? 'var(--accent)' : 'var(--ink)'),
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function ExtraStat({
  label,
  value,
  tone,
  empty,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'accent';
  empty?: boolean;
}) {
  const color =
    tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)';
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: empty
          ? 'var(--paper-2)'
          : `color-mix(in srgb, ${color} 7%, var(--card))`,
        border: `1px solid ${
          empty ? 'var(--line)' : `color-mix(in srgb, ${color} 18%, var(--line))`
        }`,
      }}
    >
      <div
        className="uppercase mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 16,
          fontWeight: 600,
          color: empty ? 'var(--ink-3)' : color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
