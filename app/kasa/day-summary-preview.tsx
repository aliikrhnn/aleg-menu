'use client';

/**
 * Gün Sonu Önizleme Modalı
 *
 * Kullanıcı "PDF İNDİR" demeden önce, PDF'te ne göreceğini tam ekran modal'da
 * gösterir. "İndir" butonu buradan da tetiklenir.
 *
 * Modal içeriği register-panel'deki detay bölümlerini birebir gösterir,
 * ama sadece okunur, grup stilleri PDF'le uyumlu (gözle "PDF önizlemesi" hissi verir).
 */

import { useEffect } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import type { ZReport } from '@/lib/actions/payments';
import { generateZReportPdf } from '@/lib/utils/z-report-pdf';
import { toast } from '@/components/ui/toast';
import { useState } from 'react';

type Props = {
  open: boolean;
  report: ZReport | null;
  onClose: () => void;
  generatedBy?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  transfer: 'Havale/EFT',
  online: 'Online',
  split: 'Bölünmüş',
  other: 'Diğer',
};

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function DaySummaryPreview({
  open,
  report,
  onClose,
  generatedBy,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  // ESC ile kapama
  useEscapeKey(onClose, open);

  // Scroll kilidi
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !report) return null;

  async function handleDownload() {
    if (!report) return;
    setDownloading(true);
    try {
      await generateZReportPdf(report, { generatedBy: generatedBy || null });
      toast.success('Gün sonu PDF olarak indirildi');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PDF-ERROR]', err);
      toast.error(
        'PDF oluşturulamadı: ' +
          (err instanceof Error ? err.message : 'bilinmeyen hata')
      );
    } finally {
      setDownloading(false);
    }
  }

  const rec = report.reconciliation;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[820px] max-h-[94vh] rounded-[var(--r)] flex flex-col"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 24px 60px -12px rgba(42,31,24,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top accent şerit */}
        <div
          style={{
            height: 4,
            background: 'var(--accent)',
            borderTopLeftRadius: 'var(--r)',
            borderTopRightRadius: 'var(--r)',
          }}
        />

        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              GÜN SONU · PDF ÖNİZLEMESİ
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {report.business.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              {downloading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  İNİYOR
                </>
              ) : (
                <>
                  <span style={{ fontSize: 14 }}>↓</span>
                  İNDİR
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center hover:bg-paper-2 transition-colors"
              style={{ color: 'var(--ink-2)', border: '1px solid var(--line)' }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* İçerik (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Meta */}
          <div
            className="flex items-center justify-between mb-6 flex-wrap gap-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--ink-3)',
            }}
          >
            <span className="uppercase">DÖNEM · {report.range.label}</span>
            {report.business.address && (
              <span>{report.business.address}</span>
            )}
          </div>

          {/* Toplam ciro hero */}
          <div
            className="rounded-[var(--r)] p-5 mb-6"
            style={{
              background: 'color-mix(in srgb, var(--accent) 6%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))',
            }}
          >
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
              }}
            >
              TOPLAM CİRO
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 48,
                fontWeight: 400,
                color: 'var(--accent)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              {money(report.total_revenue)}
            </div>
          </div>

          {/* Metrik grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <PreviewStat label="SİPARİŞ" value={String(report.total_orders_paid)} />
            <PreviewStat label="SEPET ORT." value={money(report.average_basket)} />
            <PreviewStat
              label="İPTAL"
              value={String(report.total_cancelled)}
              color={report.total_cancelled > 0 ? 'var(--warn)' : undefined}
            />
            <PreviewStat
              label="İADE"
              value={String(report.total_refunded)}
              color={report.total_refunded > 0 ? 'var(--danger)' : undefined}
            />
          </div>

          {/* KASA HESABI (Mutabakat) */}
          <PreviewSection title="KASA HESABI">
            <div
              className="rounded-[var(--r)] divide-y"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
              }}
            >
              <LineRow label="Brüt satış" value={money(rec.gross_sales)} />
              {rec.complimentary_total > 0 && (
                <LineRow
                  label="İkramlar"
                  value={`−${money(rec.complimentary_total)}`}
                  muted
                />
              )}
              {rec.discount_total > 0 && (
                <LineRow
                  label="İndirimler"
                  value={`−${money(rec.discount_total)}`}
                  muted
                />
              )}
              {rec.cancelled_total > 0 && (
                <LineRow
                  label="İptaller (bilgi)"
                  value={money(rec.cancelled_total)}
                  muted
                />
              )}
              <LineRow
                label="NET SATIŞ"
                value={money(rec.net_sales)}
                bold
                accent
              />
            </div>

            {/* Ödeme yöntemi kırılımı */}
            <div
              className="rounded-[var(--r)] divide-y mt-3"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
              }}
            >
              {rec.cash_total > 0 && (
                <LineRow label="Nakit tahsilat" value={money(rec.cash_total)} />
              )}
              {rec.card_total > 0 && (
                <LineRow label="Kart tahsilat" value={money(rec.card_total)} />
              )}
              {rec.other_total > 0 && (
                <LineRow label="Diğer" value={money(rec.other_total)} muted />
              )}
              <LineRow
                label="TOPLAM TAHSİLAT"
                value={money(
                  rec.cash_total + rec.card_total + rec.other_total
                )}
                bold
              />
            </div>

            {/* Nakit mutabakat */}
            {rec.opening_amount !== null && (
              <div
                className="rounded-[var(--r)] divide-y mt-3"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                <LineRow label="Kasa açılış" value={money(rec.opening_amount)} />
                <LineRow
                  label="Nakit tahsilat"
                  value={`+${money(rec.cash_total)}`}
                />
                {rec.cash_refunds > 0 && (
                  <LineRow
                    label="Nakit iade"
                    value={`−${money(rec.cash_refunds)}`}
                    muted
                  />
                )}
                <LineRow
                  label="BEKLENEN KASA"
                  value={money(rec.expected_cash || 0)}
                  bold
                />
                {rec.declared_cash !== null && (
                  <>
                    <LineRow
                      label="Sayılan kasa"
                      value={money(rec.declared_cash)}
                    />
                    <VarianceRow
                      label="NAKİT FARKI"
                      value={rec.cash_variance}
                    />
                  </>
                )}
                {rec.declared_card !== null && rec.card_variance !== null && (
                  <>
                    <LineRow
                      label="Beyan edilen kart"
                      value={money(rec.declared_card)}
                    />
                    <VarianceRow
                      label="KART FARKI"
                      value={rec.card_variance}
                    />
                  </>
                )}
              </div>
            )}
          </PreviewSection>

          {/* Ödeme yöntemi */}
          {Object.keys(report.by_method).length > 0 && (
            <PreviewSection title="ÖDEME YÖNTEMİ">
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {Object.entries(report.by_method)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, data], i, arr) => (
                    <div
                      key={method}
                      className="px-4 py-3 flex items-center justify-between"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>
                        {METHOD_LABELS[method] || method}
                        <span
                          className="ml-2 text-xs"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          · {data.count}
                        </span>
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontFamily: 'var(--f-mono)',
                          color: 'var(--ink)',
                        }}
                      >
                        {money(data.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </PreviewSection>
          )}

          {/* İstasyona göre satış */}
          {report.by_station.length > 0 && (
            <PreviewSection
              title="İSTASYONA GÖRE SATIŞ"
              badge={`${report.by_station.length} istasyon`}
            >
              <div
                className="rounded-[var(--r)] p-4 space-y-2.5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {(() => {
                  const total = report.by_station.reduce(
                    (s, st) => s + st.revenue,
                    0
                  );
                  return report.by_station.map((st, i) => {
                    const pct = total > 0 ? (st.revenue / total) * 100 : 0;
                    const opacity =
                      i === 0 ? 1 : i === 1 ? 0.78 : i === 2 ? 0.58 : 0.42;
                    return (
                      <div
                        key={st.station_id || 'none'}
                        className="flex items-center gap-2.5"
                      >
                        <span
                          className="inline-flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: st.station_id
                              ? `color-mix(in srgb, ${st.color} 15%, transparent)`
                              : 'var(--paper-2)',
                            color: st.color,
                            fontSize: 11,
                          }}
                        >
                          {st.icon}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: st.station_id
                              ? 'var(--ink)'
                              : 'var(--ink-3)',
                            fontStyle: st.station_id ? 'normal' : 'italic',
                            minWidth: 90,
                          }}
                        >
                          {st.name}
                        </span>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                            minWidth: 80,
                          }}
                        >
                          {pct.toFixed(1)}% · {st.item_count}
                        </span>
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{
                            background:
                              'color-mix(in srgb, var(--ink) 8%, transparent)',
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: st.color,
                              opacity,
                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-semibold flex-shrink-0"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            color: 'var(--ink)',
                            minWidth: 90,
                            textAlign: 'right',
                          }}
                        >
                          {money(st.revenue)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </PreviewSection>
          )}

          {/* Ekstralar */}
          {(report.total_tip > 0 ||
            report.total_discount > 0 ||
            report.total_complimentary > 0) && (
            <PreviewSection title="EKSTRALAR">
              <div className="grid grid-cols-3 gap-3">
                <ExtraBox
                  label="BAHŞİŞ"
                  value={money(report.total_tip)}
                  empty={report.total_tip === 0}
                />
                <ExtraBox
                  label="İNDİRİM"
                  value={money(report.total_discount)}
                  empty={report.total_discount === 0}
                />
                <ExtraBox
                  label="İKRAM"
                  value={money(report.total_complimentary)}
                  empty={report.total_complimentary === 0}
                />
              </div>
            </PreviewSection>
          )}

          {/* Kasiyere göre */}
          {report.by_cashier.length > 1 && (
            <PreviewSection title="KASİYERE GÖRE">
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {report.by_cashier.map((c, i, arr) => (
                  <div
                    key={(c.cashier_id || 'none') + i}
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>
                      {c.cashier_name}
                      <span
                        className="ml-2 text-xs"
                        style={{
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        · {c.count}
                      </span>
                    </span>
                    <span
                      className="font-semibold"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        color: 'var(--ink)',
                      }}
                    >
                      {money(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </PreviewSection>
          )}

          {/* İptaller */}
          {report.cancelled_orders.length > 0 && (
            <PreviewSection
              title="İPTAL EDİLEN SİPARİŞLER"
              badge={`${report.total_cancelled} adet · ${money(report.total_cancelled_amount)}`}
              badgeColor="var(--warn)"
            >
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {report.cancelled_orders.slice(0, 10).map((c, i, arr) => (
                  <div
                    key={c.order_no + i}
                    className="px-4 py-2.5 flex items-start justify-between gap-3"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div className="flex items-start gap-3 flex-wrap flex-1 min-w-0">
                      <span
                        className="text-xs font-semibold"
                        style={{ fontFamily: 'var(--f-mono)' }}
                      >
                        {c.order_no}
                      </span>
                      <span
                        className="text-xs"
                        style={{
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {c.time}
                      </span>
                      {c.cashier_name && (
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                          {c.cashier_name}
                        </span>
                      )}
                      {c.reason && (
                        <span
                          className="text-xs italic"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-serif)',
                          }}
                        >
                          &ldquo;{c.reason}&rdquo;
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: 'var(--warn)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      {money(c.total)}
                    </span>
                  </div>
                ))}
                {report.cancelled_orders.length > 10 && (
                  <div
                    className="px-4 py-2 text-center text-xs"
                    style={{
                      background: 'var(--paper-2)',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  >
                    + {report.cancelled_orders.length - 10} daha
                  </div>
                )}
              </div>
            </PreviewSection>
          )}

          {/* İkram edilen ürünler */}
          {report.complimentary_items.length > 0 && (
            <PreviewSection
              title="İKRAM EDİLEN ÜRÜNLER"
              badge={`${report.complimentary_items.length} kalem · ${money(report.total_complimentary)} · %${report.rates.complimentary_rate.toFixed(1)}`}
              badgeColor="var(--accent)"
            >
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {report.complimentary_items.slice(0, 15).map((it, i, arr) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex items-center justify-between gap-2"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <span
                        className="inline-block rounded-full flex-shrink-0"
                        style={{ width: 6, height: 6, background: 'var(--accent)' }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ink)' }}
                      >
                        {it.product_name}
                      </span>
                      {it.quantity > 1 && (
                        <span
                          className="text-xs"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          × {it.quantity}
                        </span>
                      )}
                      <span
                        className="text-xs"
                        style={{
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {it.time}
                      </span>
                      {it.cashier_name && (
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                          {it.cashier_name}
                        </span>
                      )}
                      {it.reason && (
                        <span
                          className="text-xs italic"
                          style={{
                            color: 'var(--accent)',
                            fontFamily: 'var(--f-serif)',
                          }}
                        >
                          &ldquo;{it.reason}&rdquo;
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold flex-shrink-0"
                      style={{
                        color: 'var(--accent)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      {money(it.total)}
                    </span>
                  </div>
                ))}
                {report.complimentary_items.length > 15 && (
                  <div
                    className="px-4 py-2 text-center text-xs"
                    style={{
                      background: 'var(--paper-2)',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  >
                    + {report.complimentary_items.length - 15} daha
                  </div>
                )}
              </div>
            </PreviewSection>
          )}

          {/* Silinen / iptal ürünler */}
          {report.cancelled_items.length > 0 && (
            <PreviewSection
              title="SİLİNEN / İPTAL ÜRÜNLER"
              badge={`${report.cancelled_items.length} kalem · ${money(report.cancelled_items.reduce((s, i) => s + i.total, 0))} · %${report.rates.cancellation_rate.toFixed(1)}`}
              badgeColor="var(--warn)"
            >
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {report.cancelled_items.slice(0, 15).map((it, i, arr) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 flex items-center justify-between gap-2"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <span
                        className="inline-block rounded-full flex-shrink-0"
                        style={{ width: 6, height: 6, background: 'var(--warn)' }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ink)' }}
                      >
                        {it.product_name}
                      </span>
                      {it.quantity > 1 && (
                        <span
                          className="text-xs"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          × {it.quantity}
                        </span>
                      )}
                      <span
                        className="text-xs"
                        style={{
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {it.time}
                      </span>
                      {it.cashier_name && (
                        <span className="text-xs" style={{ color: 'var(--ink-2)' }}>
                          {it.cashier_name}
                        </span>
                      )}
                      {it.order_reason && (
                        <span
                          className="text-xs italic"
                          style={{
                            color: 'var(--warn)',
                            fontFamily: 'var(--f-serif)',
                          }}
                        >
                          &ldquo;{it.order_reason}&rdquo;
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold flex-shrink-0"
                      style={{
                        color: 'var(--warn)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      {money(it.total)}
                    </span>
                  </div>
                ))}
                {report.cancelled_items.length > 15 && (
                  <div
                    className="px-4 py-2 text-center text-xs"
                    style={{
                      background: 'var(--paper-2)',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  >
                    + {report.cancelled_items.length - 15} daha
                  </div>
                )}
              </div>
            </PreviewSection>
          )}

          {/* Top 10 */}
          {report.top_products.length > 0 && (
            <PreviewSection title="EN ÇOK SATANLAR · TOP 10">
              <div
                className="rounded-[var(--r)] overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {report.top_products.slice(0, 10).map((p, i, arr) => (
                  <div
                    key={p.name + i}
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] flex-shrink-0"
                        style={{
                          background: i === 0 ? 'var(--accent)' : 'var(--paper-2)',
                          color: i === 0 ? '#FAF5EA' : 'var(--ink-2)',
                          fontFamily: 'var(--f-mono)',
                          fontWeight: 700,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>
                        {p.name}
                      </span>
                      <span
                        className="text-xs"
                        style={{
                          color: 'var(--ink-3)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        × {p.quantity}
                      </span>
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-2)' }}
                    >
                      {money(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </PreviewSection>
          )}

          {/* Footer notu */}
          <div
            className="mt-8 text-center text-xs italic"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-serif)',
            }}
          >
            Bu bir önizlemedir. İndirdiğinde profesyonel PDF olarak alırsın.
          </div>
        </div>

        <style jsx>{`
          @keyframes aleg-modal-in {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ============================================================
// Alt bileşenler
// ============================================================

function PreviewSection({
  title,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
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
        <span>{title}</span>
        {badge && (
          <span style={{ color: badgeColor || 'var(--ink-3)' }}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function PreviewStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-[10px] p-3.5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
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
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 20,
          letterSpacing: '-0.02em',
          color: color || 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function LineRow({
  label,
  value,
  bold,
  accent,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className="px-4 py-2.5 flex items-center justify-between"
      style={{
        borderColor: 'var(--line)',
      }}
    >
      <span
        className={bold ? 'uppercase' : ''}
        style={{
          fontFamily: bold ? 'var(--f-mono)' : 'inherit',
          fontSize: bold ? 10 : 14,
          fontWeight: bold ? 700 : 400,
          letterSpacing: bold ? '0.14em' : undefined,
          color: muted ? 'var(--ink-3)' : bold ? 'var(--ink-3)' : 'var(--ink)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: bold ? 16 : 14,
          fontWeight: bold ? 700 : 500,
          color: muted
            ? 'var(--ink-3)'
            : accent
              ? 'var(--accent)'
              : 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function VarianceRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null) return null;
  const isZero = Math.abs(value) < 0.005;
  const isOver = value > 0;
  const color = isZero
    ? 'var(--ok)'
    : isOver
      ? 'var(--gold)'
      : 'var(--danger)';
  const label2 = isZero ? 'TAM UYUYOR' : isOver ? 'FAZLA' : 'EKSİK';
  return (
    <div
      className="px-4 py-3 flex items-center justify-between"
      style={{
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color,
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color,
          }}
        >
          {label2}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 16,
            fontWeight: 700,
            color,
          }}
        >
          {isOver ? '+' : ''}
          {money(value)}
        </span>
      </div>
    </div>
  );
}

function ExtraBox({
  label,
  value,
  empty,
}: {
  label: string;
  value: string;
  empty?: boolean;
}) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 16,
          fontWeight: 700,
          color: empty ? 'var(--ink-3)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
