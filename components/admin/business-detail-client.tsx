'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eyebrow,
  SerifTitle,
  Pill,
  LogoTile,
  Money,
  SerifNum,
  Sparkline,
} from '@/components/admin/primitives';
import {
  approveBusiness,
  suspendBusiness,
  restoreBusiness,
  updateBusinessPlan,
  type BusinessDetail,
} from '@/lib/actions/admin-businesses';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
};

type Props = {
  business: BusinessDetail;
  plans: Plan[];
};

const STATUS_LABELS: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' }> = {
  active: { label: 'AKTİF', tone: 'ok' },
  trial: { label: 'TRIAL', tone: 'super' },
  pending_approval: { label: 'ONAY BEKLİYOR', tone: 'gold' },
  past_due: { label: 'GECİKMİŞ', tone: 'warn' },
  suspended: { label: 'ASKIDA', tone: 'danger' },
  cancelled: { label: 'İPTAL', tone: 'muted' },
};

const TABS = [
  { id: 'ozet', label: 'Özet' },
  { id: 'kullanicilar', label: 'Kullanıcılar' },
  { id: 'abonelik', label: 'Abonelik' },
  { id: 'faturalar', label: 'Faturalar' },
  { id: 'aktivite', label: 'Aktivite' },
  { id: 'ayarlar', label: 'Ayarlar' },
] as const;

type TabId = typeof TABS[number]['id'];

function formatDateLong(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatRelative(ts: string | null): string {
  if (!ts) return '—';
  const date = new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHr < 24) return `${diffHr}sa önce`;
  if (diffDay < 7) return `${diffDay}g önce`;
  return formatDateLong(ts);
}

const INVOICE_STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'muted'> = {
  paid: 'ok',
  pending: 'warn',
  failed: 'danger',
  cancelled: 'muted',
  refunded: 'muted',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'ÖDENDİ',
  pending: 'BEKLİYOR',
  failed: 'BAŞARISIZ',
  cancelled: 'İPTAL',
  refunded: 'İADE',
};

export function BusinessDetailClient({ business: b, plans }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('ozet');
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState<null | 'suspend' | 'restore' | 'approve'>(null);
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [chosenPlanId, setChosenPlanId] = useState(b.plan_id || '');
  const [suspendReason, setSuspendReason] = useState('');

  const status = STATUS_LABELS[b.subscription_status] || {
    label: b.subscription_status,
    tone: 'muted' as const,
  };

  const isPaid = b.subscription_status === 'active';
  const mrr = isPaid ? b.plan_price : 0;
  const totalRevenue30d = b.revenue30d.reduce((s, r) => s + r.amount, 0);
  const totalOrders = b.orders_30d;

  const handleApprove = () => {
    startTransition(async () => {
      const r = await approveBusiness(b.id);
      if (r.success) {
        alert('İşletme onaylandı, 14 günlük trial başladı');
        setConfirmOpen(null);
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  const handleSuspend = () => {
    startTransition(async () => {
      const r = await suspendBusiness(b.id, suspendReason || undefined);
      if (r.success) {
        alert('İşletme askıya alındı');
        setConfirmOpen(null);
        setSuspendReason('');
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const r = await restoreBusiness(b.id);
      if (r.success) {
        alert('İşletme geri açıldı');
        setConfirmOpen(null);
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  const handlePlanChange = () => {
    if (!chosenPlanId || chosenPlanId === b.plan_id) {
      setPlanChangeOpen(false);
      return;
    }
    startTransition(async () => {
      const r = await updateBusinessPlan(b.id, chosenPlanId);
      if (r.success) {
        alert('Plan değiştirildi');
        setPlanChangeOpen(false);
        router.refresh();
      } else {
        alert(`Hata: ${r.error}`);
      }
    });
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/admin/api/impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: b.id }),
        });
        const data = await res.json();
        if (data.success) {
          window.open(data.redirectTo, '_blank');
        } else {
          alert(`Hata: ${data.error}`);
        }
      } catch (e) {
        alert(`Hata: ${e instanceof Error ? e.message : 'bilinmeyen'}`);
      }
    });
  };

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto grid gap-5">
      {/* ============== BREADCRUMB ============== */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/isletmeler"
          className="text-ink-3 hover:text-super"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          ← İŞLETMELER
        </Link>
      </div>

      {/* ============== HEADER ============== */}
      <div className="bg-card border border-line rounded-[var(--r)] p-6">
        <div className="flex items-start gap-5 mb-5">
          <LogoTile logo={b.logo} tint="var(--super)" size={64} />
          <div className="flex-1 min-w-0">
            <Eyebrow>İŞLETME · {b.slug.toUpperCase()}</Eyebrow>
            <SerifTitle size={36} className="mt-2">
              {b.name}
            </SerifTitle>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Pill tone={status.tone}>{status.label}</Pill>
              {b.city && (
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  📍 {b.city.toUpperCase()}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                }}
              >
                {b.created_at && `Kayıt: ${formatDateLong(b.created_at)}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {b.subscription_status === 'pending_approval' && (
              <button
                onClick={() => setConfirmOpen('approve')}
                disabled={isPending}
                className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: 'var(--f-sans)' }}
              >
                ✓ Onayla
              </button>
            )}
            <button
              onClick={handleImpersonate}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] border-2 border-super text-super font-semibold text-sm hover:bg-super-soft disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
              title="Bu işletmenin paneline süper admin yetkisiyle gir"
            >
              ↗ Panele gir
            </button>
          </div>
        </div>

        {/* Header metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-line">
          <HeaderMetric label="PLAN" value={b.plan_name || '—'} />
          <HeaderMetric
            label="MRR"
            value={
              <span
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                }}
              >
                {mrr > 0 ? `₺${mrr.toLocaleString('tr-TR')}` : '—'}
              </span>
            }
            tone={mrr > 0 ? 'var(--ink)' : 'var(--ink-3)'}
          />
          <HeaderMetric
            label="SİPARİŞ 30G"
            value={
              <span
                style={{ fontFamily: 'var(--f-mono)', fontWeight: 600 }}
              >
                {totalOrders}
              </span>
            }
          />
          <HeaderMetric
            label="SON GİRİŞ"
            value={
              <span
                style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600 }}
              >
                {formatRelative(b.last_login_at)}
              </span>
            }
            tone={
              !b.last_login_at
                ? 'var(--ink-3)'
                : Date.now() - new Date(b.last_login_at).getTime() > 7 * 24 * 60 * 60 * 1000
                  ? 'var(--warn)'
                  : 'var(--ink)'
            }
          />
        </div>

        {/* Ciro sparkline */}
        {totalRevenue30d > 0 && (
          <div className="mt-5 pt-5 border-t border-line flex items-center justify-between gap-4">
            <div>
              <Eyebrow>SON 30 GÜN CİRO</Eyebrow>
              <Money amount={totalRevenue30d} size={28} />
            </div>
            <Sparkline
              data={b.revenue30d.map((r) => r.amount)}
              stroke="var(--gold)"
              width={300}
              height={60}
              showArea
            />
          </div>
        )}
      </div>

      {/* ============== TAB BAR ============== */}
      <div className="border-b border-line flex items-center gap-1 overflow-x-auto -mx-8 px-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 h-10 text-sm font-medium relative whitespace-nowrap transition-colors"
            style={{
              color: tab === t.id ? 'var(--super)' : 'var(--ink-3)',
              fontFamily: 'var(--f-sans)',
            }}
          >
            {t.label}
            {tab === t.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--super)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ============== TAB CONTENT ============== */}
      {tab === 'ozet' && <TabOzet b={b} />}
      {tab === 'kullanicilar' && <TabKullanicilar b={b} />}
      {tab === 'abonelik' && (
        <TabAbonelik
          b={b}
          mrr={mrr}
          onChangePlan={() => setPlanChangeOpen(true)}
        />
      )}
      {tab === 'faturalar' && <TabFaturalar b={b} />}
      {tab === 'aktivite' && <TabAktivite b={b} />}
      {tab === 'ayarlar' && (
        <TabAyarlar
          b={b}
          onSuspend={() => setConfirmOpen('suspend')}
          onRestore={() => setConfirmOpen('restore')}
        />
      )}

      {/* ============== CONFIRM MODALS ============== */}
      {confirmOpen === 'approve' && (
        <Modal onClose={() => setConfirmOpen(null)} title="İşletmeyi Onayla">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{b.name}</strong> onaylanacak ve <strong>14 günlük trial</strong> başlayacak.
            Sahibi panele giriş yapabilecek.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setConfirmOpen(null)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Onayla'}
            </button>
          </div>
        </Modal>
      )}

      {confirmOpen === 'suspend' && (
        <Modal onClose={() => setConfirmOpen(null)} title="Askıya Al">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{b.name}</strong> askıya alınacak. Üyeler giriş yapamayacak ve menü
            erişimi kapanacak.
          </p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Sebep (opsiyonel)…"
            rows={3}
            className="w-full p-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm resize-none focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => {
                setConfirmOpen(null);
                setSuspendReason('');
              }}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleSuspend}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] text-card text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--warn)', fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Askıya al'}
            </button>
          </div>
        </Modal>
      )}

      {confirmOpen === 'restore' && (
        <Modal onClose={() => setConfirmOpen(null)} title="Geri Aç">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{b.name}</strong> tekrar aktif edilecek.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setConfirmOpen(null)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handleRestore}
              disabled={isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Geri aç'}
            </button>
          </div>
        </Modal>
      )}

      {planChangeOpen && (
        <Modal onClose={() => setPlanChangeOpen(false)} title="Plan Değiştir">
          <p className="text-ink-2 text-sm mb-4">
            <strong>{b.name}</strong> için plan seç:
          </p>
          <div className="grid gap-2">
            {plans.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-[var(--r-sm)] border cursor-pointer hover:bg-paper-2"
                style={{
                  borderColor:
                    chosenPlanId === p.id ? 'var(--super)' : 'var(--line)',
                  background:
                    chosenPlanId === p.id ? 'var(--super-soft)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={chosenPlanId === p.id}
                  onChange={(e) => setChosenPlanId(e.target.value)}
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm">
                    {p.name} {p.id === b.plan_id && <span className="text-ink-3 text-xs">(mevcut)</span>}
                  </div>
                  <div className="text-ink-3 text-xs">
                    Aylık ₺{p.price_monthly.toLocaleString('tr-TR')}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setPlanChangeOpen(false)}
              className="h-9 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Vazgeç
            </button>
            <button
              onClick={handlePlanChange}
              disabled={!chosenPlanId || chosenPlanId === b.plan_id || isPending}
              className="h-9 px-4 rounded-[var(--r-sm)] bg-super text-card text-sm font-semibold disabled:opacity-50"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              {isPending ? 'İşleniyor…' : 'Değiştir'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================
// HEADER METRIC
// ============================================================
function HeaderMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div
        className="mt-1 truncate"
        style={{
          color: tone || 'var(--ink)',
          fontSize: 18,
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// TAB 1: ÖZET
// ============================================================
function TabOzet({ b }: { b: BusinessDetail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sol — temel bilgi */}
      <div className="lg:col-span-2 grid gap-4">
        <Card title="İletişim Bilgileri">
          <Row label="E-POSTA" value={b.email || '—'} mono />
          <Row label="TELEFON" value={b.phone || '—'} mono />
          <Row label="ŞEHİR" value={b.city || '—'} />
          <Row label="SLUG" value={b.slug} mono />
        </Card>

        <Card title="Sahibi">
          <Row label="AD SOYAD" value={b.owner_name || '—'} />
          <Row label="E-POSTA" value={b.owner_email || '—'} mono />
          <Row label="SON GİRİŞ" value={formatRelative(b.last_login_at)} mono />
        </Card>
      </div>

      {/* Sağ — son aktivite önizlemesi */}
      <div className="grid gap-4">
        <Card title="Son Aktivite">
          {b.recentActivity.length === 0 ? (
            <div className="text-ink-3 text-sm py-4 text-center">
              Henüz aktivite yok.
            </div>
          ) : (
            <div className="grid gap-2.5">
              {b.recentActivity.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      width: 36,
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {a.age}
                  </span>
                  <div className="text-xs text-ink-2 leading-relaxed">
                    <strong className="text-ink">{a.actor}</strong> · {a.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: KULLANICILAR
// ============================================================
function TabKullanicilar({ b }: { b: BusinessDetail }) {
  if (b.members.length === 0) {
    return (
      <Card title="Kullanıcılar">
        <div className="py-12 text-center text-ink-3">
          <div className="text-2xl mb-2">○</div>
          <div className="text-sm">Henüz başka kullanıcı eklenmemiş.</div>
          <div className="text-xs mt-2">
            Detaylı kullanıcı yönetimi yakında.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Kullanıcılar">
      <div className="grid gap-2">
        {b.members.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center gap-3 p-3 rounded-[var(--r-sm)] border border-line"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: m.is_owner ? 'var(--super)' : 'var(--paper-3)',
                color: m.is_owner ? 'var(--card)' : 'var(--ink)',
                fontFamily: 'var(--f-sans)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {(m.full_name || m.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {m.full_name || '(isim yok)'}
              </div>
              <div
                className="text-xs text-ink-3 truncate"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {m.email || m.user_id}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {m.is_owner && <Pill tone="super">SAHİP</Pill>}
              {!m.is_owner && m.role_name && (
                <Pill tone="muted">{m.role_name.toUpperCase()}</Pill>
              )}
              <div
                className="text-xs text-ink-3 mt-1"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {formatRelative(m.last_sign_in_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-line text-xs text-ink-3 text-center">
        Detaylı kullanıcı yönetimi (rol değiştirme, davet, çıkarma) yakında.
      </div>
    </Card>
  );
}

// ============================================================
// TAB 3: ABONELİK
// ============================================================
function TabAbonelik({
  b,
  mrr,
  onChangePlan,
}: {
  b: BusinessDetail;
  mrr: number;
  onChangePlan: () => void;
}) {
  const trialDaysLeft = b.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(b.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card
        title={`Mevcut Plan: ${b.plan_name || 'Yok'}`}
        action={
          <button
            onClick={onChangePlan}
            className="h-8 px-3 rounded-[var(--r-sm)] border border-super text-super text-xs font-semibold hover:bg-super-soft"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            Plan değiştir
          </button>
        }
      >
        <div className="grid gap-3 py-2">
          <div>
            <Eyebrow>AYLIK ÜCRET</Eyebrow>
            <Money amount={b.plan_price} size={36} />
          </div>
          <div>
            <Eyebrow>ŞU AN MRR</Eyebrow>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                color: mrr > 0 ? 'var(--ok)' : 'var(--ink-3)',
              }}
            >
              {mrr > 0
                ? `₺${mrr.toLocaleString('tr-TR')} / ay`
                : 'Henüz ödeme yapmıyor'}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Trial Durumu">
        {b.subscription_status === 'trial' ? (
          <>
            <Row label="DURUM" value="Trial dönemde" />
            {b.trial_ends_at && (
              <>
                <Row
                  label="BİTİYOR"
                  value={formatDateLong(b.trial_ends_at)}
                />
                <div className="mt-3 p-3 rounded-[var(--r-sm)] bg-paper-2">
                  <div
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      color: trialDaysLeft <= 3 ? 'var(--warn)' : 'var(--super)',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    KALAN SÜRE
                  </div>
                  <SerifNum
                    size={32}
                    tone={trialDaysLeft <= 3 ? 'var(--warn)' : 'var(--ink)'}
                  >
                    {trialDaysLeft} gün
                  </SerifNum>
                </div>
              </>
            )}
          </>
        ) : (
          <Row label="DURUM" value="Trial değil" />
        )}
        {b.approved_at && (
          <Row label="ONAY TARİHİ" value={formatDateLong(b.approved_at)} />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// TAB 4: FATURALAR
// ============================================================
function TabFaturalar({ b }: { b: BusinessDetail }) {
  if (b.recentInvoices.length === 0) {
    return (
      <Card title="Faturalar">
        <div className="py-12 text-center text-ink-3">
          <div className="text-2xl mb-2">○</div>
          <div className="text-sm">Henüz fatura kesilmedi.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Son 10 Fatura">
      <div className="grid gap-2 mt-2">
        {b.recentInvoices.map((inv) => (
          <div
            key={inv.id}
            className="grid items-center gap-3 p-3 rounded-[var(--r-sm)] border border-line"
            style={{ gridTemplateColumns: '1fr auto auto' }}
          >
            <div className="min-w-0">
              <div
                className="font-semibold text-sm"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {inv.invoice_no}
              </div>
              <div className="text-xs text-ink-3">
                {inv.status === 'paid' && inv.paid_at
                  ? `Ödendi: ${formatDateLong(inv.paid_at)}`
                  : `Vade: ${formatDateLong(inv.due_at)}`}
              </div>
            </div>
            <Pill tone={INVOICE_STATUS_TONE[inv.status] || 'muted'}>
              {INVOICE_STATUS_LABEL[inv.status] || inv.status.toUpperCase()}
            </Pill>
            <div className="text-right">
              <span
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                }}
              >
                ₺{inv.amount.toLocaleString('tr-TR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// TAB 5: AKTİVİTE
// ============================================================
function TabAktivite({ b }: { b: BusinessDetail }) {
  if (b.recentActivity.length === 0) {
    return (
      <Card title="Aktivite Geçmişi">
        <div className="py-12 text-center text-ink-3">
          <div className="text-2xl mb-2">○</div>
          <div className="text-sm">Henüz aktivite yok.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Son 15 Aktivite">
      <div className="grid gap-2 mt-2">
        {b.recentActivity.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-3 p-3 rounded-[var(--r-sm)] hover:bg-paper-2 transition-colors"
          >
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                color: 'var(--ink-3)',
                width: 50,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {a.age}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink">
                <strong>{a.actor}</strong> ·{' '}
                <span className="text-ink-2">{a.action}</span>
              </div>
              {a.target_label && (
                <div
                  className="text-xs text-ink-3 mt-0.5"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {a.target_label}
                </div>
              )}
            </div>
            <Pill
              tone={
                ['ok', 'warn', 'danger', 'super', 'muted', 'gold', 'olive'].includes(
                  a.tone,
                )
                  ? (a.tone as 'ok' | 'warn' | 'danger' | 'super' | 'muted' | 'gold' | 'olive')
                  : 'muted'
              }
            >
              {a.action.split('.')[0]}
            </Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// TAB 6: AYARLAR
// ============================================================
function TabAyarlar({
  b,
  onSuspend,
  onRestore,
}: {
  b: BusinessDetail;
  onSuspend: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="grid gap-4">
      <Card title="İşletme Yönetimi">
        <div className="grid gap-3 py-2">
          {b.subscription_status === 'suspended' ? (
            <ActionRow
              label="Geri Aç"
              description="İşletmeyi tekrar aktif et — sahibi panele girebilir."
              btnLabel="Geri aç"
              btnTone="ok"
              onClick={onRestore}
            />
          ) : (
            <ActionRow
              label="Askıya Al"
              description="İşletmenin platformdaki erişimi kapatılır. Üyeler giriş yapamaz, müşteriler menüye ulaşamaz."
              btnLabel="Askıya al"
              btnTone="warn"
              onClick={onSuspend}
              disabled={b.subscription_status === 'pending_approval'}
            />
          )}
          {b.suspended_at && (
            <div className="p-3 rounded-[var(--r-sm)] bg-paper-2">
              <Eyebrow tone="danger">ASKI BİLGİSİ</Eyebrow>
              <div className="text-sm mt-2">
                {formatDateLong(b.suspended_at)} tarihinde askıya alındı.
              </div>
              {b.suspended_reason && (
                <div className="mt-2 pt-2 border-t border-line">
                  <div
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    SEBEP
                  </div>
                  <div className="text-sm text-ink-2 mt-1">
                    {b.suspended_reason}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="Tehlikeli Bölge">
        <div
          className="p-4 rounded-[var(--r-sm)]"
          style={{
            background: 'color-mix(in oklab, var(--danger) 5%, transparent)',
            border: '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
          }}
        >
          <Eyebrow tone="danger">DİKKAT</Eyebrow>
          <div className="text-sm mt-2 text-ink-2">
            İşletme silme işlemi henüz aktif değil. İhtiyaç olunca eklenecek.
            Şimdilik askıya alıp <code className="text-xs bg-paper-3 px-1 rounded">cancelled</code> durumuna getirebilirsiniz.
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Eyebrow>BİLGİ</Eyebrow>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 20,
              fontWeight: 400,
              marginTop: 2,
            }}
          >
            {title}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid items-center gap-3 py-2 border-b border-line last:border-0"
      style={{ gridTemplateColumns: '120px 1fr' }}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        className="text-sm truncate"
        style={{
          fontFamily: mono ? 'var(--f-mono)' : 'var(--f-sans)',
          color: 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionRow({
  label,
  description,
  btnLabel,
  btnTone,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  btnLabel: string;
  btnTone: 'ok' | 'warn' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}) {
  const colorMap = {
    ok: 'var(--ok)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
  };
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <p className="text-xs text-ink-3 mt-1">{description}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="h-9 px-4 rounded-[var(--r-sm)] border text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        style={{
          fontFamily: 'var(--f-sans)',
          borderColor: colorMap[btnTone],
          color: colorMap[btnTone],
          background: 'var(--card)',
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-[var(--r)] p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <Eyebrow>İŞLEM</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              marginTop: 4,
            }}
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  );
}
