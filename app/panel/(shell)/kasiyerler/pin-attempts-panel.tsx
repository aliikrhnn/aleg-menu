'use client';

/**
 * PIN Denemeleri Paneli (Audit + Brute Force Tespiti)
 *
 * İşletme sahibi son 24 saatteki PIN giriş denemelerini görür:
 *  • Başarılı girişler (yeşil)
 *  • Yanlış PIN denemeleri (kırmızı)
 *  • Kilitli denemeler (turuncu)
 *
 * Şüpheli aktivite varsa (örn. çok yanlış PIN) buradan tespit edilir.
 */

import { useEffect, useState, useTransition } from 'react';
import { listPinAttempts } from '@/lib/actions/cashiers';

type Attempt = {
  id: string;
  cashier_id: string | null;
  cashier_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  result: string;
  expected_role: string | null;
  created_at: string;
};

type Stats = {
  success: number;
  wrong_pin: number;
  locked: number;
  not_found: number;
  wrong_role: number;
};

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  success: { label: '✓ Başarılı', color: 'var(--ok, #6B8347)' },
  wrong_pin: { label: '✗ Yanlış PIN', color: 'var(--danger, #C4553A)' },
  locked: { label: '🔒 Kilitli', color: 'var(--warn, #B8923B)' },
  not_found: { label: '? Cashier Yok', color: 'var(--ink-3)' },
  wrong_role: { label: '⚠ Yanlış Rol', color: 'var(--ink-3)' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)} sa önce`;

  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortUserAgent(ua: string | null): string {
  if (!ua) return '-';
  // Basit cihaz tespiti
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android.*Mobile/i.test(ua)) return 'Android Telefon';
  if (/Android/i.test(ua)) return 'Android Tablet';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Bilinmiyor';
}

export function PinAttemptsPanel() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [hoursBack, setHoursBack] = useState(24);

  const load = () => {
    startTransition(async () => {
      const r = await listPinAttempts({
        hoursBack,
        limit: 100,
        onlyFailures,
      });
      if (r.success) {
        setAttempts(r.attempts || []);
        setStats(r.stats || null);
        setError(null);
      } else {
        setError(r.error || 'Yüklenemedi');
      }
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyFailures, hoursBack]);

  return (
    <div className="mt-12">
      {/* Başlık */}
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <div
            className="uppercase mb-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
            }}
          >
            GÜVENLİK · DENETİM
          </div>
          <h2
            className="font-bold"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            PIN Giriş Denemeleri
          </h2>
        </div>
        <button
          onClick={load}
          disabled={isPending}
          className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            color: 'var(--ink-2)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
          }}
        >
          {isPending ? 'YÜKLENİYOR...' : '↻ YENİLE'}
        </button>
      </div>

      <p
        className="text-sm mb-5"
        style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}
      >
        Son {hoursBack} saat içindeki PIN doğrulama denemeleri.
        Çok sayıda yanlış deneme görürsen, biri PIN tahmin etmeye çalışıyor olabilir.
      </p>

      {/* İstatistik kartları */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-5">
          <StatCard label="Başarılı" value={stats.success} color="var(--ok, #6B8347)" />
          <StatCard label="Yanlış PIN" value={stats.wrong_pin} color="var(--danger, #C4553A)" />
          <StatCard label="Kilitli" value={stats.locked} color="var(--warn, #B8923B)" />
          <StatCard label="Bulunamadı" value={stats.not_found} color="var(--ink-3)" />
          <StatCard label="Yanlış Rol" value={stats.wrong_role} color="var(--ink-3)" />
        </div>
      )}

      {/* Şüpheli aktivite uyarısı */}
      {stats && stats.wrong_pin >= 5 && (
        <div
          className="mb-4 rounded-[10px] px-4 py-3 flex items-start gap-3"
          style={{
            background: 'color-mix(in srgb, var(--danger, #C4553A) 8%, var(--paper))',
            border: '1.5px solid var(--danger, #C4553A)',
          }}
        >
          <span style={{ fontSize: 22 }}>⚠</span>
          <div className="flex-1">
            <div
              className="uppercase font-bold mb-0.5"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'var(--danger, #C4553A)',
              }}
            >
              ŞÜPHELİ AKTİVİTE TESPİT EDİLDİ
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Son {hoursBack} saatte <strong>{stats.wrong_pin} yanlış PIN denemesi</strong> var.
              Aşağıdaki listeyi kontrol et; tanımadığın bir cihaz/IP varsa,
              PIN&apos;leri yenilemeyi düşün.
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Süre seçimi */}
        <div className="flex items-center gap-1">
          {[1, 24, 72].map((h) => (
            <button
              key={h}
              onClick={() => setHoursBack(h)}
              className="h-8 px-3 rounded-full text-xs font-semibold transition-all"
              style={{
                background: hoursBack === h ? 'var(--ink)' : 'transparent',
                color: hoursBack === h ? 'var(--paper)' : 'var(--ink-2)',
                border: `1px solid ${hoursBack === h ? 'var(--ink)' : 'var(--line)'}`,
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              {h === 1 ? 'SON 1 SA' : h === 24 ? 'SON 24 SA' : 'SON 3 GÜN'}
            </button>
          ))}
        </div>
        {/* Sadece başarısızlar */}
        <label
          className="flex items-center gap-2 text-xs cursor-pointer ml-auto"
          style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-mono)' }}
        >
          <input
            type="checkbox"
            checked={onlyFailures}
            onChange={(e) => setOnlyFailures(e.target.checked)}
            className="w-4 h-4"
          />
          Sadece başarısız
        </label>
      </div>

      {/* Liste */}
      {error && (
        <div
          className="rounded-[10px] px-4 py-3 mb-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--danger, #C4553A) 8%, transparent)',
            border: '1px solid var(--danger, #C4553A)',
            color: 'var(--danger, #C4553A)',
          }}
        >
          {error}
        </div>
      )}

      {attempts.length === 0 && !isPending && !error && (
        <div
          className="text-center py-12 rounded-[10px]"
          style={{
            border: '1px dashed var(--line)',
            color: 'var(--ink-3)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div className="text-sm">
            Bu zaman aralığında deneme yok.
            {onlyFailures && (
              <>
                <br />
                <span style={{ fontStyle: 'italic' }}>
                  Hiç başarısız deneme yoksa bu iyi bir haber.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {attempts.length > 0 && (
        <div
          className="rounded-[10px] overflow-hidden"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="grid items-center px-3 py-2 text-[10px] uppercase font-semibold"
            style={{
              gridTemplateColumns: '120px 1fr 1fr 110px 90px',
              background: 'var(--paper-2)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div>SONUÇ</div>
            <div>KASİYER</div>
            <div>CİHAZ / IP</div>
            <div>ROL</div>
            <div className="text-right">ZAMAN</div>
          </div>
          {attempts.map((a, i) => {
            const result = RESULT_LABELS[a.result] || {
              label: a.result,
              color: 'var(--ink-3)',
            };
            return (
              <div
                key={a.id}
                className="grid items-center px-3 py-2.5 text-xs"
                style={{
                  gridTemplateColumns: '120px 1fr 1fr 110px 90px',
                  borderBottom:
                    i === attempts.length - 1 ? 'none' : '1px solid var(--line)',
                  background:
                    a.result === 'wrong_pin' || a.result === 'locked'
                      ? 'color-mix(in srgb, var(--danger, #C4553A) 3%, transparent)'
                      : 'transparent',
                }}
              >
                <div
                  style={{
                    color: result.color,
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  {result.label}
                </div>
                <div
                  className="truncate"
                  style={{ color: 'var(--ink)', fontWeight: 500 }}
                >
                  {a.cashier_name || (
                    <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                      bilinmiyor
                    </span>
                  )}
                </div>
                <div
                  className="truncate"
                  style={{ color: 'var(--ink-2)' }}
                  title={a.user_agent || ''}
                >
                  {shortUserAgent(a.user_agent)}
                  {a.ip_address && (
                    <span
                      style={{
                        color: 'var(--ink-3)',
                        marginLeft: 6,
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                      }}
                    >
                      · {a.ip_address}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                  }}
                >
                  {a.expected_role === 'cashier'
                    ? 'KASİYER'
                    : a.expected_role === 'waiter'
                      ? 'GARSON'
                      : '-'}
                </div>
                <div
                  className="text-right"
                  style={{
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                  }}
                >
                  {formatTime(a.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
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
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
