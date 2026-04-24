'use client';

/**
 * Kasa Sekmesi — Editorial Tasarım
 *
 * Gazete/editorial bir his: büyük italic başlık, dev ciro, net metrik grid.
 * Tüm detaylar burada (iptal/iade listesi dahil), tek tıkla PDF indirilir.
 *
 * Sayfa akışı:
 *  1. Header: Tarih + tagline
 *  2. Dev ciro göstergesi (36pt italic accent)
 *  3. 6 metrik grid
 *  4. Bağlantı + Kasa durum kartları
 *  5. Kasa oturum detayı (açıksa)
 *  6. Saat bazlı bar chart (editorial, peak highlight)
 *  7. Ödeme yöntemi dağılımı (progress bar + yüzde)
 *  8. Ekstralar: bahşiş/indirim/ikram
 *  9. Kasiyere göre (2+)
 * 10. İptal & İade detay listesi
 * 11. Top 10 en çok satan
 * 12. Büyük CTA: PDF İndir
 */

import { useCallback, useEffect, useState } from 'react';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { useCashierSession } from '@/lib/cashier-session';
import {
  getActiveCashSession,
  getZReport,
  type CashSession,
  type ZReport,
  type DaySummaryRange,
} from '@/lib/actions/payments';
import { CashSessionModal } from '@/app/panel/(shell)/pos/cash-session-modal';
import { KasaPinLock } from './kasa-pin-lock';
import { DaySummaryPreview } from './day-summary-preview';
import { DaySummaryWizard } from './day-summary-wizard';
import { toast } from '@/components/ui/toast';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  transfer: 'Havale/EFT',
  online: 'Online',
  split: 'Bölünmüş',
  other: 'Diğer',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Kasiyer',
  qr: 'QR Menü',
  waiter: 'Garson',
  delivery: 'Paket',
  phone: 'Telefon',
  online: 'Online',
};

const METHOD_COLORS: Record<string, string> = {
  cash: 'var(--ok)',
  card: 'var(--super)',
  transfer: 'var(--accent)',
  online: 'var(--gold)',
  split: 'var(--olive)',
  other: 'var(--ink-3)',
};

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function moneyShort(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min}dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m > 0 ? `${h}sa ${m}dk` : `${h}sa`;
  const d = Math.floor(h / 24);
  return `${d}g`;
}

function todayLong(): string {
  return new Date()
    .toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
      year: 'numeric',
    })
    .toUpperCase();
}

/**
 * Saate göre dinamik selamlama.
 * 05-12 → İyi günler
 * 12-17 → İyi öğlenler
 * 17-22 → İyi akşamlar
 * 22-05 → İyi geceler
 */
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'İyi günler';
  if (h >= 12 && h < 17) return 'İyi öğlenler';
  if (h >= 17 && h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

type Props = {
  businessId: string;
};

export function RegisterPanel({ businessId }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return (
      <KasaPinLock businessId={businessId} onUnlock={() => setUnlocked(true)} />
    );
  }

  // Kasa kapatıldığında RegisterContent'den çağrılır → PIN ekranına dön
  return <RegisterContent onLockRequest={() => setUnlocked(false)} />;
}

function RegisterContent({ onLockRequest }: { onLockRequest: () => void }) {
  const { status, simulating, toggleSimulate } = useOnlineStatus();
  const { cashier } = useCashierSession();
  // Session ilk render için sessionStorage'dan oku (anında göster)
  const [session, setSession] = useState<CashSession | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem('aleg-kasa-session');
      if (cached && cached !== 'null') return JSON.parse(cached) as CashSession;
    } catch {
      // yoksay
    }
    return null;
  });
  const [sessionLoading, setSessionLoading] = useState(() => {
    // Cache varsa loading=false ile başla (anında göster)
    if (typeof window === 'undefined') return true;
    try {
      return !sessionStorage.getItem('aleg-kasa-session');
    } catch {
      return true;
    }
  });
  const [openCashModalOpen, setOpenCashModalOpen] = useState(false);
  const [report, setReport] = useState<ZReport | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem('aleg-kasa-report');
      const cachedTime = sessionStorage.getItem('aleg-kasa-report-time');
      if (cached && cachedTime) {
        const age = Date.now() - Number(cachedTime);
        // 60 saniye geçerli
        if (age < 60000) return JSON.parse(cached) as ZReport;
      }
    } catch {
      // yoksay
    }
    return null;
  });
  const [reportLoading, setReportLoading] = useState(() => {
    // Cache varsa loading=false ile başla
    if (typeof window === 'undefined') return true;
    try {
      const cachedTime = sessionStorage.getItem('aleg-kasa-report-time');
      if (cachedTime && Date.now() - Number(cachedTime) < 60000) return false;
    } catch {
      return true;
    }
    return true;
  });
  const [reportError, setReportError] = useState<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(false);
  // Dashboard için sabit "bugün" aralığı. Wizard kendi range'ini seçer.
  const range: DaySummaryRange = { preset: 'today' };
  // Wizard → Preview sıralaması
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ZReport | null>(null);
  // Gün sonu başarılı alındığında modal sonrası kısa success animasyonu
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [lastGunSonuClosed, setLastGunSonuClosed] = useState(false);
  // Kasa kapatılıyor animasyonu - preview kapanıp celebrate'den önce 1.5sn
  const [kasaClosingAnimation, setKasaClosingAnimation] = useState(false);

  const loadSession = useCallback(async () => {
    const r = await getActiveCashSession();
    if (r.success) {
      setSession(r.session || null);
      // Cache'e yaz - sonraki mount'ta anında göster
      try {
        sessionStorage.setItem(
          'aleg-kasa-session',
          JSON.stringify(r.session || null)
        );
      } catch {
        // yoksay
      }
    }
    setSessionLoading(false);
  }, []);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    const r = await getZReport(range);
    if (!r.success) {
      setReportError(r.error || 'Rapor alınamadı');
    } else {
      setReport(r.report || null);
      // Cache'e yaz
      try {
        if (r.report) {
          sessionStorage.setItem('aleg-kasa-report', JSON.stringify(r.report));
          sessionStorage.setItem('aleg-kasa-report-time', String(Date.now()));
        }
      } catch {
        // yoksay
      }
    }
    setReportLoading(false);
  }, [range]);

  useEffect(() => {
    // Session her zaman yenile (hızlı zaten)
    loadSession();
    // Report: cache 60sn içindeyse yükleme, arka planda güncel veri iste
    let reportFromCache = false;
    try {
      const cachedTime = sessionStorage.getItem('aleg-kasa-report-time');
      if (cachedTime && Date.now() - Number(cachedTime) < 60000) {
        reportFromCache = true;
      }
    } catch {
      // yoksay
    }
    if (!reportFromCache) {
      loadReport();
    } else {
      // Cache'ten gösterdik, 5sn sonra arka planda güncel veri al (stale-while-revalidate)
      const t = setTimeout(() => loadReport(), 5000);
      return () => clearTimeout(t);
    }
  }, [loadSession, loadReport]);

  function handleOpenWizard() {
    setWizardOpen(true);
  }

  async function handleWizardFinish(
    enrichedReport: ZReport,
    closeRegister: boolean
  ) {
    // Önce wizard'ı kapat, preview'ı aç
    setPreviewReport(enrichedReport);
    setWizardOpen(false);
    setPreviewOpen(true);

    // Kasa kapatma işlemi arka planda (bloke etmez)
    if (closeRegister && session?.id) {
      try {
        const rec = enrichedReport.reconciliation;
        const sysCash = Number(rec.expected_cash ?? rec.cash_total ?? 0);
        const sysCard = Number(rec.card_total ?? 0);
        const declaredCash =
          rec.declared_cash != null ? Number(rec.declared_cash) : sysCash;
        const declaredCard =
          rec.declared_card != null ? Number(rec.declared_card) : sysCard;
        const cashVariance =
          rec.cash_variance != null
            ? Number(rec.cash_variance)
            : declaredCash - sysCash;
        const cardVariance =
          rec.card_variance != null
            ? Number(rec.card_variance)
            : declaredCard - sysCard;

        // eslint-disable-next-line no-console
        console.log('[GUN-SONU] finalize başlıyor (API route)', {
          declaredCash,
          declaredCard,
          sysCash,
          sysCard,
        });

        // API route ile çağrı (server action yerine — daha stabil)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('/api/kasa/finalize-gun-sonu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            declared_cash: declaredCash,
            declared_card: declaredCard,
            card_expected: sysCard,
            cash_variance: cashVariance,
            card_variance: cardVariance,
            expected_cash: sysCash,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const result = (await response.json()) as {
          success: boolean;
          sessionId?: string;
          error?: string;
        };

        // eslint-disable-next-line no-console
        console.log('[GUN-SONU] result', result);

        if (!result.success) {
          toast.error(
            'Kasa kapatılamadı: ' + (result.error || 'bilinmeyen hata')
          );
        } else {
          toast.success('✓ Gün sonu alındı, kasa kapandı');
          setSession(null);
          setLastGunSonuClosed(true);
          // Cache'i 'null' olarak yaz - sonraki mount'ta kapalı olarak yüklenir
          // Report cache'i de sil - yeni gün için taze rapor gerekli
          try {
            sessionStorage.setItem('aleg-kasa-session', 'null');
            sessionStorage.removeItem('aleg-kasa-report');
            sessionStorage.removeItem('aleg-kasa-report-time');
          } catch {
            // yoksay
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[GUN-SONU] Exception', err);
        const msg =
          err instanceof Error && err.name === 'AbortError'
            ? 'Zaman aşımı — internet bağlantını kontrol et'
            : err instanceof Error
              ? err.message
              : 'bilinmeyen hata';
        toast.error('Kasa kapatılamadı: ' + msg);
      }
    }
  }

  const isOnline = status === 'online';
  const hasData = report && report.total_orders > 0;
  const maxHourAmount =
    report && report.by_hour.length > 0
      ? Math.max(...report.by_hour.map((h) => h.amount), 1)
      : 1;
  const hasExtras =
    report &&
    (report.total_tip > 0 ||
      report.total_discount > 0 ||
      report.total_complimentary > 0);

  return (
    <div className="flex-1 overflow-y-auto pb-10">
      <div className="max-w-[960px] mx-auto px-1 md:px-4 space-y-8 pt-2">
        {/* ============================================================
            1. HEADER — Editorial
            ============================================================ */}
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: 'var(--accent)',
              }}
            >
              GÜN SONU · {todayLong()}
            </div>
            <h1
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 42,
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
            >
              Günün özeti
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dev menü köşede */}
            <div className="relative">
            <button
              onClick={() => setShowDevMenu((v) => !v)}
              className="h-9 w-9 rounded-[8px] text-sm flex items-center justify-center transition-all hover:bg-paper-2"
              style={{
                color: 'var(--ink-3)',
                border: '1px solid var(--line)',
                background: 'var(--card)',
              }}
              title="Geliştirici"
              aria-label="Geliştirici"
            >
              ⋯
            </button>
            {showDevMenu && (
              <>
                <div
                  className="fixed inset-0 z-[50]"
                  onClick={() => setShowDevMenu(false)}
                />
                <div
                  className="absolute top-11 right-0 z-[51] w-64 rounded-[10px] p-2"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25)',
                  }}
                >
                  <button
                    onClick={() => {
                      toggleSimulate();
                      setShowDevMenu(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded hover:bg-paper-2 text-sm transition-colors"
                  >
                    <span style={{ color: 'var(--ink-2)' }}>
                      Offline simülasyonu
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--f-mono)',
                        color: simulating ? 'var(--warn)' : 'var(--ink-3)',
                        fontWeight: 700,
                      }}
                    >
                      {simulating ? 'AÇIK' : 'KAPALI'}
                    </span>
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </header>

        {reportError && (
          <div
            className="rounded-[var(--r)] p-4 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              color: 'var(--danger)',
            }}
          >
            <strong>Rapor alınamadı:</strong> {reportError}
          </div>
        )}

        {/* ============================================================
            2. DEV CİRO GÖSTERGESİ
            ============================================================ */}
        <div>
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
            BUGÜNKÜ CİRO
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 72,
              fontWeight: 400,
              letterSpacing: '-0.04em',
              color: 'var(--accent)',
              lineHeight: 0.95,
            }}
          >
            {reportLoading
              ? '—'
              : hasData
                ? money(report!.total_revenue)
                : money(0)}
          </div>
        </div>

        {/* ============================================================
            3. DURUM KARTLARI — 2 kart yan yana
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bağlantı */}
          <div
            className="rounded-[var(--r)] p-4 flex items-center gap-3"
            style={{
              background: 'var(--card)',
              border: `1px solid ${
                isOnline
                  ? 'color-mix(in srgb, var(--ok) 25%, var(--line))'
                  : 'color-mix(in srgb, var(--danger) 30%, var(--line))'
              }`,
            }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: isOnline ? 'var(--ok)' : 'var(--danger)',
                boxShadow: `0 0 12px ${isOnline ? 'var(--ok)' : 'var(--danger)'}`,
                animation: isOnline ? 'none' : 'aleg-pulse 1.5s infinite',
              }}
            />
            <div className="flex-1">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                BAĞLANTI
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: isOnline ? 'var(--ink)' : 'var(--danger)',
                }}
              >
                {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                {simulating && (
                  <span
                    className="ml-2 text-xs uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      letterSpacing: '0.08em',
                      color: 'var(--warn)',
                    }}
                  >
                    (SIM)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Kasa durumu */}
          <div
            className="rounded-[var(--r)] p-4 flex items-center justify-between gap-3"
            style={{
              background: 'var(--card)',
              border: `1px solid ${session ? 'color-mix(in srgb, var(--accent) 25%, var(--line))' : 'var(--line)'}`,
            }}
          >
            <div className="min-w-0">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                KASA
              </div>
              <div
                className="truncate"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: session ? 'var(--accent)' : 'var(--ink-3)',
                }}
              >
                {sessionLoading
                  ? '…'
                  : session
                    ? `Açık · ${formatTimeAgo(session.opened_at)}`
                    : 'Kapalı'}
              </div>
            </div>
            {session ? (
              <div
                key="kasa-aktif"
                className="h-9 px-4 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 uppercase"
                style={{
                  background: 'color-mix(in srgb, var(--ok) 10%, transparent)',
                  color: 'var(--ok)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.1em',
                  border: '1px solid color-mix(in srgb, var(--ok) 25%, var(--line))',
                  animation: 'aleg-badge-in 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}
                title="Kasa Gün Sonu alındığında otomatik kapanır"
              >
                <span
                  style={{
                    fontSize: 10,
                    animation: 'aleg-pulse-dot 2s ease-in-out infinite',
                  }}
                >
                  ●
                </span>
                AKTİF
              </div>
            ) : (
              <button
                key="kasa-ac"
                onClick={() => setOpenCashModalOpen(true)}
                disabled={sessionLoading}
                className="h-9 px-4 rounded-[8px] text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                style={{
                  color: '#FAF5EA',
                  background: 'var(--accent)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.06em',
                  animation: 'aleg-badge-in 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                AÇ
              </button>
            )}
          </div>
        </div>

        {/* ============================================================
            4. KASA OTURUM DETAY (açıksa)
            ============================================================ */}
        {session && (
          <div
            className="rounded-[var(--r)] p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
            style={{
              background: 'color-mix(in srgb, var(--accent) 4%, var(--card))',
              border:
                '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
            }}
          >
            <MiniStat label="AÇILIŞ" value={money(session.opening_amount)} />
            <MiniStat
              label={`NAKİT (${session.payment_count})`}
              value={`+${money(session.cash_payments_total)}`}
              color="var(--ok)"
            />
            {session.cash_refunds_total > 0 ? (
              <MiniStat
                label="İADE"
                value={`-${money(session.cash_refunds_total)}`}
                color="var(--danger)"
              />
            ) : (
              <MiniStat label="İADE" value="-" />
            )}
            <MiniStat
              label="BEKLENEN"
              value={money(session.expected_cash)}
              accent
            />
          </div>
        )}

        {!hasData && !reportLoading && !reportError && (
          <div
            className="rounded-[var(--r)] py-16 text-center"
            style={{
              background: 'var(--card)',
              border: '1px dashed var(--line)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                color: 'var(--ink-2)',
              }}
            >
              Bugün henüz sipariş yok
            </div>
            <div
              className="mt-2 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.1em',
              }}
            >
              Sipariş geldikçe burada görürsün
            </div>
          </div>
        )}

        {hasData && report && (
          <>
            {/* ========================================================
                5. 6 METRİK GRID (3x2)
                ======================================================== */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="SİPARİŞ"
                value={String(report.total_orders_paid)}
                hint={
                  report.total_orders !== report.total_orders_paid
                    ? `${report.total_orders} toplam`
                    : undefined
                }
              />
              <StatCard
                label="SEPET ORT."
                value={money(report.average_basket)}
              />
              <StatCard
                label="AÇIK SİPARİŞ"
                value={String(report.open_orders)}
                color={report.open_orders > 0 ? 'var(--warn)' : undefined}
              />
              <StatCard
                label="İPTAL"
                value={String(report.total_cancelled)}
                hint={
                  report.total_cancelled_amount > 0
                    ? moneyShort(report.total_cancelled_amount)
                    : undefined
                }
                color={report.total_cancelled > 0 ? 'var(--warn)' : undefined}
              />
              <StatCard
                label="İADE"
                value={String(report.total_refunded)}
                color={report.total_refunded > 0 ? 'var(--danger)' : undefined}
              />
              <StatCard
                label="EN YOĞUN SAAT"
                value={
                  report.peak_hour !== null
                    ? `${String(report.peak_hour).padStart(2, '0')}:00`
                    : '—'
                }
                color="var(--accent)"
              />
              <StatCard
                label="ORT. HAZIRLAMA"
                value={
                  report.avg_prep_minutes !== null
                    ? `${Math.round(report.avg_prep_minutes)}dk`
                    : '—'
                }
                hint={
                  report.avg_prep_minutes !== null
                    ? 'sipariş → ödeme'
                    : undefined
                }
              />
            </div>

            {/* ========================================================
                6. SAAT GRAFİĞİ (Editorial)
                ======================================================== */}
            {report.by_hour.length > 0 && (
              <section>
                <SectionLabel>
                  <span>SAAT BAZLI ÖDEME</span>
                  {report.peak_hour !== null && (
                    <span style={{ color: 'var(--accent)' }}>
                      EN YOĞUN {String(report.peak_hour).padStart(2, '0')}:00
                    </span>
                  )}
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] p-5"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <HourlyLineChart
                    data={report.by_hour}
                    peakHour={report.peak_hour}
                    maxAmount={maxHourAmount}
                  />
                </div>
              </section>
            )}

            {/* ========================================================
                PAKET C — PİK 3 SAAT
                ======================================================== */}
            {report.peak_hours.length > 0 && (
              <section>
                <SectionLabel>PİK 3 SAAT</SectionLabel>
                <div
                  className="rounded-[var(--r)] p-5"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-3">
                    {report.peak_hours.map((h, idx) => (
                      <div
                        key={h.hour}
                        className="rounded-[10px] p-3"
                        style={{
                          background:
                            idx === 0
                              ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                              : 'var(--paper-2)',
                          border:
                            idx === 0
                              ? '1px solid color-mix(in srgb, var(--accent) 35%, var(--line))'
                              : '1px solid var(--line)',
                        }}
                      >
                        <div
                          className="uppercase mb-1"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            color: idx === 0 ? 'var(--accent)' : 'var(--ink-3)',
                          }}
                        >
                          {idx === 0 ? '1. PİK' : idx === 1 ? '2. PİK' : '3. PİK'}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--f-serif)',
                            fontStyle: 'italic',
                            fontSize: 22,
                            color: idx === 0 ? 'var(--accent)' : 'var(--ink)',
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {String(h.hour).padStart(2, '0')}:00
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          {h.count} ödeme · {moneyShort(h.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================
                PAKET C — SİPARİŞ KAYNAĞI DAĞILIMI
                ======================================================== */}
            {Object.keys(report.by_source).length > 0 && (
              <section>
                <SectionLabel>SİPARİŞ KAYNAĞI</SectionLabel>
                <div
                  className="rounded-[var(--r)] p-4 space-y-3"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {Object.entries(report.by_source)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([src, data]) => {
                      const pct =
                        report.total_revenue > 0
                          ? (data.amount / report.total_revenue) * 100
                          : 0;
                      return (
                        <div
                          key={src}
                          className="flex items-center gap-3 flex-wrap md:flex-nowrap"
                        >
                          <span
                            className="text-sm font-semibold flex-shrink-0"
                            style={{ color: 'var(--ink)', minWidth: 110 }}
                          >
                            {SOURCE_LABELS[src] || src}
                          </span>
                          <div className="flex-1 min-w-[140px] relative">
                            <div
                              className="h-2 rounded-full overflow-hidden"
                              style={{ background: 'var(--paper-3)' }}
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
                          <span
                            className="text-sm flex-shrink-0"
                            style={{ color: 'var(--ink-2)', minWidth: 90 }}
                          >
                            {data.count} · {moneyShort(data.amount)}
                          </span>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{
                              color: 'var(--ink-3)',
                              fontFamily: 'var(--f-mono)',
                              minWidth: 40,
                              textAlign: 'right',
                            }}
                          >
                            %{pct.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* ========================================================
                PAKET C — HAFTALIK TREND (son 7 gün)
                ======================================================== */}
            {report.weekly_trend.length > 0 && (
              <section>
                <SectionLabel>
                  <span>HAFTALIK TREND</span>
                  <span style={{ color: 'var(--ink-3)' }}>SON 7 GÜN</span>
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] p-5"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <WeeklyTrendBars data={report.weekly_trend} />
                </div>
              </section>
            )}

            {/* ========================================================
                7. ÖDEME YÖNTEMİ DAĞILIMI
                ======================================================== */}
            {Object.keys(report.by_method).length > 0 && (
              <section>
                <SectionLabel>ÖDEME YÖNTEMİ DAĞILIMI</SectionLabel>
                <div
                  className="rounded-[var(--r)] p-4 space-y-3"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
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
                          className="flex items-center gap-3 flex-wrap md:flex-nowrap"
                        >
                          <span
                            className="inline-block rounded-full flex-shrink-0"
                            style={{
                              width: 9,
                              height: 9,
                              background:
                                METHOD_COLORS[method] || 'var(--ink-3)',
                            }}
                          />
                          <span
                            className="text-sm font-semibold"
                            style={{ color: 'var(--ink)', minWidth: 110 }}
                          >
                            {METHOD_LABELS[method] || method}
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color: 'var(--ink-3)',
                              fontFamily: 'var(--f-mono)',
                              minWidth: 80,
                            }}
                          >
                            {data.count} · {pct.toFixed(1)}%
                          </span>
                          <div
                            className="flex-1 min-w-[100px] h-2 rounded-full overflow-hidden"
                            style={{
                              background:
                                'color-mix(in srgb, var(--ink) 8%, transparent)',
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background:
                                  METHOD_COLORS[method] || 'var(--ink-3)',
                              }}
                            />
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              color: 'var(--ink)',
                              minWidth: 100,
                              textAlign: 'right',
                            }}
                          >
                            {money(data.amount)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* ========================================================
                7b. İSTASYONA GÖRE SATIŞ
                ======================================================== */}
            {report.by_station.length > 0 && (
              <section>
                <SectionLabel>
                  <span>İSTASYONA GÖRE SATIŞ</span>
                  <span style={{ color: 'var(--ink-3)' }}>
                    {report.by_station.length} İSTASYON
                  </span>
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] p-4 space-y-3"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {(() => {
                    const stationTotal = report.by_station.reduce(
                      (s, st) => s + st.revenue,
                      0
                    );
                    return report.by_station.map((st, i) => {
                      const pct =
                        stationTotal > 0
                          ? (st.revenue / stationTotal) * 100
                          : 0;
                      // Accent tonlarını rank'a göre uygula (orijinal rengi koruyalım ama 100/80/60/40/20 opasite)
                      const opacity =
                        i === 0
                          ? 1
                          : i === 1
                            ? 0.78
                            : i === 2
                              ? 0.58
                              : i === 3
                                ? 0.42
                                : 0.3;
                      return (
                        <div
                          key={st.station_id || 'none'}
                          className="flex items-center gap-3 flex-wrap md:flex-nowrap"
                        >
                          {/* İkon + isim */}
                          <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 150 }}>
                            <span
                              className="inline-flex items-center justify-center flex-shrink-0"
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                background: st.station_id
                                  ? `color-mix(in srgb, ${st.color} 15%, transparent)`
                                  : 'var(--paper-2)',
                                color: st.color,
                                fontSize: 13,
                              }}
                            >
                              {st.icon}
                            </span>
                            <span
                              className="font-semibold text-sm truncate"
                              style={{
                                color: st.station_id
                                  ? 'var(--ink)'
                                  : 'var(--ink-3)',
                                fontStyle: st.station_id ? 'normal' : 'italic',
                              }}
                              title={st.name}
                            >
                              {st.name}
                            </span>
                          </div>

                          {/* Yüzde + kalem sayısı */}
                          <span
                            className="text-xs flex-shrink-0"
                            style={{
                              color: 'var(--ink-3)',
                              fontFamily: 'var(--f-mono)',
                              minWidth: 90,
                            }}
                          >
                            {pct.toFixed(1)}% · {st.item_count} kalem
                          </span>

                          {/* Progress bar */}
                          <div
                            className="flex-1 min-w-[80px] h-2.5 rounded-full overflow-hidden"
                            style={{
                              background:
                                'color-mix(in srgb, var(--ink) 7%, transparent)',
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: st.color,
                                opacity,
                              }}
                            />
                          </div>

                          {/* Ciro sağda */}
                          <span
                            className="text-sm font-semibold flex-shrink-0"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              color: 'var(--ink)',
                              minWidth: 100,
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
              </section>
            )}

            {/* ========================================================
                8. EKSTRALAR (şartlı)
                ======================================================== */}
            {hasExtras && (
              <section>
                <SectionLabel>EKSTRALAR</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ExtraCard
                    label="BAHŞİŞ"
                    value={money(report.total_tip)}
                    color="var(--ok)"
                    empty={report.total_tip === 0}
                  />
                  <ExtraCard
                    label="İNDİRİM"
                    value={money(report.total_discount)}
                    color="var(--warn)"
                    empty={report.total_discount === 0}
                  />
                  <ExtraCard
                    label="İKRAM"
                    value={money(report.total_complimentary)}
                    color="var(--accent)"
                    empty={report.total_complimentary === 0}
                  />
                </div>
              </section>
            )}

            {/* ========================================================
                8b. ORANLAR (İkram + İptal yüzdesi)
                ======================================================== */}
            {(report.rates.complimentary_rate > 0 ||
              report.rates.cancellation_rate > 0) && (
              <section>
                <SectionLabel>ORANLAR</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <RateCard
                    label="İKRAM ORANI"
                    value={`%${report.rates.complimentary_rate.toFixed(1)}`}
                    hint="brüt ciroya göre"
                    color="var(--accent)"
                  />
                  <RateCard
                    label="İPTAL ORANI"
                    value={`%${report.rates.cancellation_rate.toFixed(1)}`}
                    hint="açılan siparişlere göre"
                    color="var(--warn)"
                  />
                </div>
              </section>
            )}

            {/* ========================================================
                9. KASİYERE GÖRE
                ======================================================== */}
            {report.by_cashier.length > 1 && (
              <section>
                <SectionLabel>KASİYERE GÖRE</SectionLabel>
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
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
                        className="px-4 py-3.5"
                        style={{
                          borderBottom:
                            i < report.by_cashier.length - 1
                              ? '1px solid var(--line)'
                              : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2 gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="inline-flex items-center justify-center rounded-full flex-shrink-0"
                              style={{
                                width: 28,
                                height: 28,
                                background: 'var(--accent)',
                                color: '#FAF5EA',
                                fontFamily: 'var(--f-serif)',
                                fontStyle: 'italic',
                                fontSize: 13,
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
                              style={{
                                color: 'var(--ink-3)',
                                fontFamily: 'var(--f-mono)',
                              }}
                            >
                              · {c.count} · {pct.toFixed(1)}%
                            </span>
                          </div>
                          <span
                            className="flex-shrink-0"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontSize: 15,
                              fontWeight: 700,
                              color: 'var(--ink)',
                            }}
                          >
                            {money(c.amount)}
                          </span>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{
                            background:
                              'color-mix(in srgb, var(--ink) 8%, transparent)',
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
              </section>
            )}

            {/* ========================================================
                10. İPTAL EDİLEN SİPARİŞLER
                ======================================================== */}
            {report.cancelled_orders.length > 0 && (
              <section>
                <SectionLabel>
                  <span>İPTAL EDİLEN SİPARİŞLER</span>
                  <span style={{ color: 'var(--warn)' }}>
                    {report.total_cancelled} ADET ·{' '}
                    {money(report.total_cancelled_amount)}
                  </span>
                </SectionLabel>
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
                      className="px-4 py-3 flex items-start justify-between gap-3"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <div className="flex-1 min-w-0 flex items-start gap-3 flex-wrap">
                        <span
                          className="font-semibold text-sm flex-shrink-0"
                          style={{
                            color: 'var(--ink)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {c.order_no}
                        </span>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {c.time}
                        </span>
                        {c.cashier_name && (
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: 'var(--ink-2)' }}
                          >
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
                        className="font-semibold flex-shrink-0"
                        style={{
                          color: 'var(--warn)',
                          fontFamily: 'var(--f-mono)',
                          fontSize: 14,
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
                        borderTop: '1px solid var(--line)',
                      }}
                    >
                      + {report.cancelled_orders.length - 10} daha (PDF&apos;te
                      tamamı)
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================
                11. İADE EDİLEN SİPARİŞLER
                ======================================================== */}
            {report.refunded_orders.length > 0 && (
              <section>
                <SectionLabel>
                  <span>İADE EDİLEN SİPARİŞLER</span>
                  <span style={{ color: 'var(--danger)' }}>
                    {report.total_refunded} ADET
                  </span>
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.refunded_orders.slice(0, 10).map((r, i, arr) => (
                    <div
                      key={r.order_no + i}
                      className="px-4 py-3 flex items-start justify-between gap-3"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <div className="flex items-start gap-3 flex-wrap flex-1 min-w-0">
                        <span
                          className="font-semibold text-sm"
                          style={{
                            color: 'var(--ink)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {r.order_no}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {r.time}
                        </span>
                        {r.cashier_name && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--ink-2)' }}
                          >
                            {r.cashier_name}
                          </span>
                        )}
                      </div>
                      <span
                        className="font-semibold flex-shrink-0"
                        style={{
                          color: 'var(--danger)',
                          fontFamily: 'var(--f-mono)',
                          fontSize: 14,
                        }}
                      >
                        -{money(r.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ========================================================
                11b. KASA HESABI (MUTABAKAT)
                ======================================================== */}
            <section>
              <SectionLabel>
                <span>KASA HESABI · MUTABAKAT</span>
                {report.reconciliation.declared_cash !== null && (
                  <span style={{ color: 'var(--ok)' }}>KAPANDI</span>
                )}
              </SectionLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Gelir hesabı */}
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <ReconRow
                    label="Brüt satış"
                    value={money(report.reconciliation.gross_sales)}
                  />
                  {report.reconciliation.complimentary_total > 0 && (
                    <ReconRow
                      label="İkramlar"
                      value={`−${money(report.reconciliation.complimentary_total)}`}
                      muted
                    />
                  )}
                  {report.reconciliation.discount_total > 0 && (
                    <ReconRow
                      label="İndirimler"
                      value={`−${money(report.reconciliation.discount_total)}`}
                      muted
                    />
                  )}
                  <ReconRow
                    label="NET SATIŞ"
                    value={money(report.reconciliation.net_sales)}
                    bold
                    accent
                  />
                </div>

                {/* Tahsilat dağılımı */}
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.reconciliation.cash_total > 0 && (
                    <ReconRow
                      label="Nakit tahsilat"
                      value={money(report.reconciliation.cash_total)}
                      dotColor="var(--ok)"
                    />
                  )}
                  {report.reconciliation.card_total > 0 && (
                    <ReconRow
                      label="Kart tahsilat"
                      value={money(report.reconciliation.card_total)}
                      dotColor="var(--super)"
                    />
                  )}
                  {report.reconciliation.other_total > 0 && (
                    <ReconRow
                      label="Diğer"
                      value={money(report.reconciliation.other_total)}
                      muted
                    />
                  )}
                  <ReconRow
                    label="TOPLAM TAHSİLAT"
                    value={money(
                      report.reconciliation.cash_total +
                        report.reconciliation.card_total +
                        report.reconciliation.other_total
                    )}
                    bold
                  />
                </div>
              </div>

              {/* Kasa mutabakat (oturum açıksa/kapalıysa) */}
              {report.reconciliation.opening_amount !== null && (
                <div
                  className="rounded-[var(--r)] overflow-hidden mt-3"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <ReconRow
                    label="Kasa açılış"
                    value={money(report.reconciliation.opening_amount)}
                  />
                  <ReconRow
                    label="Nakit tahsilat"
                    value={`+${money(report.reconciliation.cash_total)}`}
                    dotColor="var(--ok)"
                  />
                  {report.reconciliation.cash_refunds > 0 && (
                    <ReconRow
                      label="Nakit iade"
                      value={`−${money(report.reconciliation.cash_refunds)}`}
                      muted
                    />
                  )}
                  <ReconRow
                    label="BEKLENEN KASA"
                    value={money(report.reconciliation.expected_cash || 0)}
                    bold
                  />
                  {report.reconciliation.declared_cash !== null && (
                    <>
                      <ReconRow
                        label="Sayılan kasa"
                        value={money(report.reconciliation.declared_cash)}
                      />
                      <VarianceBanner
                        label="NAKİT FARKI"
                        value={report.reconciliation.cash_variance}
                      />
                    </>
                  )}
                  {report.reconciliation.declared_card !== null && (
                    <>
                      <ReconRow
                        label="Beyan edilen kart"
                        value={money(report.reconciliation.declared_card)}
                      />
                      <VarianceBanner
                        label="KART FARKI"
                        value={report.reconciliation.card_variance}
                      />
                    </>
                  )}
                </div>
              )}

              {report.reconciliation.opening_amount === null && (
                <div
                  className="rounded-[var(--r)] px-4 py-3 mt-3 text-sm italic"
                  style={{
                    background: 'color-mix(in srgb, var(--warn) 7%, var(--card))',
                    border: '1px dashed color-mix(in srgb, var(--warn) 30%, var(--line))',
                    color: 'var(--warn)',
                    fontFamily: 'var(--f-serif)',
                  }}
                >
                  Nakit mutabakatı için kasayı aç. Kapanışta sayılan nakit ve
                  kart tutarını beyan ederek farkı otomatik görürsün.
                </div>
              )}
            </section>

            {/* ========================================================
                11c. İKRAM EDİLEN ÜRÜNLER (ürün bazında tek tek)
                ======================================================== */}
            {report.complimentary_items.length > 0 && (
              <section>
                <SectionLabel>
                  <span>İKRAM EDİLEN ÜRÜNLER</span>
                  <span style={{ color: 'var(--accent)' }}>
                    {report.complimentary_items.length} KALEM ·{' '}
                    {money(report.total_complimentary)} · %
                    {report.rates.complimentary_rate.toFixed(1)}
                  </span>
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.complimentary_items.slice(0, 25).map((it, i, arr) => (
                    <div
                      key={i}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{
                            width: 7,
                            height: 7,
                            background: 'var(--accent)',
                          }}
                        />
                        <span
                          className="font-semibold text-sm truncate"
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
                          className="text-xs flex-shrink-0"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {it.time}
                        </span>
                        {it.cashier_name && (
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: 'var(--ink-2)' }}
                          >
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
                        className="text-sm font-semibold flex-shrink-0"
                        style={{
                          color: 'var(--accent)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {money(it.total)}
                      </span>
                    </div>
                  ))}
                  {report.complimentary_items.length > 25 && (
                    <div
                      className="px-4 py-2 text-center text-xs"
                      style={{
                        background: 'var(--paper-2)',
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      + {report.complimentary_items.length - 25} daha (PDF&apos;te
                      tamamı)
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================
                11d. SİLİNEN / İPTAL EDİLEN ÜRÜNLER (ürün bazında)
                ======================================================== */}
            {report.cancelled_items.length > 0 && (
              <section>
                <SectionLabel>
                  <span>SİLİNEN / İPTAL ÜRÜNLER</span>
                  <span style={{ color: 'var(--warn)' }}>
                    {report.cancelled_items.length} KALEM ·{' '}
                    {money(
                      report.cancelled_items.reduce((s, i) => s + i.total, 0)
                    )}{' '}
                    · %{report.rates.cancellation_rate.toFixed(1)}
                  </span>
                </SectionLabel>
                <div
                  className="rounded-[var(--r)] overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {report.cancelled_items.slice(0, 25).map((it, i, arr) => (
                    <div
                      key={i}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
                        <span
                          className="inline-block rounded-full flex-shrink-0"
                          style={{
                            width: 7,
                            height: 7,
                            background: 'var(--warn)',
                          }}
                        />
                        <span
                          className="font-semibold text-sm truncate"
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
                          className="text-xs flex-shrink-0"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          {it.time}
                        </span>
                        {it.cashier_name && (
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: 'var(--ink-2)' }}
                          >
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
                        className="text-sm font-semibold flex-shrink-0"
                        style={{
                          color: 'var(--warn)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      >
                        {money(it.total)}
                      </span>
                    </div>
                  ))}
                  {report.cancelled_items.length > 25 && (
                    <div
                      className="px-4 py-2 text-center text-xs"
                      style={{
                        background: 'var(--paper-2)',
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--f-mono)',
                      }}
                    >
                      + {report.cancelled_items.length - 25} daha (PDF&apos;te
                      tamamı)
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ========================================================
                12. EN ÇOK SATANLAR TOP 10
                ======================================================== */}
            {report.top_products.length > 0 && (
              <section>
                <SectionLabel>EN ÇOK SATANLAR · TOP 10</SectionLabel>
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
                      className="px-4 py-3 flex items-center justify-between gap-3"
                      style={{
                        borderBottom:
                          i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
                          style={{
                            background:
                              i === 0
                                ? 'var(--accent)'
                                : i === 1
                                  ? 'color-mix(in srgb, var(--accent) 70%, var(--paper))'
                                  : 'var(--paper-2)',
                            color:
                              i <= 1 ? '#FAF5EA' : 'var(--ink-2)',
                            fontFamily: 'var(--f-mono)',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: 'var(--ink)' }}
                        >
                          {p.name}
                        </span>
                        <span
                          className="text-xs flex-shrink-0"
                          style={{
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--f-mono)',
                          }}
                        >
                          × {p.quantity}
                        </span>
                      </div>
                      <span
                        className="font-semibold flex-shrink-0"
                        style={{
                          color: 'var(--ink-2)',
                          fontFamily: 'var(--f-mono)',
                          fontSize: 14,
                        }}
                      >
                        {money(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ========================================================
                13. BÜYÜK PDF CTA
                ======================================================== */}
            <div className="pt-4">
              <button
                onClick={handleOpenWizard}
                className="w-full h-14 rounded-[12px] font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.1em',
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 18 }}>◳</span>
                <span>GÜN SONU OLUŞTUR VE İNDİR</span>
              </button>
              <p
                className="text-center mt-3 text-xs"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                }}
              >
                Önce göz at, sonra PDF olarak indir.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Kasa AÇ modalı (yalnız açma için) */}
      {openCashModalOpen && (
        <CashSessionModal
          mode="open"
          activeSession={session}
          onClose={() => setOpenCashModalOpen(false)}
          onSuccess={async () => {
            setOpenCashModalOpen(false);
            await loadSession();
            await loadReport();
          }}
        />
      )}

      {/* Gün Sonu Wizard */}
      <DaySummaryWizard
        open={wizardOpen}
        activeSession={session}
        onClose={() => setWizardOpen(false)}
        onFinish={handleWizardFinish}
      />

      {/* Gün Sonu PDF Önizleme (wizard'dan sonra) */}
      <DaySummaryPreview
        open={previewOpen}
        report={previewReport}
        generatedBy={cashier?.display_name || session?.opened_by_name || null}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewReport(null);
          // Bugün için gün sonu alındı + kasa kapatıldı
          // → Kasa kapatılıyor animasyonu (1.5sn) → celebrate modal
          if (lastGunSonuClosed) {
            setLastGunSonuClosed(false);
            setKasaClosingAnimation(true);
            setTimeout(() => {
              setKasaClosingAnimation(false);
              setCelebrateOpen(true);
            }, 1500);
          }
          // Dashboard'u yenile (closing animasyon sırasında arka planda)
          loadReport();
          loadSession();
        }}
      />

      {/* ============================================================
          KASA KAPATILIYOR... TAM EKRAN ANİMASYONU (1.5sn)
          ============================================================ */}
      {kasaClosingAnimation && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center"
          style={{
            background: 'rgba(42,31,24,0.85)',
            backdropFilter: 'blur(4px)',
            animation: 'aleg-fade-in 0.3s ease',
          }}
        >
          <div
            className="text-center px-8"
            style={{
              animation:
                'aleg-gun-sonu-celebrate 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Dönen halka */}
            <div
              className="mx-auto mb-6 relative"
              style={{ width: 64, height: 64 }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '3px solid rgba(250,245,234,0.15)',
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '3px solid transparent',
                  borderTopColor: 'var(--accent)',
                  borderRightColor: 'var(--accent)',
                  animation: 'aleg-kasa-spin 0.9s linear infinite',
                }}
              />
            </div>

            <div
              className="uppercase mb-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: 'var(--accent)',
              }}
            >
              SON ADIM
            </div>

            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                color: '#FAF5EA',
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              Kasa kapatılıyor
            </div>

            <div
              className="text-sm"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                color: 'rgba(250,245,234,0.6)',
              }}
            >
              Günün defteri kapanıyor…
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          GÜN SONU BAŞARI CELEBRATE MODAL
          ============================================================ */}
      {celebrateOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          style={{ background: 'rgba(42,31,24,0.65)' }}
          onClick={() => {
            setCelebrateOpen(false);
            onLockRequest();
          }}
        >
          <div
            className="relative rounded-[var(--r)] overflow-hidden text-center"
            style={{
              background: 'var(--paper)',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 24px 60px -12px rgba(42,31,24,0.5)',
              animation: 'aleg-gun-sonu-celebrate 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <div style={{ height: 4, background: 'var(--ok)' }} />

            <div className="px-8 py-10">
              {/* Check işareti büyük */}
              <div
                className="mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
                  border: '2px solid var(--ok)',
                  animation:
                    'aleg-gun-sonu-celebrate 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
                }}
              >
                <span style={{ fontSize: 40, color: 'var(--ok)', lineHeight: 1 }}>
                  ✓
                </span>
              </div>

              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: 'var(--ok)',
                }}
              >
                BAŞARILI
              </div>

              <h2
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 32,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                  marginBottom: 10,
                }}
              >
                Gün sonu alındı
              </h2>

              <p
                className="text-sm"
                style={{
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  marginBottom: 24,
                }}
              >
                Kasa kapatıldı. Yeniden açmak için &quot;AÇ&quot; butonuna
                basabilirsin. {getTimeGreeting()} ✨
              </p>

              <button
                onClick={() => {
                  setCelebrateOpen(false);
                  onLockRequest();
                }}
                className="w-full h-11 rounded-[10px] font-semibold transition-all hover:opacity-90"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                  fontSize: 13,
                }}
              >
                TAMAM
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes aleg-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        @keyframes aleg-pulse-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
        @keyframes aleg-badge-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes aleg-gun-sonu-celebrate {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          40% {
            opacity: 1;
            transform: scale(1.04);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes aleg-kasa-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes aleg-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Yardımcı alt bileşenler
// ============================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
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
          color: color || 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="mt-1 uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ExtraCard({
  label,
  value,
  color,
  empty,
}: {
  label: string;
  value: string;
  color: string;
  empty?: boolean;
}) {
  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: empty
          ? 'var(--card)'
          : `color-mix(in srgb, ${color} 7%, var(--card))`,
        border: `1px solid ${
          empty ? 'var(--line)' : `color-mix(in srgb, ${color} 22%, var(--line))`
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
          fontSize: 20,
          fontWeight: 700,
          color: empty ? 'var(--ink-3)' : color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div>
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
          fontSize: 15,
          fontWeight: 600,
          color: color || (accent ? 'var(--accent)' : 'var(--ink)'),
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReconRow({
  label,
  value,
  bold,
  accent,
  muted,
  dotColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  muted?: boolean;
  dotColor?: string;
}) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-between"
      style={{
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2.5">
        {dotColor && (
          <span
            className="inline-block rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, background: dotColor }}
          />
        )}
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
      </div>
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

function VarianceBanner({
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
  const statusLabel = isZero ? 'TAM UYUYOR' : isOver ? 'FAZLA' : 'EKSİK';
  return (
    <div
      className="px-4 py-4 flex items-center justify-between"
      style={{
        background: `color-mix(in srgb, ${color} 9%, transparent)`,
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 18 }}>
          {isZero ? '✓' : isOver ? '▲' : '▼'}
        </span>
        <div>
          <div
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
          </div>
          <div
            className="uppercase mt-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.1em',
              color,
              opacity: 0.7,
            }}
          >
            {statusLabel}
          </div>
        </div>
      </div>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 18,
          fontWeight: 700,
          color,
        }}
      >
        {isOver ? '+' : ''}
        {new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)}
      </span>
    </div>
  );
}

function RateCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[10px] p-4 flex items-center justify-between"
      style={{
        background: `color-mix(in srgb, ${color} 7%, var(--card))`,
        border: `1px solid color-mix(in srgb, ${color} 22%, var(--line))`,
      }}
    >
      <div>
        <div
          className="uppercase mb-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color,
          }}
        >
          {label}
        </div>
        <div
          className="text-xs"
          style={{
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
          }}
        >
          {hint}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.03em',
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// HourlyLineChart — SVG cubic bezier smooth line + area + dots
// Editorial tarzı, accent renkte, responsive viewBox
// ============================================================

type HourData = { hour: number; amount: number; count: number };

function HourlyLineChart({
  data,
  peakHour,
  maxAmount,
}: {
  data: HourData[];
  peakHour: number | null;
  maxAmount: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) {
    // Tek veri noktası varsa büyük rozet göster
    const h = data[0];
    if (!h) return null;
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="text-center">
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--ink-3)',
              marginBottom: 4,
            }}
          >
            {String(h.hour).padStart(2, '0')}:00
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              color: 'var(--accent)',
            }}
          >
            {money(h.amount)}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--ink-3)', marginTop: 2 }}
          >
            {h.count} ödeme
          </div>
        </div>
      </div>
    );
  }

  // SVG koordinat sistemi
  const W = 700; // viewBox genişlik
  const H = 160; // viewBox yükseklik
  const PADDING_T = 16;
  const PADDING_B = 28; // X ekseni label için
  const PADDING_X = 12;
  const chartW = W - PADDING_X * 2;
  const chartH = H - PADDING_T - PADDING_B;

  // Her saat için x koordinat
  const stepX = chartW / (data.length - 1);
  const points = data.map((d, i) => {
    const x = PADDING_X + i * stepX;
    const normY = maxAmount > 0 ? d.amount / maxAmount : 0;
    const y = PADDING_T + (1 - normY) * chartH;
    return { x, y, ...d };
  });

  // Cubic bezier smooth path
  const smoothPath = (): string => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp2x = p1.x - (p1.x - p0.x) / 2;
      path += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = smoothPath();
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PADDING_T + chartH}` +
    ` L ${points[0].x} ${PADDING_T + chartH} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 160, display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="aleg-hourly-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid çizgileri — 3 yatay hafif çizgi */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={PADDING_X}
            x2={W - PADDING_X}
            y1={PADDING_T + chartH * t}
            y2={PADDING_T + chartH * t}
            stroke="var(--line)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.5"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#aleg-hourly-area)" />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(196,85,58,0.22))' }}
        />

        {/* Dots */}
        {points.map((p, i) => {
          const isPeak = p.hour === peakHour;
          const isHover = hoverIdx === i;
          const r = isPeak || isHover ? 4.5 : 3;
          return (
            <g key={p.hour}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill="var(--paper)"
                stroke="var(--accent)"
                strokeWidth={isPeak ? 2.5 : 1.8}
              />
              {isPeak && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="1.8"
                  fill="var(--accent)"
                />
              )}
              {/* Hover zone — geniş invisible rect */}
              <rect
                x={p.x - stepX / 2}
                y={PADDING_T}
                width={stepX}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          );
        })}

        {/* Hover vertical guide */}
        {hoverIdx !== null && points[hoverIdx] && (
          <line
            x1={points[hoverIdx].x}
            x2={points[hoverIdx].x}
            y1={PADDING_T}
            y2={PADDING_T + chartH}
            stroke="var(--accent)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
        )}

        {/* X-axis labels — her 2-3 saat bir */}
        {points.map((p, i) => {
          // Kalabalık olmaması için: ilk, son, peak ve ~her 3 adımda bir
          const showLabel =
            i === 0 ||
            i === points.length - 1 ||
            p.hour === peakHour ||
            i % 3 === 0;
          if (!showLabel) return null;
          const isPeak = p.hour === peakHour;
          return (
            <text
              key={`lbl-${p.hour}`}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fill: isPeak ? 'var(--accent)' : 'var(--ink-3)',
                fontWeight: isPeak ? 700 : 400,
                letterSpacing: '0.05em',
              }}
            >
              {String(p.hour).padStart(2, '0')}
            </text>
          );
        })}
      </svg>

      {/* Tooltip (hover) */}
      {hoverIdx !== null && points[hoverIdx] && (
        <div
          className="absolute pointer-events-none rounded-[8px] px-3 py-2"
          style={{
            left: `${(points[hoverIdx].x / W) * 100}%`,
            top: `${(points[hoverIdx].y / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 10px))',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 11,
            fontFamily: 'var(--f-mono)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(42,31,24,0.25)',
            zIndex: 5,
          }}
        >
          <div
            style={{
              letterSpacing: '0.06em',
              fontWeight: 700,
              opacity: 0.7,
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            {String(points[hoverIdx].hour).padStart(2, '0')}:00
          </div>
          <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 14 }}>
            {money(points[hoverIdx].amount)}
          </div>
          <div style={{ opacity: 0.7, fontSize: 10 }}>
            {points[hoverIdx].count} ödeme
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WeeklyTrendBars — son 7 gün bar chart
// SVG, accent renk, bugün vurgulu
// ============================================================
function WeeklyTrendBars({
  data,
}: {
  data: Array<{
    date: string;
    day_label: string;
    orders: number;
    revenue: number;
  }>;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const todayStr = new Date().toISOString().slice(0, 10);

  const W = 700;
  const H = 140;
  const PADDING_T = 16;
  const PADDING_B = 28;
  const PADDING_X = 12;
  const chartW = W - PADDING_X * 2;
  const chartH = H - PADDING_T - PADDING_B;
  const barGap = 8;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 140, display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid */}
        {[0.5, 1.0].map((t) => (
          <line
            key={t}
            x1={PADDING_X}
            x2={W - PADDING_X}
            y1={PADDING_T + chartH * (1 - t)}
            y2={PADDING_T + chartH * (1 - t)}
            stroke="var(--line)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.5"
          />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const h = d.revenue > 0 ? (d.revenue / maxRevenue) * chartH : 2;
          const x = PADDING_X + i * (barW + barGap);
          const y = PADDING_T + chartH - h;
          const isToday = d.date === todayStr;
          const isHover = hoverIdx === i;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={isToday ? 'var(--accent)' : 'var(--ink-2)'}
                opacity={isToday ? 1 : isHover ? 0.7 : 0.35}
                style={{ transition: 'opacity 0.15s' }}
              />
              {/* Hover zone */}
              <rect
                x={x - barGap / 2}
                y={PADDING_T}
                width={barW + barGap}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
              />
              {/* Day label */}
              <text
                x={x + barW / 2}
                y={H - 10}
                textAnchor="middle"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  fill: isToday ? 'var(--accent)' : 'var(--ink-3)',
                  fontWeight: isToday ? 700 : 400,
                  letterSpacing: '0.05em',
                }}
              >
                {d.day_label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="absolute pointer-events-none rounded-[8px] px-3 py-2"
          style={{
            left: `${
              ((PADDING_X + hoverIdx * (barW + barGap) + barW / 2) / W) * 100
            }%`,
            top: `${
              ((PADDING_T +
                chartH -
                (data[hoverIdx].revenue > 0
                  ? (data[hoverIdx].revenue / maxRevenue) * chartH
                  : 2)) /
                H) *
              100
            }%`,
            transform: 'translate(-50%, calc(-100% - 10px))',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 11,
            fontFamily: 'var(--f-mono)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(42,31,24,0.25)',
            zIndex: 5,
          }}
        >
          <div
            style={{
              letterSpacing: '0.06em',
              fontWeight: 700,
              opacity: 0.7,
              fontSize: 9,
              marginBottom: 2,
            }}
          >
            {data[hoverIdx].day_label} ·{' '}
            {new Date(data[hoverIdx].date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            })}
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 14,
            }}
          >
            {money(data[hoverIdx].revenue)}
          </div>
          <div style={{ opacity: 0.7, fontSize: 10 }}>
            {data[hoverIdx].orders} sipariş
          </div>
        </div>
      )}
    </div>
  );
}
