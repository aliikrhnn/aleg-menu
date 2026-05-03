'use client';

/**
 * POS Topbar (Sadeleştirilmiş)
 *
 * Değişiklikler:
 * - Kasa aç/kapat butonu KALDIRILDI (Kasa sekmesine taşındı)
 * - Z-Rapor butonu KALDIRILDI (Kasa sekmesine taşındı)
 * - Kasa oturum detay satırı (açılış/nakit/beklenen) KALDIRILDI
 * - ZReportModal import KALDIRILDI
 * - CashSessionModal import KALDIRILDI
 * - useState'ler azaltıldı (session, cashModal, zModal, loading GITTI)
 *
 * Kalanlar:
 * - Başlık "Siparişler" (eskiden "Kasa")
 * - Çevrimiçi/çevrimdışı durum rozeti
 * - Bekleyen sync rozeti (tıklanınca SyncPanel)
 * - Dev menü (offline simülasyonu)
 * - Offline uyarı banner'ı
 */

import { useState } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { SyncPanel } from './sync-panel';

type Props = {
  onRefresh: () => void;
  pendingSyncCount: number;
};

export function PosTopbar({ onRefresh, pendingSyncCount }: Props) {
  const { status, simulating, toggleSimulate } = useOnlineStatus();
  const [syncModal, setSyncModal] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);

  // Dev menu ESC ile kapansın
  useEscapeKey(() => setShowDevMenu(false), showDevMenu);

  const statusLabel = {
    online: 'ÇEVRİMİÇİ',
    offline: 'ÇEVRİMDIŞI',
    'simulated-offline': 'TEST: OFFLINE',
  }[status];

  const statusColor = {
    online: 'var(--ok)',
    offline: 'var(--danger)',
    'simulated-offline': 'var(--gold)',
  }[status];

  return (
    <>
      <div
        className="rounded-[var(--r)] overflow-hidden mb-4"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
              }}
            >
              Siparişler
            </h1>

            {/* Bağlantı durumu */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: `color-mix(in srgb, ${statusColor} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: statusColor,
                  animation:
                    status === 'online'
                      ? 'aleg-pulse-dot 2s ease-in-out infinite'
                      : 'none',
                }}
              />
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: statusColor,
                }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Bekleyen sync */}
            {pendingSyncCount > 0 && (
              <button
                onClick={() => setSyncModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: 'color-mix(in srgb, var(--warn) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--warn) 25%, transparent)',
                }}
                title="Senkronizasyon detaylarını göster"
              >
                <span
                  style={{ color: 'var(--warn)', fontSize: 11 }}
                  className="inline-block animate-spin-slow"
                >
                  ↻
                </span>
                <span
                  className="uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: 'var(--warn)',
                  }}
                >
                  {pendingSyncCount} BEKLİYOR
                </span>
              </button>
            )}
          </div>

          {/* Sağ: Dev menü (ve gelecekte başka küçük aksiyonlar) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="h-9 w-9 rounded-[8px] text-sm flex items-center justify-center transition-all hover:bg-paper-2"
              style={{
                color: 'var(--ink-2)',
                border: '1px solid var(--line)',
              }}
              title="Yenile"
              aria-label="Yenile"
            >
              ↻
            </button>

            {/* Dev menü */}
            <div className="relative">
              <button
                onClick={() => setShowDevMenu((v) => !v)}
                className="h-9 w-9 rounded-[8px] text-sm flex items-center justify-center transition-all hover:bg-paper-2"
                style={{
                  color: 'var(--ink-3)',
                  border: '1px solid var(--line)',
                }}
                title="Geliştirici menüsü"
                aria-label="Geliştirici ayarları"
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
                    className="absolute top-11 right-0 z-[51] w-64 rounded-[10px] p-2 shadow-lg"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div
                      className="uppercase px-2 py-1 mb-1"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: 'var(--ink-3)',
                      }}
                    >
                      GELİŞTİRİCİ
                    </div>
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
        </div>

        {/* Offline uyarı banner'ı */}
        {status !== 'online' && (
          <div
            className="px-5 py-2.5 flex items-start gap-2.5"
            style={{
              background: 'color-mix(in srgb, var(--warn) 14%, var(--card))',
              borderTop: '1px solid color-mix(in srgb, var(--warn) 25%, var(--line))',
              color: 'var(--warn)',
            }}
          >
            <span>⚠</span>
            <div className="text-sm flex-1">
              <strong>
                {status === 'simulated-offline'
                  ? 'Offline simülasyon aktif.'
                  : 'Bağlantı yok.'}
              </strong>{' '}
              Ödemeler cihaza kaydedilir, bağlantı gelince otomatik
              senkronize olur.
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes aleg-pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.5; }
          }
        `}</style>
      </div>

      <SyncPanel open={syncModal} onClose={() => setSyncModal(false)} />
    </>
  );
}
