'use client';

import { useState, useTransition, useEffect } from 'react';
import { type CashSession } from '@/lib/actions/payments';
import { useOfflineActions } from '@/lib/offline/use-offline-actions';

type Props = {
  mode: 'open' | 'close';
  activeSession?: CashSession | null;
  onClose: () => void;
  onSuccess: (info: { queued?: boolean; online?: boolean }) => void;
};

export function CashSessionModal({
  mode,
  activeSession,
  onClose,
  onSuccess,
}: Props) {
  const { openCash, closeCash } = useOfflineActions();
  const [amount, setAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>(''); // Kapanışta beyan edilen kart tutarı
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    expected: number;
    counted: number;
    difference: number;
    cardExpected?: number;
    cardDeclared?: number;
    cardVariance?: number;
    queued?: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = () => {
    const num = Number(amount);
    if (isNaN(num) || num < 0) {
      setError('Geçerli bir tutar girin');
      return;
    }

    // Close modunda kart tutarı da zorunlu (varsa)
    let cardNum = 0;
    if (mode === 'close') {
      cardNum = Number(cardAmount || '0');
      if (isNaN(cardNum) || cardNum < 0) {
        setError('Kart tutarı geçersiz');
        return;
      }
    }

    setError(null);

    startTransition(async () => {
      if (mode === 'open') {
        const r = await openCash(num, note || undefined);
        if (!r.success) {
          setError(r.error || 'Kasa açılamadı');
          return;
        }
        onSuccess({ queued: r.queued, online: r.online });
      } else {
        const r = await closeCash(num, note || undefined);
        if (!r.success) {
          setError(r.error || 'Kasa kapatılamadı');
          return;
        }
        // Offline'da expected/difference server'dan dönmez - local hesaplamayla göster
        const expected = activeSession?.expected_cash ?? 0;

        // Kart mutabakatını da DB'ye yaz (online + session id varsa)
        const cardExpected = activeSession?.card_payments_total ?? 0;
        const cardVariance = cardNum - cardExpected;

        if (r.online !== false && activeSession?.id) {
          try {
            const { declareCashSessionCard } = await import(
              '@/lib/actions/payments'
            );
            await declareCashSessionCard(activeSession.id, {
              declared_cash: num,
              declared_card: cardNum,
              card_expected: cardExpected,
              cash_variance: num - expected,
              card_variance: cardVariance,
            });
          } catch {
            // Sessiz: ana akış (closeCash) başarılı, mutabakat alanları ek.
          }
        }

        setResult({
          expected,
          counted: num,
          difference: num - expected,
          cardExpected,
          cardDeclared: cardNum,
          cardVariance,
          queued: r.queued,
        });
      }
    });
  };

  const handleFinishClose = () => {
    onSuccess({ queued: result?.queued });
  };

  // Sonuç ekranı (kasa kapatıldı)
  if (result) {
    const hasDiff = Math.abs(result.difference) > 0.01;
    const color = !hasDiff
      ? 'var(--ok)'
      : result.difference < 0
        ? 'var(--danger)'
        : 'var(--gold)';

    return (
      <ModalShell onClose={handleFinishClose}>
        <div className="px-6 py-6 text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              color,
              fontSize: 24,
            }}
          >
            {!hasDiff ? '✓' : '!'}
          </div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Kasa kapatıldı
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-2)' }}>
            {!hasDiff
              ? 'Kasa tam olarak uyuyor — tertemiz kapanış!'
              : result.difference > 0
                ? `Sayılan tutar beklenilenden ${fmt(result.difference)} fazla.`
                : `Sayılan tutar beklenilenden ${fmt(Math.abs(result.difference))} eksik.`}
          </p>

          <div
            className="grid grid-cols-3 gap-3 mb-3 text-left rounded-[var(--r)] p-4"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="col-span-3 mb-1">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ok)',
                }}
              >
                ● NAKİT MUTABAKATI
              </div>
            </div>
            <div>
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                BEKLENEN
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: 'var(--ink-2)',
                }}
              >
                {fmt(result.expected)}
              </div>
            </div>
            <div>
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                SAYILAN
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: 'var(--ink)',
                }}
              >
                {fmt(result.counted)}
              </div>
            </div>
            <div>
              <div
                className="uppercase mb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color,
                }}
              >
                FARK
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color,
                }}
              >
                {result.difference > 0 ? '+' : ''}
                {fmt(result.difference)}
              </div>
            </div>
          </div>

          {/* KART MUTABAKATI */}
          {result.cardExpected !== undefined && result.cardDeclared !== undefined && (
            <div
              className="grid grid-cols-3 gap-3 mb-6 text-left rounded-[var(--r)] p-4"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <div className="col-span-3 mb-1">
                <div
                  className="uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--super)',
                  }}
                >
                  ● KART MUTABAKATI
                </div>
              </div>
              <div>
                <div
                  className="uppercase mb-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  SİSTEMDE
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 20,
                    color: 'var(--ink-2)',
                  }}
                >
                  {fmt(result.cardExpected)}
                </div>
              </div>
              <div>
                <div
                  className="uppercase mb-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-3)',
                  }}
                >
                  BEYAN
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 20,
                    color: 'var(--ink)',
                  }}
                >
                  {fmt(result.cardDeclared)}
                </div>
              </div>
              <div>
                <div
                  className="uppercase mb-1"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color:
                      Math.abs(result.cardVariance ?? 0) < 0.01
                        ? 'var(--ok)'
                        : (result.cardVariance ?? 0) < 0
                          ? 'var(--danger)'
                          : 'var(--gold)',
                  }}
                >
                  FARK
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 20,
                    color:
                      Math.abs(result.cardVariance ?? 0) < 0.01
                        ? 'var(--ok)'
                        : (result.cardVariance ?? 0) < 0
                          ? 'var(--danger)'
                          : 'var(--gold)',
                  }}
                >
                  {(result.cardVariance ?? 0) > 0 ? '+' : ''}
                  {fmt(result.cardVariance ?? 0)}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleFinishClose}
            className="w-full h-12 rounded-[10px] font-semibold text-sm transition-all hover:opacity-95 active:scale-[0.99]"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              boxShadow:
                '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
            }}
          >
            Tamam, kapat
          </button>
        </div>
      </ModalShell>
    );
  }

  // Normal aç/kapat formu
  return (
    <ModalShell onClose={onClose}>
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
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
          NAKIT KASA
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
          {mode === 'open' ? 'Günü aç' : 'Günü kapat'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
          {mode === 'open'
            ? 'Kasada şu an ne kadar nakit var? Gün sonunda fark kontrolü için lazım.'
            : 'Kasadaki nakdi say ve gerçek tutarı gir. Aleg, olması gereken tutarla karşılaştırır.'}
        </p>
      </div>

      {/* Mevcut oturum özeti (kapatırken) */}
      {mode === 'close' && activeSession && (
        <div
          className="px-6 py-4 space-y-2"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <Row label="Açılış tutarı" value={fmt(activeSession.opening_amount)} />
          <Row
            label={`Alınan nakit (${activeSession.payment_count} ödeme)`}
            value={`+${fmt(activeSession.cash_payments_total)}`}
            color="var(--ok)"
          />
          {activeSession.cash_refunds_total > 0 && (
            <Row
              label="İadeler"
              value={`-${fmt(activeSession.cash_refunds_total)}`}
              color="var(--danger)"
            />
          )}
          {activeSession.card_payments_total > 0 && (
            <Row
              label="Kart ile tahsilat"
              value={fmt(activeSession.card_payments_total)}
              color="var(--super)"
            />
          )}
          <div
            className="pt-2 mt-2"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <Row
              label="Nakit olması gereken"
              value={fmt(activeSession.expected_cash)}
              bold
            />
          </div>
        </div>
      )}

      <div className="px-6 py-5">
        <label
          className="uppercase mb-2 block"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          {mode === 'open' ? 'AÇILIŞ TUTARI' : 'SAYILAN NAKİT'}
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && mode === 'open') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            autoFocus
            placeholder="0,00"
            className="w-full h-16 px-4 pr-14 rounded-[10px] transition-all focus:outline-none focus:border-accent"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              color: 'var(--ink-3)',
            }}
          >
            ₺
          </span>
        </div>

        {/* Kart input (sadece close mode için) */}
        {mode === 'close' && (
          <>
            <label
              className="uppercase mt-4 mb-2 block"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--ink-3)',
              }}
            >
              POS&apos;TAN GEÇEN KART TOPLAMI
              {activeSession?.card_payments_total !== undefined && (
                <span
                  className="ml-2 normal-case"
                  style={{
                    fontSize: 10,
                    color: 'var(--super)',
                    letterSpacing: '0.04em',
                  }}
                >
                  · Sistem: {fmt(activeSession.card_payments_total)}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="0,00"
                className="w-full h-16 px-4 pr-14 rounded-[10px] transition-all focus:outline-none focus:border-accent"
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 32,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: 'var(--ink-3)',
                }}
              >
                ₺
              </span>
            </div>
            <p
              className="mt-2 text-xs italic"
              style={{
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-serif)',
              }}
            >
              POS cihazındaki gün sonu raporundan bak, sadece bugünkü toplamı gir.
              Sistemin hesabıyla farkı otomatik göreceksin.
            </p>
          </>
        )}

        <label
          className="uppercase mt-4 mb-1.5 block"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink-3)',
          }}
        >
          NOT (OPSİYONEL)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            mode === 'open'
              ? 'Örn: sabah 500 TL bırakıldı'
              : 'Örn: akşam barista sayımı, kart sorun yaşandı'
          }
          className="w-full h-10 px-3 rounded-[10px] transition-all focus:outline-none focus:border-accent"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            fontFamily: 'var(--f-sans)',
            fontSize: 13,
            color: 'var(--ink)',
          }}
        />

        {error && (
          <div
            className="mt-3 p-3 rounded-[10px] text-sm flex items-start gap-2"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              color: 'var(--danger)',
            }}
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button
          onClick={onClose}
          disabled={isPending}
          className="h-12 px-5 rounded-[10px] font-semibold text-sm transition-all hover:opacity-70"
          style={{
            background: 'transparent',
            color: 'var(--ink-2)',
            border: '1px solid var(--line)',
          }}
        >
          İptal
        </button>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="group flex-1 h-12 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
          style={{
            background: mode === 'open' ? 'var(--accent)' : 'var(--ink)',
            color: '#FAF5EA',
            boxShadow:
              '0 1px 2px rgba(42,31,24,0.15), 0 4px 12px -4px rgba(42,31,24,0.25)',
          }}
        >
          <span>
            {isPending
              ? 'Kaydediliyor...'
              : mode === 'open'
                ? 'Kasayı Aç'
                : 'Kasayı Kapat'}
          </span>
          {!isPending && (
            <span
              className="transition-transform group-hover:translate-x-1"
              style={{ fontSize: 16 }}
            >
              →
            </span>
          )}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
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
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: bold ? 15 : 13,
          fontWeight: bold ? 700 : 500,
          color: color || 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(n);
}
