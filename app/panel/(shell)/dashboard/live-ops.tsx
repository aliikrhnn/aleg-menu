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

export function LiveOps({ live, realtime }: { live: LiveState; realtime: boolean }) {
  const isIdle = live.activeOrders === 0 && live.pendingWaiterCalls === 0;

  return (
    <div
      className="rounded-[var(--r)] p-6"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <div
            className="uppercase mb-1.5 flex items-center gap-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
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
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {isIdle ? 'Her şey yolunda' : `${live.activeOrders} aktif sipariş`}
          </h2>
        </div>
        {isIdle && (
          <div
            className="text-xl"
            style={{ color: 'var(--ok)', lineHeight: 1 }}
            aria-hidden="true"
          >
            ✓
          </div>
        )}
      </div>

      {/* Durum grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <StatusBox
          label="Yeni"
          count={live.newOrders}
          color="var(--accent)"
          highlight={live.newOrders > 0}
        />
        <StatusBox
          label="Hazırlanıyor"
          count={live.preparingOrders}
          color="var(--gold)"
        />
        <StatusBox
          label="Hazır"
          count={live.readyOrders}
          color="var(--olive)"
          highlight={live.readyOrders > 0}
        />
        <StatusBox
          label="Dolu masa"
          count={live.occupiedTables}
          color="var(--super)"
        />
      </div>

      {/* Garson çağrısı uyarısı */}
      {live.pendingWaiterCalls > 0 && (
        <div
          className="mb-4 p-3 rounded-[10px] flex items-center gap-2"
          style={{
            background: 'color-mix(in srgb, var(--accent) 10%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
          }}
        >
          <PulseDot color="var(--accent)" />
          <div className="flex-1 text-[13px] text-ink">
            <strong>{live.pendingWaiterCalls} garson çağrısı</strong> bekliyor
          </div>
          <Link
            href="/panel/cagrilar"
            className="text-[12px] font-semibold text-accent hover:underline"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            Git ↗
          </Link>
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex gap-2 flex-wrap">
        <ActionButton href="/panel/pos" label="POS" primary={live.newOrders > 0} />
        <ActionButton
          href="/panel/istasyonlar"
          label="İstasyonlar"
          primary={live.preparingOrders > 0 || live.readyOrders > 0}
        />
        <ActionButton
          href="/panel/masalar"
          label="Masalar"
          primary={false}
        />
      </div>
    </div>
  );
}

function StatusBox({
  label,
  count,
  color,
  highlight,
}: {
  label: string;
  count: number;
  color: string;
  highlight?: boolean;
}) {
  const isActive = count > 0;
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: isActive
          ? `color-mix(in srgb, ${color} 8%, var(--card-2))`
          : 'var(--paper-2)',
        border: `1px solid ${
          highlight && isActive
            ? `color-mix(in srgb, ${color} 30%, var(--line))`
            : 'var(--line)'
        }`,
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: isActive ? color : 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1,
          color: isActive ? 'var(--ink)' : 'var(--ink-3)',
        }}
      >
        {count}
      </div>
    </div>
  );
}

function ActionButton({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary: boolean;
}) {
  return (
    <Link
      href={href}
      className="h-10 px-4 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.04em',
        background: primary ? 'var(--ink)' : 'var(--card-2)',
        color: primary ? 'var(--paper)' : 'var(--ink)',
        border: `1px solid ${primary ? 'var(--ink)' : 'var(--line)'}`,
      }}
    >
      {label} <span style={{ fontSize: 10 }}>↗</span>
    </Link>
  );
}

function PulseDot({ color = 'var(--ok)' }: { color?: string }) {
  return (
    <span
      className="inline-block relative"
      style={{ width: 8, height: 8 }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: color,
          animation: 'aleg-pulse-ring 2s ease-out infinite',
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
      />
      <style jsx>{`
        @keyframes aleg-pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          70% {
            transform: scale(2.5);
            opacity: 0;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
