'use client';

import { useState, useTransition } from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  createStaff,
  updateStaff,
  deactivateStaff,
  deleteStaff,
  listStaff,
  getRoleColor,
  type Staff,
  type StaffRole,
} from '@/lib/actions/staff';

type Props = {
  initialStaff: Staff[];
  error: string | null;
};

const ROLE_LABELS: Record<StaffRole, string> = {
  manager: 'Müdür',
  barista: 'Barista',
  server: 'Garson',
  kitchen: 'Mutfak',
};

const ROLES: StaffRole[] = ['manager', 'barista', 'server', 'kitchen'];

// ============================================================
// MAIN
// ============================================================
export function StaffList({ initialStaff, error: initialError }: Props) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  const reload = async () => {
    const r = await listStaff(true);
    if (r.success && r.staff) setStaff(r.staff);
  };

  const activeStaff = staff.filter((s) => s.active);
  const inactiveStaff = staff.filter((s) => !s.active);

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
              style={{
                width: 24,
                height: 1,
                background: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            EKİP · VARDİYA
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
            Personel{' '}
            <span
              style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}
            >
              ve vardiya.
            </span>
          </h1>
          <p
            className="text-sm mt-2"
            style={{ color: 'var(--ink-2)', maxWidth: 540 }}
          >
            Çalışanlarını ekle, rollerini ata, saatlik ücretlerini gir. Vardiya
            planlamasını tablodan yapabilirsin.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="group h-11 px-5 rounded-[10px] font-semibold text-sm flex items-center gap-2 transition-all hover:opacity-95 active:scale-[0.99]"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
            boxShadow:
              '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
          }}
        >
          <span>+</span>
          <span>Yeni Personel</span>
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

      {/* AKTİF PERSONEL */}
      {activeStaff.length === 0 ? (
        <EmptyState onAdd={() => setCreateOpen(true)} />
      ) : (
        <>
          <SectionLabel
            count={activeStaff.length}
            label="Aktif Personel"
            tone="ok"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {activeStaff.map((s) => (
              <StaffCard
                key={s.id}
                staff={s}
                onEdit={() => setEditing(s)}
                onDeactivated={reload}
                onDeleted={reload}
              />
            ))}
          </div>
        </>
      )}

      {/* PASİF PERSONEL */}
      {inactiveStaff.length > 0 && (
        <>
          <SectionLabel
            count={inactiveStaff.length}
            label="Pasif Personel"
            tone="muted"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            {inactiveStaff.map((s) => (
              <StaffCard
                key={s.id}
                staff={s}
                onEdit={() => setEditing(s)}
                onDeactivated={reload}
                onDeleted={reload}
                isInactive
              />
            ))}
          </div>
        </>
      )}

      {/* MODALS */}
      {createOpen && (
        <StaffModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSuccess={async () => {
            setCreateOpen(false);
            await reload();
          }}
        />
      )}
      {editing && (
        <StaffModal
          mode="edit"
          staff={editing}
          onClose={() => setEditing(null)}
          onSuccess={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function SectionLabel({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'ok' | 'muted';
}) {
  const color = tone === 'ok' ? 'var(--ok)' : 'var(--ink-3)';
  return (
    <div
      className="uppercase mb-3 flex items-center gap-2"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color,
      }}
    >
      <span style={{ fontSize: 8 }}>●</span>
      <span>
        {label} · {count}
      </span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="rounded-[var(--r)] p-12 text-center"
      style={{
        background: 'var(--card)',
        border: '1px dashed var(--line)',
      }}
    >
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-full grid place-items-center"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          color: 'var(--accent)',
          fontSize: 26,
        }}
      >
        ◐
      </div>
      <h3
        className="mb-1"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--ink)',
        }}
      >
        Henüz personel yok
      </h3>
      <p className="text-sm mb-5" style={{ color: 'var(--ink-2)' }}>
        İlk çalışanını ekleyerek başla.
      </p>
      <button
        onClick={onAdd}
        className="h-10 px-5 rounded-[10px] font-semibold text-sm"
        style={{
          background: 'var(--accent)',
          color: '#FAF5EA',
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        + Personel Ekle
      </button>
    </div>
  );
}

// ============================================================
// STAFF CARD
// ============================================================
function StaffCard({
  staff,
  onEdit,
  onDeactivated,
  onDeleted,
  isInactive,
}: {
  staff: Staff;
  onEdit: () => void;
  onDeactivated: () => void;
  onDeleted: () => void;
  isInactive?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const initials = staff.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const color = staff.color || getRoleColor(staff.role as StaffRole);

  const handleDeactivate = async () => {
    const ok = await confirmDialog({
      title: 'Personeli pasifle',
      body: `${staff.name} adlı personeli pasif yapmak istiyor musun? Vardiya kayıtları korunur, istediğin zaman tekrar aktif edebilirsin.`,
      confirmLabel: 'Pasifle',
      tone: 'warn',
    });
    if (!ok) return;

    startTransition(async () => {
      const r = await deactivateStaff(staff.id);
      if (r.success) {
        toast.success(`${staff.name} pasif yapıldı`);
        onDeactivated();
      } else {
        toast.error(r.error || 'İşlem başarısız');
      }
    });
  };

  const handleReactivate = async () => {
    startTransition(async () => {
      const r = await updateStaff({ staffId: staff.id, active: true });
      if (r.success) {
        toast.success(`${staff.name} tekrar aktif`);
        onDeactivated();
      } else {
        toast.error(r.error || 'İşlem başarısız');
      }
    });
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Personeli sil',
      body: `${staff.name} adlı personeli kalıcı olarak silmek istiyor musun? Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      tone: 'danger',
    });
    if (!ok) return;

    startTransition(async () => {
      const r = await deleteStaff(staff.id);
      if (r.success) {
        toast.success(`${staff.name} silindi`);
        onDeleted();
      } else {
        toast.error(r.error || 'Silinemedi');
      }
    });
  };

  return (
    <div
      className="rounded-[var(--r)] p-4 transition-all"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full grid place-items-center text-white font-bold"
          style={{
            background: color,
            fontFamily: 'var(--f-mono)',
            fontSize: 14,
            letterSpacing: '0.04em',
          }}
        >
          {initials}
        </div>
        {/* İsim + rol */}
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold truncate"
            style={{ color: 'var(--ink)', fontSize: 15 }}
            title={staff.name}
          >
            {staff.name}
          </div>
          <div
            className="uppercase mt-0.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color,
              fontWeight: 600,
            }}
          >
            {ROLE_LABELS[staff.role as StaffRole] || staff.role || 'Rol yok'}
          </div>
        </div>
      </div>

      {/* Detaylar */}
      <div className="space-y-1 mb-3" style={{ minHeight: 28 }}>
        {staff.phone && (
          <div
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--ink-2)' }}
          >
            <span>📞</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>{staff.phone}</span>
          </div>
        )}
        {staff.hourly_rate !== null && staff.hourly_rate > 0 && (
          <div
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--ink-2)' }}
          >
            <span>₺</span>
            <span style={{ fontFamily: 'var(--f-mono)' }}>
              {staff.hourly_rate.toLocaleString('tr-TR')} / saat
            </span>
          </div>
        )}
      </div>

      {/* Eylemler */}
      <div
        className="flex gap-1 pt-3"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button
          onClick={onEdit}
          disabled={isPending}
          className="flex-1 h-8 rounded-[6px] text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: 'var(--paper-2)',
            color: 'var(--ink-2)',
            border: '1px solid var(--line)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Düzenle
        </button>
        {isInactive ? (
          <>
            <button
              onClick={handleReactivate}
              disabled={isPending}
              className="flex-1 h-8 rounded-[6px] text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'color-mix(in srgb, var(--ok) 12%, transparent)',
                color: 'var(--ok)',
                border:
                  '1px solid color-mix(in srgb, var(--ok) 30%, var(--line))',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Aktif Et
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              title="Kalıcı sil"
              className="w-8 h-8 rounded-[6px] flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                border:
                  '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              }}
            >
              ×
            </button>
          </>
        ) : (
          <button
            onClick={handleDeactivate}
            disabled={isPending}
            className="flex-1 h-8 rounded-[6px] text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
              color: 'var(--danger)',
              border:
                '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Pasifle
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STAFF MODAL — Ekleme & Düzenleme aynı modal
// ============================================================
function StaffModal({
  mode,
  staff,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  staff?: Staff;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(staff?.name || '');
  const [role, setRole] = useState<StaffRole>(
    (staff?.role as StaffRole) || 'barista'
  );
  const [phone, setPhone] = useState(staff?.phone || '');
  const [hourlyRate, setHourlyRate] = useState<string>(
    staff?.hourly_rate ? String(staff.hourly_rate) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEscapeKey(onClose, !isPending);

  const isValid = name.trim().length >= 2;

  const handleSubmit = () => {
    setError(null);
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('Ad en az 2 karakter olmalı');
      return;
    }

    const rate = hourlyRate.trim() ? Number(hourlyRate) : null;
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 10000)) {
      setError('Saatlik ücret 0-10.000 ₺ arası olmalı');
      return;
    }

    startTransition(async () => {
      if (mode === 'create') {
        const r = await createStaff({
          name: trimmedName,
          role,
          phone: phone.trim() || null,
          hourly_rate: rate,
        });
        if (!r.success) {
          setError(r.error || 'Personel eklenemedi');
          return;
        }
        toast.success(`${trimmedName} eklendi`);
      } else if (staff) {
        const r = await updateStaff({
          staffId: staff.id,
          name: trimmedName,
          role,
          phone: phone.trim() || null,
          hourly_rate: rate,
        });
        if (!r.success) {
          setError(r.error || 'Personel güncellenemedi');
          return;
        }
        toast.success(`${trimmedName} güncellendi`);
      }
      onSuccess();
    });
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-6">
        <h2
          className="mb-1"
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
            color: 'var(--ink)',
          }}
        >
          {mode === 'create' ? 'Yeni personel' : 'Personeli düzenle'}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--ink-2)' }}>
          {mode === 'create'
            ? 'Yeni çalışanı vardiya planına ekle.'
            : 'Personel bilgilerini güncelle.'}
        </p>

        {/* Ad */}
        <div className="mb-4">
          <FieldLabel>Ad Soyad *</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Yılmaz"
            autoFocus
            className="w-full px-4 py-3 rounded-[10px] outline-none transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontSize: 15,
            }}
          />
        </div>

        {/* Rol */}
        <div className="mb-4">
          <FieldLabel>Rol *</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="h-11 rounded-[10px] text-sm font-semibold transition-all"
                style={{
                  background:
                    role === r
                      ? `color-mix(in srgb, ${getRoleColor(r)} 14%, transparent)`
                      : 'var(--paper-2)',
                  color: role === r ? getRoleColor(r) : 'var(--ink-2)',
                  border:
                    role === r
                      ? `1px solid ${getRoleColor(r)}`
                      : '1px solid var(--line)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Telefon (opsiyonel) */}
        <div className="mb-4">
          <FieldLabel>Telefon</FieldLabel>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0555 123 45 67"
            className="w-full px-4 py-3 rounded-[10px] outline-none transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontSize: 14,
              fontFamily: 'var(--f-mono)',
            }}
          />
        </div>

        {/* Saatlik ücret */}
        <div className="mb-4">
          <FieldLabel>Saatlik Ücret (₺)</FieldLabel>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="120"
            className="w-full px-4 py-3 rounded-[10px] outline-none transition-colors"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              fontSize: 15,
              fontFamily: 'var(--f-mono)',
            }}
          />
          <div className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            Bordro hesabı için. İsteğe bağlı.
          </div>
        </div>

        {/* HATA */}
        {error && (
          <div
            className="mb-3 text-sm rounded-[10px] px-3 py-2"
            style={{
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              color: 'var(--danger)',
              border:
                '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            }}
          >
            {error}
          </div>
        )}

        {/* Butonlar */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="flex-1 h-11 rounded-[10px] text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: 'var(--accent)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {isPending ? 'Kaydediliyor...' : mode === 'create' ? 'Ekle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ============================================================
// MODAL SHELL (kasa modallarıyla aynı pattern)
// ============================================================
function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
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
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[var(--r)]"
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
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block uppercase mb-1.5"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </label>
  );
}
