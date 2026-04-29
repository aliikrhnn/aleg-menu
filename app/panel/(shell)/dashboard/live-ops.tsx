'use client';

import Link from 'next/link';

type LiveState = {
  activeOrders: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  occupiedTables: number;
  pendingWaiterCalls: number;
};

export function LiveOps({
  live,
  realtime,
}: {
  live: LiveState;
  realtime: boolean;
}) {
  const isIdle = live.activeOrders === 0 && live.pendingWaiterCalls === 0;
  const hasUrgentCalls = live.pendingWaiterCalls > 0;

  // Maksimum aktif sipariş seviyesi (workload bar için referans)
  const MAX_REASONABLE_ACTIVE = 15;
  const workloadPct = Math.min(
    100,
    (live.activeOrders / MAX_REASONABLE_ACTIVE) * 100
  );

  return (
    <div
      className="rounded-[var(--r)] p-6 relative overflow-hidden"
      style={{
        background: hasUrgentCalls
          ? 'color-mix(in srgb, var(--accent) 4%, var(--card))'
          : 'var(--card)',
        border: hasUrgentCalls
          ? '1px solid color-mix(in srgb, var(--accent) 22%, var(--line))'
          : '1px solid var(--line)',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      {/* Acil durum gradient overlay */}
      {hasUrgentCalls && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 60%)',
            animation: 'loBgPulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 relative z-10">
        <div>
          <div
            className="uppercase mb-1.5 flex items-center gap-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
            }}
          >
            <span>CANLI OPERASYON</span>
            {realtime && <PulseDot />}
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            {isIdle
              ? 'Mutfak sakin'
              : live.activeOrders === 1
              ? '1 aktif sipariş'
              : `${live.activeOrders} aktif sipariş`}
          </h2>
        </div>

        {/* Workload meter (sağ üst) */}
        {!isIdle && (
          <div className="text-right">
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--ink-3)',
              }}
            >
              Yoğunluk
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{
                width: 80,
                height: 6,
                background: 'var(--paper-2)',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${workloadPct}%`,
                  background:
                    workloadPct > 75
                      ? 'var(--danger, #B83A2E)'
                      : workloadPct > 50
                      ? 'var(--gold, #B8903E)'
                      : 'var(--ok, #5C8C3A)',
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>
          </div>
        )}
        {isIdle && (
          <div
            className="text-2xl"
            style={{
              color: 'var(--ok, #5C8C3A)',
              lineHeight: 1,
              animation: 'loIdleCheck 0.6s ease-out',
            }}
            aria-hidden="true"
          >
            ✓
          </div>
        )}
      </div>

      {/* Boş durum mesajı */}
      {isIdle && (
        <div
          className="text-center py-6 relative z-10"
          style={{
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 14,
          }}
        >
          Yeni sipariş geldiğinde burada anında görünür.
        </div>
      )}

      {/* Akış görselleştirmesi (sadece aktivite varken) */}
      {!isIdle && (
        <>
          <FlowVisualization
            newOrders={live.newOrders}
            preparingOrders={live.preparingOrders}
            readyOrders={live.readyOrders}
          />

          {/* Detay kutuları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 relative z-10">
            <DetailBox
              label="Yeni"
              count={live.newOrders}
              color="var(--accent)"
              icon="📋"
              pulse={live.newOrders > 0}
            />
            <DetailBox
              label="Hazırlanıyor"
              count={live.preparingOrders}
              color="var(--gold, #B8903E)"
              icon="🍳"
            />
            <DetailBox
              label="Hazır"
              count={live.readyOrders}
              color="var(--olive, #5C8C3A)"
              icon="🔔"
              pulse={live.readyOrders > 0}
              urgent={live.readyOrders > 0}
            />
            <DetailBox
              label="Dolu masa"
              count={live.occupiedTables}
              color="var(--super, #4A6FA5)"
              icon="🪑"
            />
          </div>
        </>
      )}

      {/* Garson çağrısı uyarısı */}
      {hasUrgentCalls && (
        <div
          className="mb-4 p-3.5 rounded-[10px] flex items-center gap-2.5 relative z-10"
          style={{
            background:
              'color-mix(in srgb, var(--accent) 10%, var(--card))',
            border:
              '1px solid color-mix(in srgb, var(--accent) 30%, var(--line))',
            animation: 'loCallShake 0.5s ease-out',
          }}
        >
          <PulseDot color="var(--accent)" big />
          <div className="flex-1">
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              Müşteri çağrısı
            </div>
            <div
              className="text-[14px]"
              style={{ color: 'var(--ink)' }}
            >
              <strong>
                {live.pendingWaiterCalls} masa
              </strong>{' '}
              garson bekliyor
            </div>
          </div>
          <Link
            href="/panel/cagrilar"
            className="px-3 h-9 rounded-[10px] flex items-center gap-1 text-[12px] font-semibold transition-all active:scale-95"
            style={{
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'var(--accent)',
              color: '#FAF5EA',
            }}
          >
            Git
            <span>→</span>
          </Link>
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex gap-2 flex-wrap relative z-10">
        <ActionButton
          href="/panel/pos"
          label="POS"
          icon="⌫"
          primary={live.newOrders > 0}
        />
        <ActionButton
          href="/panel/istasyonlar"
          label="İstasyonlar"
          icon="◳"
          primary={live.preparingOrders > 0 || live.readyOrders > 0}
        />
        <ActionButton
          href="/panel/masalar"
          label="Masalar"
          icon="▦"
          primary={false}
        />
      </div>

      <style jsx>{`
        @keyframes loBgPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes loIdleCheck {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes loCallShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// AKIŞ GÖRSELLEŞTİRMESİ — yeni → hazırlanıyor → hazır pipeline
// ============================================================
function FlowVisualization({
  newOrders,
  preparingOrders,
  readyOrders,
}: {
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
}) {
  const total = newOrders + preparingOrders + readyOrders;
  if (total === 0) return null;

  const stages = [
    {
      key: 'new',
      label: 'Yeni',
      count: newOrders,
      color: 'var(--accent)',
    },
    {
      key: 'preparing',
      label: 'Hazırlanıyor',
      count: preparingOrders,
      color: 'var(--gold, #B8903E)',
    },
    {
      key: 'ready',
      label: 'Hazır',
      count: readyOrders,
      color: 'var(--olive, #5C8C3A)',
    },
  ];

  return (
    <div className="mb-5 relative z-10">
      <div
        className="uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--ink-3)',
        }}
      >
        Akış
      </div>

      {/* Bar - oransal */}
      <div
        className="flex items-center rounded-full overflow-hidden gap-[2px]"
        style={{ height: 14, background: 'var(--paper-2)' }}
      >
        {stages.map((s, idx) => {
          if (s.count === 0) return null;
          const widthPct = (s.count / total) * 100;
          return (
            <div
              key={s.key}
              className="h-full"
              style={{
                width: `${widthPct}%`,
                background: s.color,
                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: `loFlowSlide 0.7s ease-out ${idx * 0.08}s both`,
                transformOrigin: 'left',
              }}
              title={`${s.label}: ${s.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        {stages.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block rounded-full flex-shrink-0"
              style={{ width: 7, height: 7, background: s.color }}
            />
            <span
              className="truncate"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10.5,
                fontWeight: 700,
                color: s.count > 0 ? 'var(--ink)' : 'var(--ink-3)',
                letterSpacing: '0.04em',
              }}
            >
              {s.count} {s.label.toLowerCase()}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes loFlowSlide {
          from {
            transform: scaleX(0);
            opacity: 0.4;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// DETAY KUTUSU
// ============================================================
function DetailBox({
  label,
  count,
  color,
  icon,
  pulse,
  urgent,
}: {
  label: string;
  count: number;
  color: string;
  icon: string;
  pulse?: boolean;
  urgent?: boolean;
}) {
  const isActive = count > 0;
  return (
    <div
      className="rounded-[10px] p-3 relative overflow-hidden transition-all"
      style={{
        background: isActive
          ? `color-mix(in srgb, ${color} 8%, var(--card))`
          : 'var(--paper-2)',
        border: `1px solid ${
          urgent && isActive
            ? `color-mix(in srgb, ${color} 40%, var(--line))`
            : isActive
            ? `color-mix(in srgb, ${color} 18%, var(--line))`
            : 'var(--line)'
        }`,
      }}
    >
      {urgent && isActive && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[10px]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
            animation: 'loBoxGlow 2s ease-in-out infinite',
          }}
        />
      )}
      <div className="flex items-center justify-between mb-1.5 relative z-10">
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: isActive ? color : 'var(--ink-3)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            opacity: isActive ? 1 : 0.4,
            filter: isActive ? 'none' : 'grayscale(1)',
          }}
        >
          {icon}
        </span>
      </div>
      <div
        className="flex items-baseline gap-1"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1,
          color: isActive ? 'var(--ink)' : 'var(--ink-3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {count}
        {pulse && isActive && (
          <span
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              marginLeft: 4,
              background: color,
              animation: 'loDot 1.6s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes loDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.4);
          }
        }
        @keyframes loBoxGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// AKSİYON BUTONU
// ============================================================
function ActionButton({
  href,
  label,
  icon,
  primary,
}: {
  href: string;
  label: string;
  icon: string;
  primary: boolean;
}) {
  return (
    <Link
      href={href}
      className="h-10 px-3.5 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.03] active:scale-[0.97]"
      style={{
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: primary ? 'var(--ink)' : 'var(--card)',
        color: primary ? 'var(--paper)' : 'var(--ink)',
        border: `1px solid ${primary ? 'var(--ink)' : 'var(--line)'}`,
        boxShadow: primary
          ? '0 4px 10px rgba(42,31,24,0.12)'
          : 'none',
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span>{label}</span>
      <span style={{ fontSize: 10, opacity: 0.7 }}>→</span>
    </Link>
  );
}

// ============================================================
// PULSE DOT
// ============================================================
function PulseDot({
  color = 'var(--ok, #5C8C3A)',
  big,
}: {
  color?: string;
  big?: boolean;
}) {
  const size = big ? 10 : 8;
  return (
    <span
      className="inline-block relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: color,
          animation: 'loPulseRing 2s ease-out infinite',
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
      />
      <style jsx>{`
        @keyframes loPulseRing {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          70% {
            transform: scale(2.6);
            opacity: 0;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
