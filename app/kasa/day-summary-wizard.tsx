'use client';

/**
 * Gün Sonu Wizard - 3 Adımlı Rapor Oluşturma
 *
 * Akış:
 *  1. Adım: Tarih/saat aralığı seç (preset + özel)
 *     - Canlı önizleme: seçilen dönemde kaç sipariş, toplam ciro
 *  2. Adım: Nakit + Kart beyan et (sistem hesabı yanında, kopyala shortcut)
 *     - Sapma varsa soft uyarı
 *  3. Adım: Önizleme modal'ı açılır (ayrı component)
 *
 * Kurallar:
 *  - Bugün seçiliyse "İndir" = kasa kapatma (declared_cash/card yazılır)
 *  - Geçmiş aralık = sadece rapor (kasaya dokunmaz)
 *  - ESC kapatırsa confirm (girilen değerler silinecek)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getZReport,
  type CashSession,
  type ZReport,
  type DaySummaryRange,
} from '@/lib/actions/payments';

type Props = {
  open: boolean;
  activeSession: CashSession | null;
  onClose: () => void;
  onFinish: (report: ZReport, closeRegister: boolean) => void;
  // Wizard tamamlandığında, üst component önizleme modal'ını açar
};

type Step = 1 | 2 | 3;

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string {
  return new Date(s).toISOString();
}

function isPresetToday(r: DaySummaryRange): boolean {
  return r.preset === 'today';
}

export function DaySummaryWizard({
  open,
  activeSession,
  onClose,
  onFinish,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [range, setRange] = useState<DaySummaryRange>({ preset: 'today' });

  // Step 1 özel aralık
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toLocalInput(d.toISOString());
  });
  const [customTo, setCustomTo] = useState(() =>
    toLocalInput(new Date().toISOString())
  );

  // Step 1 canlı önizleme (seçilen aralığın mini özeti)
  const [preview, setPreview] = useState<{
    loading: boolean;
    orders: number;
    revenue: number;
    error: string | null;
  }>({ loading: false, orders: 0, revenue: 0, error: null });

  // Step 2
  const [cashDeclared, setCashDeclared] = useState('');
  const [cardDeclared, setCardDeclared] = useState('');
  const [cashSoftWarn, setCashSoftWarn] = useState(false);
  const [cardSoftWarn, setCardSoftWarn] = useState(false);

  // Step 2 sistem değerleri (rapordan gelir)
  const [systemReport, setSystemReport] = useState<ZReport | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stale fetch koruması + basit cache
  const latestFetchToken = useRef(0);
  const reportCache = useRef<Map<string, ZReport>>(new Map());

  const rangeCacheKey = useCallback((r: DaySummaryRange): string => {
    if (r.preset === 'custom') return `custom:${r.from}:${r.to}`;
    return r.preset;
  }, []);

  // ESC handling + scroll kilidi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseAttempt();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Açıldığında state sıfırla (cache korunur, sadece UI state)
  useEffect(() => {
    if (open) {
      setStep(1);
      setRange({ preset: 'today' });
      setCashDeclared('');
      setCardDeclared('');
      setCashSoftWarn(false);
      setCardSoftWarn(false);
      setSystemReport(null);
      setSubmitting(false);
      setConfirmCloseOpen(false);
      // Preview state sıfırla - bir önceki "hesaplanıyor" durumu kalmasın
      setPreview({ loading: false, orders: 0, revenue: 0, error: null });
      // Fetch token sıfırla - eski pending fetch'ler artık stale sayılsın
      latestFetchToken.current++;
      // Wizard yeni açıldığında cache'i boşalt (taze veri)
      reportCache.current.clear();
    }
  }, [open]);

  // Step 1 canlı önizleme — cache hit ise anında, miss ise 80ms debounce
  const fetchPreview = useCallback(
    async (r: DaySummaryRange, token: number) => {
      if (token !== latestFetchToken.current) return;

      const key = rangeCacheKey(r);
      const cached = reportCache.current.get(key);
      if (cached) {
        setPreview({
          loading: false,
          orders: cached.total_orders_paid,
          revenue: cached.total_revenue,
          error: null,
        });
        return;
      }

      setPreview({ loading: true, orders: 0, revenue: 0, error: null });

      // Timeout watcher - 30sn (ağır sorgu durumu için pay)
      let resolved = false;
      const timeoutId = window.setTimeout(() => {
        if (resolved) return;
        if (token !== latestFetchToken.current) return;
        setPreview({
          loading: false,
          orders: 0,
          revenue: 0,
          error: 'Zaman aşımı — tekrar dene',
        });
      }, 30000);

      try {
        const res = await getZReport(r);
        resolved = true;
        window.clearTimeout(timeoutId);
        if (token !== latestFetchToken.current) return;
        if (!res.success || !res.report) {
          setPreview({
            loading: false,
            orders: 0,
            revenue: 0,
            error: res.error || 'Yüklenemedi',
          });
          return;
        }
        reportCache.current.set(key, res.report);
        setPreview({
          loading: false,
          orders: res.report.total_orders_paid,
          revenue: res.report.total_revenue,
          error: null,
        });
      } catch (err) {
        resolved = true;
        window.clearTimeout(timeoutId);
        if (token !== latestFetchToken.current) return;
        setPreview({
          loading: false,
          orders: 0,
          revenue: 0,
          error: err instanceof Error ? err.message : 'Hata',
        });
      }
    },
    [rangeCacheKey]
  );

  // Step 1 için canlı önizleme — range değişiminde 80ms debounce
  useEffect(() => {
    if (!open || step !== 1) return;
    const token = ++latestFetchToken.current;
    const t = window.setTimeout(() => fetchPreview(range, token), 80);
    return () => window.clearTimeout(t);
  }, [open, step, range, fetchPreview]);

  // Çıkış onayı için iç state (window.confirm yerine)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const handleCloseAttempt = () => {
    const hasInput = cashDeclared || cardDeclared;
    if (hasInput) {
      setConfirmCloseOpen(true);
      return;
    }
    onClose();
  };

  const handleConfirmClose = () => {
    setConfirmCloseOpen(false);
    onClose();
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    if (customFrom >= customTo) return;
    setRange({
      preset: 'custom',
      from: fromLocalInput(customFrom),
      to: fromLocalInput(customTo),
    });
  };

  const handleStep1Next = async () => {
    // Cache'de varsa anında kullan
    const key = rangeCacheKey(range);
    const cached = reportCache.current.get(key);
    if (cached) {
      if (cached.total_orders_paid === 0) {
        setPreview({
          loading: false,
          orders: 0,
          revenue: cached.total_revenue,
          error: null,
        });
        return;
      }
      setSystemReport(cached);
      setStep(2);
      return;
    }

    // Cache yok, fresh fetch
    setSystemReport(null);
    const r = await getZReport(range);
    if (!r.success || !r.report) {
      setPreview({
        loading: false,
        orders: 0,
        revenue: 0,
        error: r.error || 'Rapor alınamadı',
      });
      return;
    }
    reportCache.current.set(key, r.report);
    if (r.report.total_orders_paid === 0) {
      setPreview({
        loading: false,
        orders: 0,
        revenue: r.report.total_revenue,
        error: null,
      });
      return;
    }
    setSystemReport(r.report);
    setStep(2);
  };

  const handleStep2Next = async () => {
    // systemReport null ise wizard kendi fetch yapar (step1'deki cache'ten)
    let report = systemReport;
    if (!report) {
      const key = rangeCacheKey(range);
      const cached = reportCache.current.get(key);
      if (cached) {
        report = cached;
      } else {
        // Son çare: taze fetch
        setSubmitting(true);
        const res = await getZReport(range);
        setSubmitting(false);
        if (!res.success || !res.report) {
          return; // Rapor yoksa hiçbir şey yapma
        }
        reportCache.current.set(key, res.report);
        report = res.report;
      }
    }

    const sysCash = report.reconciliation.cash_total;
    const sysCard = report.reconciliation.card_total;
    const expectedCash = report.reconciliation.expected_cash;

    // Boş/geçersiz girişlerde sistem değerini kullan (hiç fark yok)
    const rawCash = cashDeclared.trim();
    const rawCard = cardDeclared.trim();
    const parsedCash = rawCash === '' ? NaN : Number(rawCash);
    const parsedCard = rawCard === '' ? NaN : Number(rawCard);

    const declaredCashValue =
      !isNaN(parsedCash) && parsedCash >= 0 ? parsedCash : null;
    const declaredCardValue =
      !isNaN(parsedCard) && parsedCard >= 0 ? parsedCard : null;

    const enriched: ZReport = {
      ...report,
      reconciliation: {
        ...report.reconciliation,
        declared_cash: declaredCashValue,
        declared_card: declaredCardValue,
        cash_variance:
          declaredCashValue !== null
            ? expectedCash !== null
              ? declaredCashValue - expectedCash
              : declaredCashValue - sysCash
            : null,
        card_variance:
          declaredCardValue !== null ? declaredCardValue - sysCard : null,
      },
    };

    // closeRegister = bugün seçiliyse ve kasa açıksa true
    const closeRegister = isPresetToday(range) && activeSession !== null;
    setSubmitting(true);
    // onFinish arka planda çalışır (kasa kapatma vs), wizard hemen kapanır
    // Preview modal'ı açtığında parent zaten handle ediyor
    try {
      onFinish(enriched, closeRegister);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[WIZARD-FINISH]', err);
    }
    // Hemen submitting'i kaldır - wizard parent tarafından kapatılacak
    setSubmitting(false);
  };

  // Soft warn hesaplama
  const sysCash = systemReport?.reconciliation.cash_total ?? 0;
  const sysCard = systemReport?.reconciliation.card_total ?? 0;
  const expectedCash = systemReport?.reconciliation.expected_cash ?? sysCash;
  const cashNum = Number(cashDeclared || '0');
  const cardNum = Number(cardDeclared || '0');
  const cashDelta = !isNaN(cashNum) ? cashNum - expectedCash : 0;
  const cardDelta = !isNaN(cardNum) ? cardNum - sysCard : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3"
      style={{ background: 'rgba(42,31,24,0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAttempt();
      }}
    >
      <div
        className="relative w-full max-w-[560px] rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 24px 60px -12px rgba(42,31,24,0.4)',
          animation: 'aleg-wizard-in 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Top accent şerit */}
        <div style={{ height: 4, background: 'var(--accent)' }} />

        {/* Header + Progress */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between mb-3">
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
                GÜN SONU · ADIM {step}/3
              </div>
              <h2
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 24,
                  color: 'var(--ink)',
                  lineHeight: 1.1,
                }}
              >
                {step === 1
                  ? 'Hangi dönemin raporu?'
                  : step === 2
                    ? 'Nakit ve kart beyanı'
                    : 'Önizleme'}
              </h2>
            </div>
            <button
              onClick={handleCloseAttempt}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors"
              style={{ color: 'var(--ink-3)', border: '1px solid var(--line)' }}
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--paper-2)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(step / 3) * 100}%`,
                background: 'var(--accent)',
              }}
            />
          </div>
        </div>

        {/* İçerik */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <Step1
              range={range}
              onChange={setRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFrom={setCustomFrom}
              onCustomTo={setCustomTo}
              onApplyCustom={handleApplyCustom}
              preview={preview}
              kasaOpenInfo={activeSession !== null}
            />
          )}

          {step === 2 && systemReport && (
            <Step2
              report={systemReport}
              cashDeclared={cashDeclared}
              cardDeclared={cardDeclared}
              onCashChange={(v) => {
                setCashDeclared(v);
                const n = Number(v || '0');
                const sysExp = systemReport.reconciliation.expected_cash ?? sysCash;
                setCashSoftWarn(!isNaN(n) && Math.abs(n - sysExp) > Math.max(50, sysExp * 0.05));
              }}
              onCardChange={(v) => {
                setCardDeclared(v);
                const n = Number(v || '0');
                setCardSoftWarn(!isNaN(n) && Math.abs(n - sysCard) > Math.max(50, sysCard * 0.05));
              }}
              cashSoftWarn={cashSoftWarn}
              cardSoftWarn={cardSoftWarn}
              cashDelta={cashDelta}
              cardDelta={cardDelta}
              isToday={isPresetToday(range)}
              kasaOpen={activeSession !== null}
            />
          )}
        </div>

        {/* Footer butonlar */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          {step === 1 ? (
            <button
              onClick={handleCloseAttempt}
              className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:opacity-70"
              style={{
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
              }}
            >
              İptal
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:bg-card flex items-center gap-2"
              style={{
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
              }}
            >
              <span>←</span>
              <span>GERİ</span>
            </button>
          )}

          {step === 1 && (
            <button
              onClick={handleStep1Next}
              disabled={preview.loading}
              className="h-10 px-5 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              <span>DEVAM</span>
              <span>→</span>
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleStep2Next}
              disabled={submitting}
              className="h-10 px-5 rounded-[10px] text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              <span>RAPORU OLUŞTUR</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          ÇIKIŞ ONAY MODALI (window.confirm yerine, tema uyumlu)
          ============================================================ */}
      {confirmCloseOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(42,31,24,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmCloseOpen(false);
          }}
        >
          <div
            className="w-full max-w-[400px] rounded-[var(--r)] overflow-hidden"
            style={{
              background: 'var(--paper)',
              boxShadow: '0 24px 60px -12px rgba(42,31,24,0.45)',
              animation: 'aleg-wizard-in 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Top accent şerit warn rengi */}
            <div style={{ height: 3, background: 'var(--warn)' }} />

            <div className="px-6 pt-5 pb-4">
              <div
                className="uppercase mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--warn)',
                }}
              >
                EMİN MİSİN?
              </div>
              <h3
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                Çıkmak istiyor musun?
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}
              >
                Girdiğin nakit ve kart bilgileri silinecek. Rapor
                oluşturulmadan wizard kapanacak.
              </p>
            </div>

            <div
              className="px-6 py-4 flex items-center justify-end gap-2"
              style={{
                borderTop: '1px solid var(--line)',
                background: 'var(--paper-2)',
              }}
            >
              <button
                onClick={() => setConfirmCloseOpen(false)}
                className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:bg-card"
                style={{
                  background: 'transparent',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.04em',
                }}
              >
                VAZGEÇ
              </button>
              <button
                onClick={handleConfirmClose}
                className="h-10 px-4 rounded-[10px] text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: 'var(--danger)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.06em',
                }}
              >
                EVET, ÇIK
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes aleg-wizard-in {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes aleg-progress-slide {
          0% {
            transform: translateX(-100%);
            width: 30%;
          }
          50% {
            width: 70%;
          }
          100% {
            transform: translateX(350%);
            width: 30%;
          }
        }
        @keyframes aleg-shimmer {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes aleg-skeleton-pulse {
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
            opacity: 0.4;
            transform: scale(0.85);
          }
        }
        @keyframes aleg-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STEP 1 — Tarih/Saat Aralığı
// ============================================================

function Step1({
  range,
  onChange,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
  onApplyCustom,
  preview,
  kasaOpenInfo,
}: {
  range: DaySummaryRange;
  onChange: (r: DaySummaryRange) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (s: string) => void;
  onCustomTo: (s: string) => void;
  onApplyCustom: () => void;
  preview: { loading: boolean; orders: number; revenue: number; error: string | null };
  kasaOpenInfo: boolean;
}) {
  // Preset'lere göre gerçek tarih aralığını string olarak hesapla (gösterim için)
  const now = new Date();
  const fmtShort = (d: Date) =>
    d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });

  const todayStr = fmtShort(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = fmtShort(yesterdayDate);
  const weekAgoDate = new Date(now);
  weekAgoDate.setDate(weekAgoDate.getDate() - 6);
  const monthAgoDate = new Date(now);
  monthAgoDate.setDate(monthAgoDate.getDate() - 29);

  const presets: Array<{
    id: DaySummaryRange['preset'];
    label: string;
    hint: string;
  }> = [
    { id: 'today', label: 'Bugün', hint: `${todayStr} · 00:00 - şu an` },
    { id: 'yesterday', label: 'Dün', hint: `${yesterdayStr} · 00:00 - 23:59` },
    {
      id: 'week',
      label: 'Son 7 Gün',
      hint: `${fmtShort(weekAgoDate)} - ${todayStr}`,
    },
    {
      id: 'month',
      label: 'Son 30 Gün',
      hint: `${fmtShort(monthAgoDate)} - ${todayStr}`,
    },
    { id: 'custom', label: 'Özel Aralık', hint: 'tarih + saat seç' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
        Raporun kapsayacağı tarih ve saat aralığını seç.
      </p>

      {/* Bugün + kasa açık uyarı bannerı */}
      {range.preset === 'today' && kasaOpenInfo && (
        <div
          className="rounded-[10px] p-3.5 flex items-start gap-3"
          style={{
            background: 'color-mix(in srgb, var(--warn) 10%, var(--card))',
            border: '1.5px solid color-mix(in srgb, var(--warn) 40%, var(--line))',
          }}
        >
          <span
            style={{ fontSize: 20, lineHeight: 1, color: 'var(--warn)' }}
            className="flex-shrink-0"
          >
            ⚠
          </span>
          <div>
            <div
              className="uppercase mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--warn)',
              }}
            >
              DİKKAT · KASA KAPANACAK
            </div>
            <div
              className="text-sm"
              style={{
                color: 'var(--ink)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              Bugün seçili. Raporu indirdiğinde <strong>kasa otomatik
              kapanacak</strong> ve yeni sipariş alınamayacak. Eğer vardiya
              devam edecekse önce <strong>Dün</strong> veya <strong>Özel
              Aralık</strong> seç.
            </div>
          </div>
        </div>
      )}

      {/* Preset list */}
      <div className="space-y-2">
        {presets.map((p) => {
          const active = range.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                if (p.id === 'custom') {
                  onApplyCustom();
                } else {
                  onChange({ preset: p.id } as DaySummaryRange);
                }
              }}
              className="w-full text-left px-4 py-3 rounded-[10px] flex items-center justify-between transition-all hover:bg-paper-2"
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--accent) 7%, var(--card))'
                  : 'var(--card)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
              }}
            >
              <div>
                <div
                  className="font-semibold flex items-center gap-2"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--ink)',
                    fontSize: 14,
                  }}
                >
                  <span>{p.label}</span>
                  {p.id === 'today' && kasaOpenInfo && (
                    <span
                      className="uppercase"
                      style={{
                        fontSize: 9,
                        fontFamily: 'var(--f-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: 'var(--warn)',
                        background: 'color-mix(in srgb, var(--warn) 14%, transparent)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      KASA KAPATIR
                    </span>
                  )}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    letterSpacing: '0.02em',
                    color: active ? 'var(--ink-2)' : 'var(--ink-3)',
                  }}
                >
                  {p.hint}
                </div>
              </div>
              {active && (
                <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom picker */}
      {range.preset === 'custom' && (
        <div
          className="rounded-[10px] p-4 space-y-3"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block uppercase mb-1.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                BAŞLANGIÇ
              </label>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => onCustomFrom(e.target.value)}
                onBlur={onApplyCustom}
                className="w-full h-10 px-3 rounded-[8px] text-sm focus:outline-none focus:border-accent"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  color: 'var(--ink)',
                }}
              />
            </div>
            <div>
              <label
                className="block uppercase mb-1.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                BİTİŞ
              </label>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => onCustomTo(e.target.value)}
                onBlur={onApplyCustom}
                className="w-full h-10 px-3 rounded-[8px] text-sm focus:outline-none focus:border-accent"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>
          {customFrom && customTo && customFrom >= customTo && (
            <div
              className="text-xs"
              style={{
                color: 'var(--danger)',
                fontFamily: 'var(--f-mono)',
              }}
            >
              Bitiş zamanı başlangıçtan sonra olmalı.
            </div>
          )}
        </div>
      )}

      {/* Canlı önizleme */}
      <div
        className="rounded-[10px] px-4 py-3.5 relative overflow-hidden"
        style={{
          background: preview.loading
            ? 'var(--card)'
            : preview.orders > 0
              ? 'color-mix(in srgb, var(--ok) 6%, var(--card))'
              : 'var(--card)',
          border: `1px solid ${
            preview.loading
              ? 'var(--line)'
              : preview.orders > 0
                ? 'color-mix(in srgb, var(--ok) 22%, var(--line))'
                : 'var(--line)'
          }`,
          minHeight: 72,
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {/* Shimmer overlay (loading iken) */}
        {preview.loading && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--accent) 8%, transparent) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'aleg-shimmer 1.6s ease-in-out infinite',
            }}
          />
        )}

        <div className="relative">
          <div
            className="uppercase flex items-center justify-between"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: preview.loading ? 'var(--accent)' : 'var(--ink-3)',
              transition: 'color 0.2s',
            }}
          >
            <span>BU DÖNEMDE</span>
            {preview.loading && (
              <span
                className="flex items-center gap-1.5"
                style={{ color: 'var(--accent)' }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: 'var(--accent)',
                    animation: 'aleg-pulse-dot 1s ease-in-out infinite',
                  }}
                />
                HESAPLANIYOR
              </span>
            )}
          </div>

          {preview.loading ? (
            <div className="mt-2.5 space-y-2">
              {/* Indeterminate progress bar */}
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{
                  background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '40%',
                    background: 'var(--accent)',
                    animation: 'aleg-progress-slide 1.4s ease-in-out infinite',
                  }}
                />
              </div>
              {/* Skeleton "sipariş · ciro" satırı */}
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="h-4 rounded"
                  style={{
                    width: 60,
                    background:
                      'color-mix(in srgb, var(--ink) 7%, transparent)',
                    animation: 'aleg-skeleton-pulse 1.4s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      'color-mix(in srgb, var(--ink) 10%, transparent)',
                  }}
                />
                <div
                  className="h-4 rounded"
                  style={{
                    width: 96,
                    background:
                      'color-mix(in srgb, var(--ink) 7%, transparent)',
                    animation:
                      'aleg-skeleton-pulse 1.4s ease-in-out 0.2s infinite',
                  }}
                />
              </div>
            </div>
          ) : preview.error ? (
            <div
              className="mt-0.5 text-sm"
              style={{ color: 'var(--danger)' }}
            >
              {preview.error}
            </div>
          ) : preview.orders === 0 ? (
            <div
              className="mt-0.5 text-sm"
              style={{
                color: 'var(--warn)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
              }}
            >
              Bu dönemde sipariş yok
            </div>
          ) : (
            <div
              className="mt-0.5"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink)',
                animation: 'aleg-fade-in 0.3s ease-out',
              }}
            >
              <strong>{preview.orders}</strong> sipariş ·{' '}
              <strong>{money(preview.revenue)}</strong> ciro
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2 — Nakit + Kart Beyan
// ============================================================


// ============================================================
// STEP 2 — Nakit + Kart Beyan (Hesaplama Açıklamalı)
// ============================================================

function Step2({
  report,
  cashDeclared,
  cardDeclared,
  onCashChange,
  onCardChange,
  cashSoftWarn,
  cardSoftWarn,
  cashDelta,
  cardDelta,
  isToday,
  kasaOpen,
}: {
  report: ZReport;
  cashDeclared: string;
  cardDeclared: string;
  onCashChange: (v: string) => void;
  onCardChange: (v: string) => void;
  cashSoftWarn: boolean;
  cardSoftWarn: boolean;
  cashDelta: number;
  cardDelta: number;
  isToday: boolean;
  kasaOpen: boolean;
}) {
  const rec = report.reconciliation;
  const systemCash = rec.expected_cash ?? rec.cash_total;
  const systemCard = rec.card_total;

  return (
    <div className="space-y-5">
      {/* Üst uyarı — Bugün + kasa açıksa belirgin */}
      {isToday && kasaOpen && (
        <div
          className="rounded-[10px] p-3 flex items-start gap-3"
          style={{
            background: 'color-mix(in srgb, var(--warn) 10%, var(--card))',
            border: '1.5px solid color-mix(in srgb, var(--warn) 40%, var(--line))',
          }}
        >
          <span
            style={{ fontSize: 18, color: 'var(--warn)' }}
            className="flex-shrink-0"
          >
            ⚠
          </span>
          <div>
            <div
              className="uppercase mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--warn)',
              }}
            >
              KASA KAPANACAK
            </div>
            <div
              className="text-sm italic"
              style={{
                color: 'var(--ink)',
                fontFamily: 'var(--f-serif)',
                lineHeight: 1.4,
              }}
            >
              Değerleri girip raporu oluşturduğunda kasa otomatik kapanacak.
            </div>
          </div>
        </div>
      )}

      {/* SİSTEM HESABI — Nereden geliyor bu değerler? */}
      <div
        className="rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="px-4 py-2.5"
          style={{
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink-3)',
            }}
          >
            SİSTEM NE DİYOR? · OTOMATİK HESAP
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {rec.opening_amount !== null && (
            <CalcRow
              label="Kasa açılış tutarı"
              value={money(rec.opening_amount)}
              hint="başlangıçta kasada olan"
            />
          )}
          <CalcRow
            label="Gün içi nakit tahsilat"
            value={`+${money(rec.cash_total)}`}
            hint={`${(report.by_method.cash?.count || 0)} nakit ödeme`}
            color="var(--ok)"
          />
          {rec.cash_refunds > 0 && (
            <CalcRow
              label="Nakit iade"
              value={`−${money(rec.cash_refunds)}`}
              color="var(--danger)"
            />
          )}
          <CalcRow
            label="BEKLENEN NAKİT"
            value={money(systemCash)}
            bold
            color="var(--accent)"
          />
          <CalcRow
            label="Gün içi kart tahsilat"
            value={money(systemCard)}
            hint={`${(report.by_method.card?.count || 0)} kart ödeme`}
            color="var(--super)"
          />
        </div>
      </div>

      {/* BEYAN FORMU */}
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
          ŞİMDİ GERÇEK TUTARLARI GİR
        </div>

        {/* NAKİT INPUT */}
        <div
          className="rounded-[var(--r)] p-4 mb-3"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="uppercase flex items-center gap-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--ok)',
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--ok)' }}
                />
                KASADA SAYDIĞIN NAKİT
              </div>
              <div
                className="text-xs mt-0.5"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                }}
              >
                kutuda gerçekten olan para
              </div>
            </div>
            <button
              onClick={() => onCashChange(systemCash.toFixed(2))}
              className="text-xs px-2.5 py-1.5 rounded hover:bg-paper-2 transition-colors flex items-center gap-1.5"
              style={{
                color: 'var(--accent)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
                border: '1px solid var(--line)',
              }}
              title="Sistem değerini kopyala"
            >
              <span style={{ fontSize: 10 }}>↓</span>
              {money(systemCash)}
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cashDeclared}
              onChange={(e) => onCashChange(e.target.value)}
              autoFocus
              placeholder="0,00"
              className="w-full h-14 px-4 pr-12 rounded-[10px] focus:outline-none focus:border-accent"
              style={{
                background: 'var(--paper-2)',
                border: `1px solid ${cashSoftWarn ? 'var(--warn)' : 'var(--line)'}`,
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                color: 'var(--ink)',
              }}
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink-3)',
              }}
            >
              ₺
            </span>
          </div>

          {cashDeclared && (
            <DeltaLine
              delta={cashDelta}
              softWarn={cashSoftWarn}
            />
          )}
        </div>

        {/* KART INPUT */}
        <div
          className="rounded-[var(--r)] p-4"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="uppercase flex items-center gap-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--super)',
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--super)' }}
                />
                POS&apos;TAN GEÇEN KART
              </div>
              <div
                className="text-xs mt-0.5"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                }}
              >
                POS&apos;un gün sonu raporundaki toplam
              </div>
            </div>
            <button
              onClick={() => onCardChange(systemCard.toFixed(2))}
              className="text-xs px-2.5 py-1.5 rounded hover:bg-paper-2 transition-colors flex items-center gap-1.5"
              style={{
                color: 'var(--accent)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.04em',
                border: '1px solid var(--line)',
              }}
              title="Sistem değerini kopyala"
            >
              <span style={{ fontSize: 10 }}>↓</span>
              {money(systemCard)}
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={cardDeclared}
              onChange={(e) => onCardChange(e.target.value)}
              placeholder="0,00"
              className="w-full h-14 px-4 pr-12 rounded-[10px] focus:outline-none focus:border-accent"
              style={{
                background: 'var(--paper-2)',
                border: `1px solid ${cardSoftWarn ? 'var(--warn)' : 'var(--line)'}`,
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                color: 'var(--ink)',
              }}
            />
            <span
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink-3)',
              }}
            >
              ₺
            </span>
          </div>

          {cardDeclared && (
            <DeltaLine
              delta={cardDelta}
              softWarn={cardSoftWarn}
            />
          )}
        </div>
      </div>

      {/* FORMUL AÇIKLAMASI — naif dil */}
      <div
        className="rounded-[10px] px-3.5 py-2.5 flex items-start gap-2 text-xs"
        style={{
          background: 'color-mix(in srgb, var(--ink) 4%, var(--card))',
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <span style={{ lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink-2)' }}>Nasıl çalışır?</strong>{' '}
          Senin girdiğin gerçek tutarı, sistemin hesabıyla karşılaştırır.
          Aynıysa ✓ yazar. Fark varsa rapora ▲ fazla / ▼ eksik olarak yazar —
          <strong style={{ color: 'var(--ink-2)' }}>
            {' '}hata bulmak için değil, günü belgelemek için
          </strong>
          . <em>Bir alanı boş bırakırsan sistem değeri kullanılır, fark hesaplanmaz.</em>
        </span>
      </div>
    </div>
  );
}

function CalcRow({
  label,
  value,
  hint,
  bold,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div
          className={bold ? 'uppercase' : ''}
          style={{
            fontFamily: bold ? 'var(--f-mono)' : 'inherit',
            fontSize: bold ? 10 : 13,
            fontWeight: bold ? 700 : 500,
            letterSpacing: bold ? '0.14em' : undefined,
            color: bold ? 'var(--ink-3)' : 'var(--ink)',
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            className="text-xs mt-0.5"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        className="flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: bold ? 16 : 14,
          fontWeight: bold ? 700 : 600,
          color: color || 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DeltaLine({
  delta,
  softWarn,
}: {
  delta: number;
  softWarn: boolean;
}) {
  const isZero = Math.abs(delta) < 0.01;
  const color = isZero
    ? 'var(--ok)'
    : delta < 0
      ? 'var(--danger)'
      : 'var(--gold)';
  const icon = isZero ? '✓' : delta > 0 ? '▲' : '▼';
  const text = isZero
    ? 'Sistem ile uyuyor'
    : delta > 0
      ? `Sistemden ${money(delta)} fazla`
      : `Sistemden ${money(Math.abs(delta))} eksik`;
  return (
    <div
      className="mt-2.5 rounded-[8px] px-3 py-2 flex items-center gap-2"
      style={{
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 22%, var(--line))`,
      }}
    >
      <span style={{ color, fontSize: 14 }}>{icon}</span>
      <span
        className="text-xs font-semibold"
        style={{
          color,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.02em',
        }}
      >
        {text}
      </span>
      {softWarn && (
        <span
          className="text-xs italic ml-auto"
          style={{
            color: 'var(--warn)',
            fontFamily: 'var(--f-serif)',
          }}
        >
          sapma büyük, emin misin?
        </span>
      )}
    </div>
  );
}
