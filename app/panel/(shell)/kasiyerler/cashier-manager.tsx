'use client';

import { useState, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  createCashier,
  updateCashier,
  deleteCashier,
  permanentDeleteCashier,
  changePin,
  listCashiers,
  type Cashier,
  type CashierRole,
} from '@/lib/actions/cashiers';

type Props = {
  initialCashiers: Cashier[];
  error: string | null;
};

const COLORS = [
  '#C4553A', '#B08A3E', '#6B7A4B', '#4F7C4C',
  '#5A6B7E', '#8E5A8C', '#C08080', '#737373',
];

const EMOJIS = ['👤', '👨‍🍳', '👩‍🍳', '☕', '🧑', '🧑‍💼', '🙂', '⭐', '🌟', '🎯'];

export function CashierManager({ initialCashiers, error: initialError }: Props) {
  const [cashiers, setCashiers] = useState<Cashier[]>(initialCashiers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Cashier | null>(null);
  const [changingPin, setChangingPin] = useState<Cashier | null>(null);

  const reload = async () => {
    const r = await listCashiers();
    if (r.success && r.cashiers) setCashiers(r.cashiers);
  };

  const activeCashiers = cashiers.filter((c) => c.is_active);
  const inactiveCashiers = cashiers.filter((c) => !c.is_active);

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div
            className="uppercase mb-2 flex items-center gap-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--accent)',
            }}
          >
            <span
              style={{ width: 24, height: 1, background: 'var(--accent)', display: 'inline-block' }}
            />
            EKİP · KASİYER HESAPLARI
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 'clamp(32px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              color: 'var(--ink)',
            }}
          >
            Kasiyer & Garson{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
              hesapları.
            </span>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--ink-2)', maxWidth: 540 }}>
            Kasa ve garson uygulamalarına giriş yapacak kişilere hesap aç. Her kişinin
            kendi PIN&apos;i olur, rolüne göre uygun ekrana erişebilir.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="group h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
            boxShadow: '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
          }}
        >
          <span>+</span>
          <span>Yeni Hesap</span>
        </button>
      </div>

      {initialError && (
        <div
          className="mb-4 p-3 rounded-[10px] text-sm"
          style={{
            background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
            border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
            color: 'var(--danger)',
          }}
        >
          {initialError}
        </div>
      )}

      {/* Kasa linki ipucu */}
      <div
        className="mb-6 rounded-[var(--r)] p-4 flex items-start gap-3"
        style={{
          background: 'color-mix(in srgb, var(--accent) 5%, var(--card))',
          border: '1px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
        }}
      >
        <span
          className="flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
            color: 'var(--accent)',
          }}
        >
          ◆
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Kasa uygulaması
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
            Kafe tabletinde{' '}
            <code
              className="px-1.5 py-0.5 rounded text-[11px]"
              style={{ background: 'var(--paper-2)', fontFamily: 'var(--f-mono)' }}
            >
              /kasa
            </code>{' '}
            adresini aç. Kasiyer kartına tıkla → PIN gir → ödeme almaya başla.
          </div>
        </div>
        <a
          href="/kasa"
          target="_blank"
          rel="noopener"
          className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02] flex-shrink-0"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--ink-2)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
          }}
        >
          KASA&apos;YI AÇ ↗
        </a>
      </div>

      {/* Aktif kasiyerler */}
      {activeCashiers.length === 0 && inactiveCashiers.length === 0 ? (
        <EmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <>
          <SectionHeading
            label="AKTİF"
            count={activeCashiers.length}
            color="var(--ok)"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {activeCashiers.map((c) => (
              <CashierCard
                key={c.id}
                cashier={c}
                onEdit={() => setEditing(c)}
                onChangePin={() => setChangingPin(c)}
                onDelete={async () => {
                  const ok = await confirmDialog({
                    title: `"${c.display_name}" kasiyerini pasif yap?`,
                    body: 'Bu kasiyer artık kasaya giriş yapamaz. Geçmiş verileri korunur.',
                    tone: 'warn',
                    confirmLabel: 'Pasif Yap',
                  });
                  if (!ok) return;
                  await deleteCashier(c.id);
                  reload();
                }}
              />
            ))}
          </div>

          {inactiveCashiers.length > 0 && (
            <>
              <SectionHeading
                label="PASİF"
                count={inactiveCashiers.length}
                color="var(--ink-3)"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inactiveCashiers.map((c) => (
                  <CashierCard
                    key={c.id}
                    cashier={c}
                    inactive
                    onEdit={() => setEditing(c)}
                    onChangePin={() => setChangingPin(c)}
                    onReactivate={async () => {
                      await updateCashier(c.id, { isActive: true });
                      reload();
                    }}
                    onPermanentDelete={async () => {
                      const ok = await confirmDialog({
                        title: `"${c.display_name}" kalıcı silinsin mi?`,
                        body: 'Bu işlem GERİ ALINAMAZ. Kasiyer DB\'den tamamen kaldırılacak. Geçmiş siparişler ve ödemeler korunur ancak kasiyer adı yerine boş görünür.',
                        tone: 'danger',
                        confirmLabel: 'Kalıcı Sil',
                      });
                      if (!ok) return;
                      const result = await permanentDeleteCashier(c.id);
                      if (!result.success) {
                        alert(result.error || 'Silinemedi');
                        return;
                      }
                      reload();
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      {createOpen && (
        <CashierFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            reload();
          }}
        />
      )}
      {editing && (
        <CashierFormModal
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {changingPin && (
        <ChangePinModal
          cashier={changingPin}
          onClose={() => setChangingPin(null)}
          onSuccess={() => setChangingPin(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function SectionHeading({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="uppercase"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color,
        }}
      >
        {label} · {count}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  );
}

function CashierCard({
  cashier,
  inactive,
  onEdit,
  onChangePin,
  onDelete,
  onReactivate,
  onPermanentDelete,
}: {
  cashier: Cashier;
  inactive?: boolean;
  onEdit: () => void;
  onChangePin: () => void;
  onDelete?: () => void;
  onReactivate?: () => void;
  onPermanentDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const lastUsed = cashier.last_used_at
    ? formatTimeAgo(new Date(cashier.last_used_at))
    : 'henüz giriş yapmamış';

  return (
    <div
      className="rounded-[var(--r)] overflow-hidden relative transition-all"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        opacity: inactive ? 0.6 : 1,
      }}
    >
      {/* Renkli üst bant */}
      <div style={{ height: 4, background: cashier.color }} />

      <div className="p-4 flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${cashier.color} 16%, var(--card))`,
            border: `1px solid color-mix(in srgb, ${cashier.color} 30%, transparent)`,
            fontSize: 22,
          }}
        >
          {cashier.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {cashier.display_name}
            </span>
            {/* Rol badge - her zaman göster */}
            {cashier.role === 'waiter' && (
              <Badge label="GARSON" color="var(--ok)" />
            )}
            {cashier.role === 'both' && (
              <Badge label="HER İKİSİ" color="var(--accent)" />
            )}
            {cashier.role === 'cashier' && (
              <Badge label="KASİYER" color="var(--super)" />
            )}
            {cashier.can_close_day && (
              <Badge label="GÜN KAPATIR" color="var(--gold)" />
            )}
            {cashier.can_refund && <Badge label="İADE" color="var(--super)" />}
          </div>
          <div
            className="text-xs mt-0.5 flex items-center gap-2 flex-wrap"
            style={{ color: 'var(--ink-3)' }}
          >
            <span>{lastUsed}</span>
            {(cashier.total_payments ?? 0) > 0 && (
              <>
                <span>·</span>
                <span>
                  Bugün {cashier.total_payments} ödeme · {fmt(cashier.total_amount || 0)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Menü */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-paper-2 transition-colors"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Menü"
          >
            ⋯
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-[50]"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-9 z-[51] w-44 rounded-[10px] py-1 shadow-lg"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
                }}
              >
                <MenuItem
                  label="Düzenle"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                />
                <MenuItem
                  label="PIN değiştir"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangePin();
                  }}
                />
                {inactive ? (
                  <>
                    {onReactivate && (
                      <MenuItem
                        label="Aktif yap"
                        onClick={() => {
                          setMenuOpen(false);
                          onReactivate();
                        }}
                        color="var(--ok)"
                      />
                    )}
                    {onPermanentDelete && (
                      <MenuItem
                        label="Kalıcı sil"
                        onClick={() => {
                          setMenuOpen(false);
                          onPermanentDelete();
                        }}
                        color="var(--danger)"
                      />
                    )}
                  </>
                ) : (
                  onDelete && (
                    <MenuItem
                      label="Pasif yap"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      color="var(--danger)"
                    />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  color,
}: {
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-sm hover:bg-paper-2 transition-colors"
      style={{ color: color || 'var(--ink-2)' }}
    >
      {label}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="uppercase px-1.5 py-0.5 rounded"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.12em',
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-[var(--r)] p-12 text-center"
      style={{
        background: 'var(--card)',
        border: '1px dashed var(--line-2)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          color: 'var(--accent)',
          fontSize: 24,
        }}
      >
        👤
      </div>
      <h3
        className="mb-2"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--ink)',
        }}
      >
        Henüz kasiyer yok
      </h3>
      <p className="text-sm mb-5" style={{ color: 'var(--ink-2)', maxWidth: 400, margin: '0 auto 20px' }}>
        Kasa uygulamasına giriş yapabilmesi için en az bir kasiyer ekle.
      </p>
      <button
        onClick={onCreate}
        className="h-11 px-5 rounded-[10px] font-semibold text-sm transition-all hover:opacity-95 active:scale-[0.99]"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
        }}
      >
        + Yeni Kasiyer
      </button>
    </div>
  );
}

// ============================================================
// CREATE/EDIT FORM MODAL
// ============================================================

function CashierFormModal({
  mode,
  initial,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  initial?: Cashier;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initial?.display_name || '');
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [emoji, setEmoji] = useState(initial?.emoji || EMOJIS[0]);
  const [role, setRole] = useState<CashierRole>(initial?.role || 'cashier');
  const [canCloseDay, setCanCloseDay] = useState(initial?.can_close_day || false);
  const [canRefund, setCanRefund] = useState(initial?.can_refund || false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ESC ile kapama
  useEscapeKey(onClose, !pending);

  const handleSubmit = () => {
    setError(null);

    if (mode === 'create') {
      if (!pin || !pinConfirm) {
        setError('PIN alanlarını doldur');
        return;
      }
      if (pin !== pinConfirm) {
        setError('PIN\'ler eşleşmiyor');
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        setError('PIN 6 haneli sayı olmalı');
        return;
      }
    }

    startTransition(async () => {
      if (mode === 'create') {
        const r = await createCashier({
          displayName: name,
          pin,
          color,
          emoji,
          role,
          canCloseDay,
          canRefund,
        });
        if (!r.success) {
          setError(r.error || 'Hata');
          return;
        }
        onSuccess();
      } else if (initial) {
        const r = await updateCashier(initial.id, {
          displayName: name,
          color,
          emoji,
          role,
          canCloseDay,
          canRefund,
        });
        if (!r.success) {
          setError(r.error || 'Hata');
          return;
        }
        onSuccess();
      }
    });
  };

  return (
    <ModalShell
      onClose={onClose}
      title={
        mode === 'create'
          ? 'Yeni Hesap'
          : `${initial?.display_name || 'Hesap'} · Düzenle`
      }
    >
      <div className="px-6 py-5 space-y-4">
        {/* Görünüm preview */}
        <div
          className="flex items-center gap-3 p-3 rounded-[10px]"
          style={{
            background: `color-mix(in srgb, ${color} 6%, var(--paper-2))`,
            border: `1px solid color-mix(in srgb, ${color} 20%, var(--line))`,
          }}
        >
          <div
            className="w-12 h-12 rounded-[10px] flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${color} 16%, var(--card))`,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              fontSize: 22,
            }}
          >
            {emoji}
          </div>
          <div className="text-sm">
            <div style={{ color: 'var(--ink-3)' }}>Önizleme</div>
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>
              {name || 'Kasiyer adı'}
            </div>
          </div>
        </div>

        {/* İsim */}
        <FormField label="AD" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ör: Ayşe, Kasa 1, Gündüz Vardiyası"
            autoFocus
            className="w-full h-11 px-3 rounded-[10px] bg-paper-2 border border-line focus:outline-none focus:border-accent transition-colors"
            style={{ fontFamily: 'var(--f-sans)', fontSize: 14, color: 'var(--ink)' }}
          />
        </FormField>

        {/* Renk */}
        <FormField label="RENK">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full transition-all"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 0 3px var(--paper), 0 0 0 5px ${c}` : 'none',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </FormField>

        {/* Emoji */}
        <FormField label="EMOJİ">
          <div className="flex gap-1.5 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-[8px] flex items-center justify-center transition-all text-xl"
                style={{
                  background: emoji === e ? 'var(--paper-2)' : 'transparent',
                  border: `1px solid ${emoji === e ? color : 'var(--line)'}`,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </FormField>

        {/* Rol seçimi - hesap tipi */}
        <FormField label="ROL">
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { id: 'cashier', label: 'Kasiyer', icon: '₺', desc: 'Sadece kasa' },
              { id: 'waiter', label: 'Garson', icon: '⌬', desc: 'Sadece servis' },
              { id: 'both', label: 'Her İkisi', icon: '◆', desc: 'Kasa + servis' },
            ] as Array<{ id: CashierRole; label: string; icon: string; desc: string }>).map(
              (r) => {
                const isSel = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className="p-3 rounded-[10px] flex flex-col items-center gap-1 transition-all active:scale-[0.97]"
                    style={{
                      background: isSel
                        ? 'color-mix(in srgb, var(--accent) 10%, var(--paper))'
                        : 'var(--paper-2)',
                      border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--line)'}`,
                      boxShadow: isSel
                        ? '0 2px 8px -2px color-mix(in srgb, var(--accent) 28%, transparent)'
                        : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        color: isSel ? 'var(--accent)' : 'var(--ink-2)',
                        lineHeight: 1,
                      }}
                    >
                      {r.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSel ? 'var(--ink)' : 'var(--ink-2)',
                      }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        fontFamily: 'var(--f-mono)',
                        letterSpacing: '0.04em',
                        textAlign: 'center',
                      }}
                    >
                      {r.desc}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </FormField>

        {/* PIN (sadece create) */}
        {mode === 'create' && (
          <>
            <FormField label="PIN (6 HANE)" required>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-[10px] bg-paper-2 border border-line focus:outline-none focus:border-accent transition-colors"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 16,
                  letterSpacing: '0.3em',
                  color: 'var(--ink)',
                }}
              />
            </FormField>
            <FormField label="PIN (TEKRAR)" required>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full h-11 px-3 rounded-[10px] bg-paper-2 border border-line focus:outline-none focus:border-accent transition-colors"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 16,
                  letterSpacing: '0.3em',
                  color: 'var(--ink)',
                }}
              />
            </FormField>
          </>
        )}

        {/* Yetkiler */}
        <FormField label="YETKİLER">
          <div className="space-y-2">
            <CheckboxRow
              label="Gün sonu kasa kapatabilir"
              description="Sadece güvendiğin kasiyerlere ver"
              checked={canCloseDay}
              onChange={setCanCloseDay}
            />
            <CheckboxRow
              label="İade işlemi yapabilir"
              description="Ödemeyi geri verme/iptal"
              checked={canRefund}
              onChange={setCanRefund}
            />
          </div>
        </FormField>

        {error && (
          <div
            className="p-3 rounded-[10px] text-sm flex items-start gap-2"
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
          disabled={pending}
          className="h-11 px-5 rounded-[10px] font-semibold text-sm transition-all hover:opacity-70"
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
          disabled={pending}
          className="flex-1 h-11 rounded-[10px] font-semibold text-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
          }}
        >
          {pending ? 'Kaydediliyor...' : mode === 'create' ? 'Kasiyer oluştur' : 'Kaydet'}
        </button>
      </div>
    </ModalShell>
  );
}

// ============================================================
// PIN DEĞİŞTİR MODAL
// ============================================================

function ChangePinModal({
  cashier,
  onClose,
  onSuccess,
}: {
  cashier: Cashier;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ESC ile kapama
  useEscapeKey(onClose, !pending);

  const handleSubmit = () => {
    if (pin !== pinConfirm) {
      setError('PIN\'ler eşleşmiyor');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN 6 haneli sayı olmalı');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await changePin(cashier.id, pin);
      if (!r.success) {
        setError(r.error || 'Hata');
        return;
      }
      onSuccess();
    });
  };

  return (
    <ModalShell onClose={onClose} title={`PIN değiştir · ${cashier.display_name}`}>
      <div className="px-6 py-5 space-y-4">
        <FormField label="YENİ PIN (6 HANE)" required>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            autoFocus
            className="w-full h-11 px-3 rounded-[10px] bg-paper-2 border border-line focus:outline-none focus:border-accent transition-colors"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 16,
              letterSpacing: '0.3em',
              color: 'var(--ink)',
            }}
          />
        </FormField>
        <FormField label="YENİ PIN (TEKRAR)" required>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            className="w-full h-11 px-3 rounded-[10px] bg-paper-2 border border-line focus:outline-none focus:border-accent transition-colors"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 16,
              letterSpacing: '0.3em',
              color: 'var(--ink)',
            }}
          />
        </FormField>
        {error && (
          <div
            className="p-3 rounded-[10px] text-sm"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        )}
      </div>
      <div
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button
          onClick={onClose}
          disabled={pending}
          className="h-11 px-5 rounded-[10px] text-sm font-semibold transition-all hover:opacity-70"
          style={{ background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--line)' }}
        >
          İptal
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="flex-1 h-11 rounded-[10px] font-semibold text-sm transition-all hover:opacity-95 disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#FAF5EA' }}
        >
          {pending ? 'Kaydediliyor...' : 'PIN değiştir'}
        </button>
      </div>
    </ModalShell>
  );
}

// ============================================================
// FORM HELPERS
// ============================================================

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="uppercase mb-1.5 block"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'var(--ink-3)',
        }}
      >
        {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-3 rounded-[10px] transition-colors hover:bg-paper-2"
      style={{ border: '1px solid var(--line)' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded accent-accent cursor-pointer flex-shrink-0"
      />
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>
          {description}
        </div>
      </div>
    </label>
  );
}

function ModalShell({
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
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
        style={{
          background: 'var(--card)',
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.4)',
          animation: 'aleg-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`@keyframes aleg-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center hover:bg-paper-2 transition-colors"
            style={{ color: 'var(--ink-2)' }}
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
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

function formatTimeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}g önce`;
  return d.toLocaleDateString('tr-TR');
}
