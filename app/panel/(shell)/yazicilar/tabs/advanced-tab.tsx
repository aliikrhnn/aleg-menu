'use client';

import { useState, useEffect } from 'react';
import { getRecentPrintJobs, type PrintJob } from '@/lib/actions/printers';
import { getAgents, deleteAgent, type AgentInfo } from '@/lib/actions/agents';
import { getAgentSetupInfo } from '@/lib/actions/agent-setup';
import type { Printer } from '@/lib/actions/printers';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export function AdvancedTab({ printers }: { printers: Printer[] }) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadAgents, 30000); // her 30sn güncelle
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadJobs(), loadAgents()]);
    setLoading(false);
  }

  async function loadJobs() {
    const r = await getRecentPrintJobs(50);
    if (r.success && r.jobs) setJobs(r.jobs);
  }

  async function loadAgents() {
    const r = await getAgents();
    if (r.success && r.agents) setAgents(r.agents);
  }

  async function handleDeleteAgent(id: string) {
    const ok = await confirmDialog({
      title: 'Agent kaydını sil?',
      body: 'Bilgisayardaki agent artık çalışmaz.',
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    const r = await deleteAgent(id);
    if (!r.success) {
      toast.error(r.error || 'Silinemedi');
      return;
    }
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }

  const successCount = jobs.filter((j) => j.status === 'success').length;
  const failCount = jobs.filter((j) => j.status === 'failed').length;
  const pendingCount = jobs.filter((j) => j.status === 'pending').length;
  const hasNetworkPrinter = printers.some((p) => p.connection_type === 'network');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Başarılı" value={successCount} color="var(--ok, #6B8E4E)" />
        <StatCard label="Hatalı" value={failCount} color="var(--danger, #C4553A)" />
        <StatCard
          label="Bekliyor"
          value={pendingCount}
          color="var(--gold, #B08A3E)"
        />
      </div>

      {/* AGENT DURUMU */}
      {(hasNetworkPrinter || agents.length > 0) && (
        <div
          className="rounded-[var(--r)] p-5"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 22,
                  fontWeight: 400,
                }}
              >
                Aleg Agent
              </h3>
              <p className="text-[12px] text-ink-3 mt-0.5">
                Network yazıcılar için kafedeki bilgisayarda çalışan köprü
                yazılımı
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-[var(--paper-2)] transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Kurulum rehberi →
            </button>
          </div>

          {agents.length === 0 ? (
            <div
              className="p-5 rounded-[10px] text-center"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
              }}
            >
              <div className="text-[13px] font-medium" style={{ color: 'var(--ink-2)' }}>
                Henüz agent kurulmamış
              </div>
              <div className="text-[11px] mt-1 mb-3">
                Network yazıcı eklediniz ama hiçbir bilgisayarda agent çalışmıyor.
                Yazdırma işlemleri bekleyecek.
              </div>
              <button
                type="button"
                onClick={() => setShowSetup(true)}
                className="text-[12px] font-semibold px-4 py-2 rounded-[8px] hover:opacity-90 transition-opacity"
                style={{ background: 'var(--accent)', color: '#FAF5EA' }}
              >
                Agent&apos;ı kur ↓
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onDelete={() => handleDeleteAgent(agent.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log listesi */}
      <div
        className="rounded-[var(--r)] overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h3
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Son yazdırmalar
          </h3>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="text-[12px] text-accent hover:underline disabled:opacity-50"
          >
            {loading ? 'Yükleniyor…' : '↻ Yenile'}
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="py-10 text-center text-ink-3 text-sm">
            {loading ? 'Yükleniyor...' : 'Henüz yazdırma kaydı yok'}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Yazıcı bilgileri */}
      <div
        className="rounded-[var(--r)] p-5"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <h3
          className="mb-3"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            fontWeight: 400,
          }}
        >
          Yazıcı durumları
        </h3>
        {printers.length === 0 ? (
          <div className="text-[13px] text-ink-3">Yazıcı tanımlı değil</div>
        ) : (
          <div className="space-y-2">
            {printers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-2 rounded-[8px]"
                style={{ background: 'var(--paper-2)' }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span style={{ fontSize: 14 }}>
                    {p.role === 'cashier' ? '💳' : p.station_icon || '🖨'}
                  </span>
                  <span className="text-[13px] font-semibold truncate">
                    {p.name}
                  </span>
                  {p.role === 'kitchen' && p.station_name && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: `color-mix(in srgb, ${p.station_color || 'var(--accent)'} 15%, transparent)`,
                        color: p.station_color || 'var(--accent)',
                        fontFamily: 'var(--f-mono)',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {p.station_name.toUpperCase()}
                    </span>
                  )}
                </div>
                <div
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: p.is_active
                      ? 'var(--ok, #6B8E4E)'
                      : 'var(--ink-3)',
                  }}
                >
                  {p.is_active ? 'AKTİF' : 'PASİF'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent kurulum modal */}
      {showSetup && <AgentSetupModal onClose={() => setShowSetup(false)} />}
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
      className="rounded-[var(--r)] p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="uppercase mb-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 32,
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

function JobRow({ job }: { job: PrintJob }) {
  const date = new Date(job.created_at);
  const time = `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const typeLabel =
    job.job_type === 'test'
      ? 'TEST'
      : job.job_type === 'cashier'
        ? 'HESAP FİŞİ'
        : job.job_type === 'reprint_cashier'
          ? 'HESAP (tekrar)'
          : job.job_type === 'reprint_kitchen'
            ? 'MUTFAK (tekrar)'
            : 'MUTFAK';

  const statusColor =
    job.status === 'success'
      ? 'var(--ok, #6B8E4E)'
      : job.status === 'failed'
        ? 'var(--danger, #C4553A)'
        : 'var(--gold, #B08A3E)';

  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div
        className="text-[12px] w-14 text-center flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        {isToday ? time : `${date.getDate()}.${date.getMonth() + 1}`}
      </div>

      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: statusColor }}
      />

      <div className="flex-1 min-w-0">
        <div className="text-[13px] flex items-center gap-2 flex-wrap">
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: statusColor,
            }}
          >
            {typeLabel}
          </span>
          {job.order_no && (
            <span className="text-[12px] text-ink-2">#{job.order_no}</span>
          )}
          {job.station_name && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded text-ink-3"
              style={{
                background: 'var(--paper-2)',
                fontFamily: 'var(--f-mono)',
                fontWeight: 600,
              }}
            >
              {job.station_name}
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-3 mt-0.5">
          {job.printer_name || 'Silinmiş yazıcı'}
          {job.error_message && ` · ${job.error_message}`}
        </div>
      </div>

      <div
        className="text-[11px] uppercase flex-shrink-0"
        style={{
          fontFamily: 'var(--f-mono)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: statusColor,
        }}
      >
        {job.status === 'success'
          ? '✓'
          : job.status === 'failed'
            ? '✕'
            : '○'}
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  onDelete,
}: {
  agent: AgentInfo;
  onDelete: () => void;
}) {
  const statusColor = agent.is_online
    ? 'var(--ok, #6B8E4E)'
    : 'var(--danger, #C4553A)';
  const statusLabel = agent.is_online ? 'ÇEVRİMİÇİ' : 'ÇEVRİMDIŞI';

  const seenLabel = agent.seconds_since_seen === null
    ? 'Hiç bağlanmadı'
    : agent.seconds_since_seen < 60
      ? `${agent.seconds_since_seen} sn önce`
      : agent.seconds_since_seen < 3600
        ? `${Math.floor(agent.seconds_since_seen / 60)} dk önce`
        : `${Math.floor(agent.seconds_since_seen / 3600)} sa önce`;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-[10px]"
      style={{
        background: 'var(--paper-2)',
        borderLeft: `3px solid ${statusColor}`,
      }}
    >
      {/* Status dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          background: statusColor,
          boxShadow: agent.is_online
            ? `0 0 8px ${statusColor}`
            : 'none',
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold text-ink truncate">
            {agent.name}
          </span>
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
            style={{
              background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
              color: statusColor,
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            {statusLabel}
          </span>
          {agent.version && (
            <span
              className="text-[10px] text-ink-3"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              v{agent.version}
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>Son görülme: {seenLabel}</span>
          <span>·</span>
          <span>{agent.jobs_processed} iş</span>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="text-[11px] text-ink-3 hover:text-accent px-2 py-1"
        title="Agent kaydını sil"
      >
        Sil
      </button>
    </div>
  );
}

// ============================================================
// AGENT KURULUM MODAL
// ============================================================
function AgentSetupModal({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<{
    business_id: string;
    business_name: string;
    supabase_url: string;
    panel_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgentSetupInfo().then((r) => {
      if (r.success && r.data) setInfo(r.data);
      setLoading(false);
    });
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} kopyalandı`),
      () => toast.error('Kopyalanamadı')
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[var(--r)] overflow-hidden my-8"
        style={{ background: 'var(--card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between"
          style={{
            background:
              'color-mix(in srgb, var(--accent) 6%, var(--card))',
            borderBottom:
              '1px solid color-mix(in srgb, var(--accent) 12%, var(--line))',
          }}
        >
          <div>
            <div
              className="text-accent uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
              }}
            >
              KURULUM REHBERİ
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Aleg Yazıcı Agent
            </h2>
            <p className="text-[13px] text-ink-2 mt-1.5 max-w-sm leading-relaxed">
              Network yazıcılar için kafedeki bilgisayarda çalışan köprü
              yazılımı. 5 dakikada kurulum.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink p-1 -mr-2 -mt-2"
            aria-label="Kapat"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6L18 18M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Adım 1: ZIP indir */}
          <SetupStep
            n={1}
            title="Agent ZIP'ini indir"
            desc="Kafedeki Windows bilgisayara aktar"
          >
            <a
              href="/downloads/aleg-printer-agent.zip"
              download
              className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--r-sm)] font-semibold text-[13px] hover:opacity-90 transition-opacity"
              style={{ background: 'var(--accent)', color: '#FAF5EA' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              aleg-printer-agent.zip indir
            </a>
            <p className="text-[11px] text-ink-3 mt-2">
              ~2 MB · Windows 10/11
            </p>
          </SetupStep>

          {/* Adım 2: Kur */}
          <SetupStep
            n={2}
            title="ZIP'i aç ve kur.bat&apos;ı çalıştır"
            desc="Çift tıkla — wizard açılır"
          >
            <div
              className="p-3 rounded-[8px] text-[12px]"
              style={{ background: 'var(--paper-2)', color: 'var(--ink-2)' }}
            >
              <div className="font-mono">
                aleg-printer-agent\
                <br />
                ├─ kur.bat ← <span className="text-accent">çift tıkla</span>
                <br />
                ├─ baslat.bat
                <br />
                ├─ otomatik-baslat-ekle.bat
                <br />
                └─ README.txt
              </div>
            </div>
          </SetupStep>

          {/* Adım 3: Bilgileri gir */}
          <SetupStep
            n={3}
            title="Wizard&apos;a bu bilgileri yapıştır"
            desc="Bilgisayardaki kurulum sihirbazı 3 şey soracak"
          >
            {loading ? (
              <div className="text-[13px] text-ink-3">Yükleniyor…</div>
            ) : info ? (
              <div className="space-y-2">
                <CredentialRow
                  label="İşletme ID"
                  value={info.business_id}
                  onCopy={() =>
                    copyToClipboard(info.business_id, 'İşletme ID')
                  }
                />
                <CredentialRow
                  label="Supabase URL"
                  value={info.supabase_url}
                  onCopy={() =>
                    copyToClipboard(info.supabase_url, 'Supabase URL')
                  }
                />
                <div
                  className="p-3 rounded-[8px] text-[12px] flex gap-2"
                  style={{
                    background:
                      'color-mix(in srgb, var(--gold, #B08A3E) 10%, var(--card))',
                    border:
                      '1px solid color-mix(in srgb, var(--gold, #B08A3E) 25%, var(--line))',
                    color: 'var(--ink-2)',
                  }}
                >
                  <span className="text-[14px]">⚠</span>
                  <div>
                    <div
                      className="font-semibold mb-0.5"
                      style={{ color: 'var(--ink)' }}
                    >
                      Service Role Key
                    </div>
                    <p className="leading-relaxed">
                      Bu key Supabase Dashboard&apos;dan alınmalı (güvenlik).{' '}
                      <span className="font-mono">
                        Settings → API → service_role
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-danger">
                Bilgiler alınamadı, sayfayı yenile.
              </div>
            )}
          </SetupStep>

          {/* Adım 4: Başlat */}
          <SetupStep
            n={4}
            title="baslat.bat&apos;ı çalıştır"
            desc="Agent başladıktan sonra bu sayfayı yenile — kart görünecek"
          >
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: 'var(--ink-2)' }}
            >
              Otomatik başlatma istersen{' '}
              <span className="font-mono text-[11px]">
                otomatik-baslat-ekle.bat
              </span>{' '}
              çalıştır — Windows açıldığında agent kendiliğinden başlar.
            </p>
          </SetupStep>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <p className="text-[11px] text-ink-3">
            Detaylı kılavuz: ZIP içindeki README.txt
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-[var(--r-sm)] font-semibold text-[13px] hover:bg-[var(--card)] transition-colors"
            style={{ color: 'var(--ink-2)' }}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupStep({
  n,
  title,
  desc,
  children,
}: {
  n: number;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="text-[15px] font-semibold mb-0.5">{title}</div>
        <div className="text-[12px] text-ink-3 mb-3">{desc}</div>
        {children}
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-[8px]"
      style={{ background: 'var(--paper-2)' }}
    >
      <div className="flex-1 min-w-0">
        <div
          className="text-[10px] uppercase mb-0.5"
          style={{
            fontFamily: 'var(--f-mono)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--ink-3)',
          }}
        >
          {label}
        </div>
        <div
          className="font-mono text-[12px] truncate"
          style={{ color: 'var(--ink)' }}
        >
          {value || '—'}
        </div>
      </div>
      <button
        onClick={onCopy}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-[6px] hover:bg-[var(--card)] transition-colors flex-shrink-0"
        style={{ color: 'var(--accent)' }}
      >
        Kopyala
      </button>
    </div>
  );
}
