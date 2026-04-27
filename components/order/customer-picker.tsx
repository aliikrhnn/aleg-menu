'use client';

/**
 * CustomerPicker — Kasada "Açık Hesap" akışı için
 *
 * Kayıtlı cari kullanıcıları listeler, search ile filtrelenir.
 * Kullanıcı seçildiğinde callback ile geri döner.
 *
 * NOT: Hızlı yeni kullanıcı ekleme YOK — sadece panelden eklenmiş
 * kullanıcılar gösterilir. İşletme sahibinin önceden tanımladığı
 * tanıdıklar/çalışanlar.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/toast';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listCustomers,
  type CustomerWithStats,
} from '@/lib/actions/customers';

const fmt = (n: number) =>
  `₺${Math.round(Math.abs(n)).toLocaleString('tr-TR')}`;

type Props = {
  /** Modal başlığı (tutar göstermek için) */
  amount: number;
  /** Açık hesap notu (opsiyonel) */
  isPartial?: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerWithStats, note: string) => void;
};

export function CustomerPicker({
  amount,
  isPartial = false,
  onClose,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerWithStats | null>(null);
  const [note, setNote] = useState('');

  // ESC tuşu ile kapama
  useEscapeKey(onClose);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const r = await listCustomers({
      search: q.trim() || undefined,
      limit: 50,
    });
    setLoading(false);
    if (!r.success) {
      toast.error(r.error || 'Liste alınamadı');
      return;
    }
    setCustomers(r.customers || []);
  }, []);

  // İlk yükleme
  useEffect(() => {
    void load('');
  }, [load]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      void load(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: 'rgba(42, 31, 24, 0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-[14px] flex flex-col overflow-hidden aleg-modal-desktop-first aleg-modal-content"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.4)',
        }}
      >
        {/* HEADER */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div
            className="uppercase mb-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              color: 'var(--super)',
            }}
          >
            AÇIK HESAP — KULLANICI SEÇ
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--ink)',
            }}
          >
            {fmt(amount)} {isPartial ? 'cariye aktarılacak' : 'açık hesaba kaydedilecek'}
          </div>
        </div>

        {/* SELECTED + NOTE (kullanıcı seçilince görünür) */}
        {selected && (
          <div
            className="px-5 py-3 flex-shrink-0"
            style={{
              borderBottom: '1px solid var(--line)',
              background:
                'color-mix(in srgb, var(--super) 5%, var(--paper-2))',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    'color-mix(in srgb, var(--super) 15%, transparent)',
                  color: 'var(--super)',
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: 'var(--ink)',
                  }}
                >
                  {selected.name}
                </div>
                {selected.phone && (
                  <div
                    className="text-xs"
                    style={{
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--f-mono)',
                    }}
                  >
                    📞 {selected.phone}
                  </div>
                )}
                {Number(selected.balance) < 0 && (
                  <div
                    className="text-xs mt-0.5"
                    style={{
                      color: 'var(--accent)',
                      fontFamily: 'var(--f-mono)',
                      fontWeight: 700,
                    }}
                  >
                    Mevcut borç: {fmt(Number(selected.balance))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs px-2 py-1 rounded"
                style={{
                  color: 'var(--ink-3)',
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.08em',
                }}
              >
                ✕ DEĞİŞTİR
              </button>
            </div>
            {/* Not */}
            <div>
              <div
                className="uppercase mb-1.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-2)',
                }}
              >
                NOT (opsiyonel)
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="örn: yarın ödeyecek"
                className="w-full h-9 px-3 rounded-[8px] text-sm"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* SEARCH */}
        {!selected && (
          <div
            className="px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="İsim veya telefon ara…"
                autoFocus
                className="w-full h-11 px-3 pr-9 rounded-[8px] text-sm"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center"
                  style={{ color: 'var(--ink-3)' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* LIST */}
        {!selected && (
          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {loading ? (
              <Skeleton.List rows={4} />
            ) : customers.length === 0 ? (
              <EmptyState search={search} />
            ) : (
              <div className="space-y-1">
                {customers.map((c) => (
                  <CustomerRow
                    key={c.id}
                    customer={c}
                    onClick={() => setSelected(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div
          className="px-5 py-3 flex gap-2 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'var(--paper-2)',
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
            }}
          >
            Vazgeç
          </button>
          <button
            onClick={() => {
              if (!selected) {
                toast.error('Bir kullanıcı seç');
                return;
              }
              onSelect(selected, note);
            }}
            disabled={!selected}
            className="flex-1 h-11 rounded-[8px] text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--super)',
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            📒 {selected ? `${selected.name.split(' ')[0]}'a Yaz` : 'Seç'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER ROW
// ============================================================
function CustomerRow({
  customer,
  onClick,
}: {
  customer: CustomerWithStats;
  onClick: () => void;
}) {
  const balance = Number(customer.balance);
  const isDebtor = balance < 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-[10px] transition-all hover:opacity-95 active:scale-[0.998]"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: isDebtor
            ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
            : 'color-mix(in srgb, var(--ok) 10%, transparent)',
          color: isDebtor ? 'var(--accent)' : 'var(--ok)',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {customer.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          {customer.name}
        </div>
        {customer.phone && (
          <div
            className="text-xs"
            style={{
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
            }}
          >
            📞 {customer.phone}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {isDebtor ? (
          <>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}
            >
              BORÇ
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--accent)',
              }}
            >
              {fmt(balance)}
            </div>
          </>
        ) : balance > 0 ? (
          <div
            className="text-xs"
            style={{
              fontFamily: 'var(--f-mono)',
              fontWeight: 700,
              color: 'var(--ok)',
            }}
          >
            +{fmt(balance)}
          </div>
        ) : (
          <div
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-3)',
            }}
          >
            ✓ TEMİZ
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyState({ search }: { search: string }) {
  if (search) {
    return (
      <div
        className="text-center py-8"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          color: 'var(--ink-3)',
        }}
      >
        &ldquo;{search}&rdquo; ile eşleşen kullanıcı yok
      </div>
    );
  }
  return (
    <div
      className="text-center py-8 px-4 rounded-[10px]"
      style={{
        background: 'var(--paper-2)',
        border: '1px dashed var(--line)',
        margin: '8px 4px',
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 8 }}>📒</div>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--ink)',
          marginBottom: 4,
        }}
      >
        Henüz cari kullanıcı yok
      </div>
      <div
        className="text-xs"
        style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}
      >
        Panel → Cari Hesaplar bölümünden
        <br />
        kullanıcı ekleyin
      </div>
    </div>
  );
}
