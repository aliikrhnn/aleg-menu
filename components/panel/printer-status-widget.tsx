'use client';

/**
 * Printer Status Widget
 *
 * Panel header'ında sabit küçük ikon. Renk durumu gösterir:
 * - 🟢 ok — yazıcılar bağlı, son iş başarılı
 * - 🟡 warn — pending iş var (işleniyor)
 * - 🔴 danger — son 10dk'da başarısız iş var
 * - ⚫ gray — yazıcı yok veya Bluetooth desteklenmiyor
 *
 * Tıklanınca açılır: son başarısız işler + "Yeniden Dene" butonu.
 */

import { useEffect, useRef, useState } from 'react';
import {
  getPrinterStatus,
  getRecentFailedJobs,
  retryPrintJob,
} from '@/lib/actions/printers';
import { toast } from '@/components/ui/toast';

type PrinterStatus = {
  total_printers: number;
  bluetooth_printers: number;
  network_printers: number;
  pending_jobs: number;
  failed_jobs_10min: number;
  last_success_at: string | null;
};

type FailedJob = {
  id: string;
  job_type: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  printer_name: string | null;
  order_no: string | null;
};

const REFRESH_MS = 15000; // 15 saniyede bir güncelle

export function PrinterStatusWidget() {
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [failed, setFailed] = useState<FailedJob[]>([]);
  const [open, setOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [statusResp, failedResp] = await Promise.all([
      getPrinterStatus(),
      getRecentFailedJobs(),
    ]);
    if (statusResp.success && statusResp.status) setStatus(statusResp.status);
    if (failedResp.success && failedResp.jobs) setFailed(failedResp.jobs);
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, []);

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Status yüklenmediyse veya yazıcı yoksa widget'ı gösterme
  if (!status || status.total_printers === 0) return null;

  const statusKind = getStatusKind(status);
  const statusConfig = getStatusConfig(statusKind);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    const r = await retryPrintJob(jobId);
    setRetryingId(null);
    if (r.success) {
      toast.success('Yazdırma yeniden kuyruğa alındı');
      // Listeyi güncelle
      await load();
    } else {
      toast.error(r.error || 'Yeniden gönderilemedi');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-[8px] transition-all hover:bg-paper-2"
        style={{
          background: 'var(--card)',
          border: `1px solid ${statusConfig.borderColor}`,
        }}
        title={statusConfig.title(status)}
        aria-label="Yazıcı durumu"
        aria-expanded={open}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: statusConfig.dotColor,
            boxShadow: `0 0 8px ${statusConfig.dotColor}`,
          }}
        />
        <span style={{ fontSize: 14, lineHeight: 1 }}>🖨</span>
        {status.failed_jobs_10min > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              minWidth: 18,
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              background: 'var(--danger)',
              color: '#FAF5EA',
              padding: '0 6px',
              fontFamily: 'var(--f-mono)',
            }}
          >
            {status.failed_jobs_10min}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 rounded-[12px] overflow-hidden z-[100]"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: '0 16px 40px -8px rgba(42, 31, 24, 0.3)',
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            animation: 'aleg-dropdown-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: statusConfig.dotColor,
              }}
            >
              YAZICI DURUMU
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--ink)',
              }}
            >
              {statusConfig.headline(status)}
            </div>
            <div
              className="text-xs mt-1.5 flex gap-3 flex-wrap"
              style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}
            >
              <span>
                {status.total_printers} yazıcı
                {status.bluetooth_printers > 0 && ` · ${status.bluetooth_printers} BT`}
                {status.network_printers > 0 && ` · ${status.network_printers} Ağ`}
              </span>
              {status.pending_jobs > 0 && (
                <span style={{ color: 'var(--warn)' }}>
                  ● {status.pending_jobs} bekliyor
                </span>
              )}
            </div>
          </div>

          {/* Failed Jobs */}
          {failed.length > 0 ? (
            <div className="max-h-[320px] overflow-y-auto">
              <div
                className="uppercase px-4 pt-3 pb-1"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-3)',
                }}
              >
                BAŞARISIZ · SON 10DK
              </div>
              <div className="p-2 space-y-1.5">
                {failed.map((j) => (
                  <FailedJobRow
                    key={j.id}
                    job={j}
                    onRetry={() => handleRetry(j.id)}
                    isRetrying={retryingId === j.id}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className="px-4 py-5 text-center"
              style={{
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 13,
              }}
            >
              Son 10 dakikada sorun yok
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes aleg-dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function FailedJobRow({
  job,
  onRetry,
  isRetrying,
}: {
  job: FailedJob;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const timeAgo = formatTimeAgo(job.created_at);
  const jobLabel =
    job.job_type === 'test'
      ? 'Test'
      : job.job_type === 'cashier' || job.job_type === 'reprint_cashier'
        ? 'Hesap'
        : 'Mutfak';

  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-[8px]"
      style={{ background: 'var(--paper-2)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="uppercase text-[9px] px-1.5 py-0.5 rounded"
            style={{
              fontFamily: 'var(--f-mono)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              color: 'var(--danger)',
            }}
          >
            {jobLabel}
          </span>
          {job.order_no && (
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-2)' }}
            >
              #{job.order_no}
            </span>
          )}
          <span
            className="text-xs"
            style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}
          >
            {timeAgo}
          </span>
        </div>
        {job.printer_name && (
          <div
            className="text-xs mt-0.5"
            style={{ color: 'var(--ink-2)', fontWeight: 500 }}
          >
            {job.printer_name}
          </div>
        )}
        {job.error_message && (
          <div
            className="text-xs mt-0.5 leading-snug"
            style={{ color: 'var(--ink-3)' }}
          >
            {job.error_message}
          </div>
        )}
      </div>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="flex-shrink-0 h-7 px-2.5 rounded-[6px] text-[11px] font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.04em',
        }}
        title="Yeniden gönder"
      >
        {isRetrying ? '…' : '↻ DENE'}
      </button>
    </div>
  );
}

function getStatusKind(s: PrinterStatus): 'ok' | 'warn' | 'danger' {
  if (s.failed_jobs_10min > 0) return 'danger';
  if (s.pending_jobs > 0) return 'warn';
  return 'ok';
}

function getStatusConfig(kind: 'ok' | 'warn' | 'danger') {
  switch (kind) {
    case 'ok':
      return {
        dotColor: 'var(--ok)',
        borderColor: 'color-mix(in srgb, var(--ok) 28%, var(--line))',
        headline: (_s: PrinterStatus) => 'Her şey yolunda',
        title: (s: PrinterStatus) =>
          `${s.total_printers} yazıcı aktif · son 10dk sorunsuz`,
      };
    case 'warn':
      return {
        dotColor: 'var(--warn)',
        borderColor: 'color-mix(in srgb, var(--warn) 28%, var(--line))',
        headline: (s: PrinterStatus) =>
          `${s.pending_jobs} iş kuyrukta`,
        title: (s: PrinterStatus) => `${s.pending_jobs} yazdırma işi işleniyor`,
      };
    case 'danger':
      return {
        dotColor: 'var(--danger)',
        borderColor: 'color-mix(in srgb, var(--danger) 32%, var(--line))',
        headline: (s: PrinterStatus) =>
          `${s.failed_jobs_10min} iş başarısız`,
        title: (s: PrinterStatus) =>
          `${s.failed_jobs_10min} yazdırma başarısız · detayı gör`,
      };
  }
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}sn önce`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk önce`;
  const h = Math.floor(min / 60);
  return `${h}s önce`;
}
