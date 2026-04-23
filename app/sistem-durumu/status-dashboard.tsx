'use client';

import { useEffect, useState } from 'react';

type Status = 'operational' | 'degraded' | 'down';

type ServiceCheck = {
  name: string;
  status: Status;
  latency_ms: number | null;
  message?: string;
};

type HealthData = {
  status: Status;
  checked_at: string;
  services: ServiceCheck[];
};

export function StatusDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Durum alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // her 30sn
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div
        className="not-prose rounded-[var(--r)] p-8 my-6"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="flex items-center gap-3"
          style={{ color: 'var(--ink-3)' }}
        >
          <span
            className="inline-block rounded-full animate-pulse"
            style={{
              width: 10,
              height: 10,
              background: 'var(--ink-3)',
            }}
          />
          <span className="text-sm">Durum kontrol ediliyor...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="not-prose rounded-[var(--r)] p-6 my-6"
        style={{
          background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background:
                'color-mix(in srgb, var(--danger) 18%, transparent)',
              color: 'var(--danger)',
              fontSize: 14,
            }}
          >
            ⚠
          </span>
          <div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 17,
                color: 'var(--ink)',
              }}
            >
              Durum alınamadı
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--ink-2)' }}>
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusLabels: Record<Status, { text: string; color: string; desc: string }> = {
    operational: {
      text: 'Tümü çalışıyor',
      color: 'var(--ok)',
      desc: 'Tüm servisler normal şekilde hizmet veriyor.',
    },
    degraded: {
      text: 'Kısmi yavaşlama',
      color: 'var(--warn)',
      desc: 'Bazı servislerde yavaşlama var. Hizmet devam ediyor.',
    },
    down: {
      text: 'Kesinti var',
      color: 'var(--danger)',
      desc: 'Bir veya daha fazla servis yanıt vermiyor. Çalışıyoruz.',
    },
  };

  const overall = statusLabels[data.status];

  return (
    <div className="not-prose my-6">
      {/* Genel durum */}
      <div
        className="rounded-[var(--r)] p-6 mb-4"
        style={{
          background: `color-mix(in srgb, ${overall.color} 8%, var(--card))`,
          border: `1px solid color-mix(in srgb, ${overall.color} 25%, var(--line))`,
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative"
            style={{
              background: `color-mix(in srgb, ${overall.color} 18%, transparent)`,
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 12,
                height: 12,
                background: overall.color,
                animation:
                  data.status === 'operational'
                    ? 'aleg-pulse 2s ease-in-out infinite'
                    : 'none',
              }}
            />
          </div>
          <div className="flex-1">
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: overall.color,
              }}
            >
              GENEL DURUM
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {overall.text}
            </div>
            <div className="text-sm mt-2" style={{ color: 'var(--ink-2)' }}>
              {overall.desc}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes aleg-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.6; }
          }
        `}</style>
      </div>

      {/* Servis listesi */}
      <div
        className="rounded-[var(--r)] overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        {data.services.map((service, idx) => (
          <ServiceRow
            key={service.name}
            service={service}
            isLast={idx === data.services.length - 1}
          />
        ))}
      </div>

      {/* Son güncelleme */}
      <div
        className="mt-4 flex items-center justify-between flex-wrap gap-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: 'var(--ink-3)',
        }}
      >
        <span>
          SON KONTROL:{' '}
          {lastFetch
            ? lastFetch.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '—'}
        </span>
        <button
          onClick={fetchStatus}
          className="hover:text-ink-2 transition-colors"
          disabled={loading}
        >
          ↻ ŞİMDİ YENİLE
        </button>
      </div>
    </div>
  );
}

function ServiceRow({
  service,
  isLast,
}: {
  service: ServiceCheck;
  isLast: boolean;
}) {
  const colors: Record<Status, string> = {
    operational: 'var(--ok)',
    degraded: 'var(--warn)',
    down: 'var(--danger)',
  };
  const labels: Record<Status, string> = {
    operational: 'Çalışıyor',
    degraded: 'Yavaş',
    down: 'Kesinti',
  };

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-4"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="inline-block rounded-full flex-shrink-0"
          style={{
            width: 8,
            height: 8,
            background: colors[service.status],
          }}
        />
        <div className="min-w-0">
          <div
            className="text-sm font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {service.name}
          </div>
          {service.message && (
            <div
              className="text-xs mt-0.5 truncate"
              style={{ color: 'var(--danger)' }}
            >
              {service.message}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {service.latency_ms !== null && service.latency_ms > 1 && (
          <span
            className="text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-3)',
            }}
          >
            {service.latency_ms}ms
          </span>
        )}
        <span
          className="uppercase text-[10px] px-2 py-1 rounded"
          style={{
            fontFamily: 'var(--f-mono)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            background: `color-mix(in srgb, ${colors[service.status]} 12%, transparent)`,
            color: colors[service.status],
          }}
        >
          {labels[service.status]}
        </span>
      </div>
    </div>
  );
}
