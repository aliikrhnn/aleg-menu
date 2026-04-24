'use client';

import { useEffect, useState } from 'react';
import {
  getDB,
  retryAllFailed,
  discardFailed,
  type OutboxItem,
} from '@/lib/offline/db';
import { flushOutbox } from '@/lib/offline/sync-worker';
import { confirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SyncPanel({ open, onClose }: Props) {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const db = getDB();
      const all = await db.outbox
        .orderBy('created_at')
        .reverse()
        .limit(50)
        .toArray();
      setItems(all);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleRetryAll = async () => {
    setRefreshing(true);
    await retryAllFailed();
    await flushOutbox();
    await load();
    setRefreshing(false);
  };

  const handleDiscard = async (id: number) => {
    const ok = await confirmDialog({
      title: 'Bu işlemi sil?',
      body: 'Geri alınamaz.',
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    await discardFailed(id);
    await load();
  };

  const handleFlushNow = async () => {
    setRefreshing(true);
    await flushOutbox();
    await load();
    setRefreshing(false);
  };

  if (!open) return null;

  const pending = items.filter((i) => i.status === 'pending');
  const sending = items.filter((i) => i.status === 'sending');
  const failed = items.filter(
    (i) => i.status === 'failed' || i.status === 'conflict'
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-[var(--r)] flex flex-col"
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
          className="px-6 py-5 flex items-start justify-between gap-3"
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
              SENKRONİZASYON
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                fontWeight: 400,
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              Bekleyen işlemler
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--ink-2)' }}
            >
              Offline yapılan işlemler internet gelince otomatik gönderilir.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors flex-shrink-0"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Özet rozetleri */}
        <div
          className="px-6 py-3 flex items-center gap-2 flex-wrap"
          style={{
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <StatusPill
            label="BEKLİYOR"
            count={pending.length}
            color="var(--gold)"
          />
          {sending.length > 0 && (
            <StatusPill
              label="GÖNDERİLİYOR"
              count={sending.length}
              color="var(--super)"
              pulse
            />
          )}
          {failed.length > 0 && (
            <StatusPill
              label="HATA"
              count={failed.length}
              color="var(--danger)"
            />
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleFlushNow}
              disabled={refreshing || items.length === 0}
              className="h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              <span className={refreshing ? 'animate-spin inline-block' : ''}>
                ↻
              </span>
              <span>ŞİMDİ DENE</span>
            </button>
            {failed.length > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={refreshing}
                className="h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-40"
                style={{
                  background: 'var(--accent)',
                  color: '#FAF5EA',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.06em',
                }}
              >
                HATALILARI TEKRAR DENE
              </button>
            )}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-10 text-center">
              <div
                className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'color-mix(in srgb, var(--ok) 12%, transparent)',
                  color: 'var(--ok)',
                  fontSize: 20,
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: 'var(--ink)',
                }}
              >
                Her şey senkronize
              </div>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--ink-3)' }}
              >
                Bekleyen işlem yok. Güzel iş.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {items.map((item) => (
                <OutboxRow
                  key={item.id}
                  item={item}
                  onDiscard={() => handleDiscard(item.id!)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  count,
  color,
  pulse,
}: {
  label: string;
  count: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
          animation: pulse ? 'aleg-pulse-dot 1.5s ease-in-out infinite' : 'none',
        }}
      />
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color,
        }}
      >
        {count} {label}
      </span>

      <style jsx>{`
        @keyframes aleg-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function OutboxRow({
  item,
  onDiscard,
}: {
  item: OutboxItem;
  onDiscard: () => void;
}) {
  const statusColor = {
    pending: 'var(--gold)',
    sending: 'var(--super)',
    sent: 'var(--ok)',
    failed: 'var(--danger)',
    conflict: 'var(--warn)',
  }[item.status];

  const statusLabel = {
    pending: 'BEKLİYOR',
    sending: 'GÖNDERİLİYOR',
    sent: 'GÖNDERİLDİ',
    failed: 'BAŞARISIZ',
    conflict: 'ÇAKIŞMA',
  }[item.status];

  const ago = formatTimeAgo(item.created_at);

  return (
    <div className="px-6 py-3 flex items-start gap-3">
      <span
        className="inline-block rounded-full flex-shrink-0 mt-1.5"
        style={{
          width: 8,
          height: 8,
          background: statusColor,
          animation:
            item.status === 'sending'
              ? 'aleg-pulse-dot 1.5s ease-in-out infinite'
              : 'none',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {item.display_label || item.action}
          </span>
          <span
            className="uppercase px-1.5 py-0.5 rounded"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.14em',
              background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div
          className="text-xs mt-0.5 flex items-center gap-2 flex-wrap"
          style={{ color: 'var(--ink-3)' }}
        >
          <span>{ago}</span>
          {item.attempt_count > 0 && (
            <>
              <span>·</span>
              <span>{item.attempt_count} deneme</span>
            </>
          )}
        </div>
        {item.error_message && (
          <div
            className="text-xs mt-1 px-2 py-1 rounded"
            style={{
              background:
                'color-mix(in srgb, var(--danger) 8%, transparent)',
              color: 'var(--danger)',
            }}
          >
            {item.error_message}
          </div>
        )}
      </div>
      {(item.status === 'failed' || item.status === 'conflict') && (
        <button
          onClick={onDiscard}
          className="text-xs flex-shrink-0 hover:text-danger transition-colors"
          style={{
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
          }}
          title="İşlemi sil"
        >
          VAZGEÇ
        </button>
      )}
    </div>
  );
}

function formatTimeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60000) return 'şimdi';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}dk önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}sa önce`;
  return `${Math.floor(diff / 86400000)}g önce`;
}
