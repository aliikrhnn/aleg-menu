'use client';

import { useState } from 'react';
import {
  createPrinter,
  updatePrinter,
  deletePrinter,
  requestTestPrint,
  type Printer,
  type PrinterInput,
} from '@/lib/actions/printers';
import { PrinterFormModal } from '../components/printer-form-modal';
import type { StationLite } from '../printers-manager';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';

export function PrintersTab({
  printers,
  setPrinters,
  stations,
}: {
  printers: Printer[];
  setPrinters: (fn: (prev: Printer[]) => Printer[]) => void;
  stations: StationLite[];
}) {
  const [modal, setModal] = useState<{ open: boolean; printer: Printer | null }>({
    open: false,
    printer: null,
  });
  const [saving, setSaving] = useState(false);

  async function handleCreate(input: PrinterInput) {
    setSaving(true);
    const r = await createPrinter(input);
    setSaving(false);
    if (!r.success || !r.printer) {
      toast.error(r.error || 'Oluşturulamadı');
      return;
    }
    setPrinters((prev) => [...prev, r.printer!]);
    setModal({ open: false, printer: null });
  }

  async function handleUpdate(input: PrinterInput) {
    if (!modal.printer) return;
    setSaving(true);
    const r = await updatePrinter(modal.printer.id, input);
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'Güncellenemedi');
      return;
    }
    const stationData = input.station_id
      ? stations.find((s) => s.id === input.station_id)
      : null;
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === modal.printer!.id
          ? {
              ...p,
              ...input,
              station_id: input.role === 'cashier' ? null : input.station_id ?? null,
              station_name: stationData?.name || null,
              station_icon: stationData?.icon || null,
              station_color: stationData?.color || null,
            } as Printer
          : p
      )
    );
    setModal({ open: false, printer: null });
  }

  async function handleDelete(p: Printer) {
    const ok = await confirmDialog({
      title: `"${p.name}" yazıcısını sil?`,
      tone: 'danger',
      confirmLabel: 'Sil',
    });
    if (!ok) return;
    setSaving(true);
    const r = await deletePrinter(p.id);
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'Silinemedi');
      return;
    }
    setPrinters((prev) => prev.filter((x) => x.id !== p.id));
  }

  async function handleTestPrint(p: Printer) {
    const r = await requestTestPrint(p.id);
    if (!r.success) {
      toast.error(r.error || 'Test isteği oluşturulamadı');
      return;
    }
    // Print queue listener arka planda yakalar, toast gösterir
  }

  const kitchenPrinters = printers.filter((p) => p.role === 'kitchen');
  const cashierPrinters = printers.filter((p) => p.role === 'cashier');

  return (
    <div>
      {/* Üst bar */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            Bağlı yazıcılar
          </h2>
          <p className="text-ink-3 text-[13px] mt-1">
            {printers.length} yazıcı · {kitchenPrinters.length} mutfak · {cashierPrinters.length} kasa
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, printer: null })}
          className="h-11 px-5 rounded-[12px] text-[14px] font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Yeni yazıcı
        </button>
      </div>

      {/* Boş durum */}
      {printers.length === 0 ? (
        <EmptyState onCreate={() => setModal({ open: true, printer: null })} />
      ) : (
        <div className="space-y-6">
          {/* Mutfak yazıcıları */}
          {kitchenPrinters.length > 0 && (
            <div>
              <SectionTitle
                icon="🍳"
                label="MUTFAK/BAR YAZICILARI"
                caption="Siparişler geldiğinde otomatik basar"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {kitchenPrinters.map((p) => (
                  <PrinterCard
                    key={p.id}
                    printer={p}
                    onEdit={() => setModal({ open: true, printer: p })}
                    onDelete={() => handleDelete(p)}
                    onTest={() => handleTestPrint(p)}
                    disabled={saving}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Kasa yazıcıları */}
          {cashierPrinters.length > 0 && (
            <div>
              <SectionTitle
                icon="💳"
                label="KASA HESAP YAZICILARI"
                caption="Hesap fişini basar (müşteriye verilecek)"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cashierPrinters.map((p) => (
                  <PrinterCard
                    key={p.id}
                    printer={p}
                    onEdit={() => setModal({ open: true, printer: p })}
                    onDelete={() => handleDelete(p)}
                    onTest={() => handleTestPrint(p)}
                    disabled={saving}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hiç kasa yazıcısı yoksa uyarı */}
          {kitchenPrinters.length > 0 && cashierPrinters.length === 0 && (
            <div
              className="rounded-[var(--r)] p-4 flex items-start gap-3"
              style={{
                background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
                border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--line))',
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 18%, transparent)',
                  color: 'var(--gold)',
                }}
              >
                !
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold mb-0.5">
                  Kasa yazıcısı yok
                </div>
                <div className="text-[12px] text-ink-2">
                  Müşteri hesap istediğinde fiş basılamayacak. Bir kasa yazıcısı ekle.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <PrinterFormModal
          printer={modal.printer}
          stations={stations}
          saving={saving}
          onClose={() => setModal({ open: false, printer: null })}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

// ====== SECTION TITLE ======

function SectionTitle({
  icon,
  label,
  caption,
}: {
  icon: string;
  label: string;
  caption: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: 'var(--ink-2)',
          }}
        >
          {label}
        </span>
      </div>
      <span className="text-[12px] text-ink-3">— {caption}</span>
    </div>
  );
}

// ====== PRINTER CARD ======

function PrinterCard({
  printer,
  onEdit,
  onDelete,
  onTest,
  disabled,
}: {
  printer: Printer;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  disabled: boolean;
}) {
  const lastTest = printer.last_tested_at
    ? new Date(printer.last_tested_at)
    : null;
  const lastTestAgo = lastTest
    ? formatAgo(Date.now() - lastTest.getTime())
    : null;

  const accentColor =
    printer.role === 'kitchen' && printer.station_color
      ? printer.station_color
      : 'var(--accent)';

  return (
    <div
      className="rounded-[var(--r)] p-4 flex flex-col"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderTop: `3px solid ${accentColor}`,
        opacity: printer.is_active ? 1 : 0.6,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
              fontSize: 18,
            }}
          >
            {printer.role === 'cashier' ? '💳' : printer.station_icon || '🖨'}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="truncate"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {printer.name}
            </h3>
            <div
              className="text-[11px] mt-1 flex items-center gap-1.5 flex-wrap"
              style={{
                fontFamily: 'var(--f-mono)',
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              <span>{printer.paper_width === 48 ? '80mm' : '58mm'}</span>
              <span>·</span>
              <span>
                {printer.connection_type === 'bluetooth' ? 'BLUETOOTH' : 'NETWORK'}
              </span>
              {printer.role === 'kitchen' && printer.station_name && (
                <>
                  <span>·</span>
                  <span style={{ color: accentColor }}>
                    {printer.station_name.toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Aktif badge */}
        <div
          className="flex-shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{
            background: printer.is_active
              ? 'color-mix(in srgb, var(--ok, #6B8E4E) 15%, transparent)'
              : 'var(--paper-2)',
            color: printer.is_active ? 'var(--ok, #6B8E4E)' : 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.08em',
          }}
        >
          {printer.is_active ? 'AKTİF' : 'PASİF'}
        </div>
      </div>

      {/* Test durumu */}
      <div
        className="mb-3 text-[11px] flex items-center gap-1.5"
        style={{ color: 'var(--ink-3)' }}
      >
        {lastTest && printer.last_test_success === true && (
          <>
            <span style={{ color: 'var(--ok, #6B8E4E)' }}>✓</span>
            <span>Son test: {lastTestAgo}</span>
          </>
        )}
        {lastTest && printer.last_test_success === false && (
          <>
            <span style={{ color: 'var(--danger, #C4553A)' }}>✕</span>
            <span style={{ color: 'var(--danger, #C4553A)' }}>
              Son test hatalı ({lastTestAgo})
            </span>
          </>
        )}
        {!lastTest && <span>Henüz test edilmedi</span>}
      </div>

      {/* Aksiyonlar */}
      <div className="flex gap-2">
        <button
          onClick={onTest}
          disabled={disabled}
          className="flex-1 h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          Test fişi yazdır
        </button>
        <button
          onClick={onEdit}
          disabled={disabled}
          className="h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[var(--paper-2)] disabled:opacity-50"
          style={{ color: 'var(--ink-2)' }}
          title="Düzenle"
        >
          Düzenle
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className="h-9 w-9 rounded-[10px] text-[16px] flex items-center justify-center transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] disabled:opacity-50"
          style={{ color: 'var(--accent)' }}
          title="Sil"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

// ====== EMPTY STATE ======

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-[var(--r)] p-10 text-center"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div className="text-4xl mb-3">🖨</div>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
        }}
        className="mb-2"
      >
        Henüz yazıcınız yok
      </h2>
      <p className="text-ink-2 text-sm mb-5 max-w-md mx-auto">
        Termal fiş yazıcınızı bağlayın. Siparişler geldiğinde otomatik olarak
        doğru istasyona basılsın, müşteri hesap istediğinde kasadan anında fiş
        çıksın.
      </p>
      <button
        onClick={onCreate}
        className="h-11 px-6 rounded-[12px] text-[14px] font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent)', color: 'var(--paper)' }}
      >
        + İlk yazıcınızı bağlayın
      </button>

      {/* Kısa bilgi */}
      <div
        className="mt-8 max-w-md mx-auto text-left p-4 rounded-[12px]"
        style={{ background: 'var(--paper-2)' }}
      >
        <div
          className="uppercase mb-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 700,
            color: 'var(--ink-3)',
          }}
        >
          NASIL ÇALIŞIR?
        </div>
        <ul className="space-y-2 text-[13px] text-ink-2">
          <li className="flex gap-2">
            <span style={{ color: 'var(--accent)' }}>•</span>
            <span>
              <strong>Mutfak yazıcıları</strong> istasyonlara bağlanır. Bar
              yazıcısı sadece bar ürünlerini, mutfak yazıcısı sadece yemekleri,
              pastane yazıcısı sadece tatlıları basar — her istasyon kendi
              işini görür.
            </span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: 'var(--accent)' }}>•</span>
            <span>
              <strong>Kasa yazıcısı</strong> müşteri hesap istediğinde tam
              detaylı fiş basar. Gel-al ve paket siparişlerde otomatik çalışır.
            </span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: 'var(--accent)' }}>•</span>
            <span>
              <strong>80mm termal ESC/POS</strong> uyumlu yazıcılar
              desteklenir. Bluetooth ile tabletten veya kasadan kolayca
              bağlanır.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ====== Helpers ======

function formatAgo(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}
