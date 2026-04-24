'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCashierSession } from '@/lib/cashier-session';
import { OrdersBoard } from '@/app/panel/(shell)/pos/orders-board';
import { KasaTabs, type KasaTab } from './kasa-tabs';
import { TablesGrid } from './tables-grid';
import { RegisterPanel } from './register-panel';
import { OrderComposer } from './order-composer';
import { TableDetailModal } from './table-detail-modal';
import { PaymentModal } from '@/app/panel/(shell)/pos/payment-modal';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { PrinterStatusWidget } from '@/components/panel/printer-status-widget';
import {
  getOrderForPayment,
  type OrderForPayment,
} from '@/lib/actions/tables-status';
import { getActiveCashSession } from '@/lib/actions/payments';
import { toast } from '@/components/ui/toast';
import type { ActiveOrder } from '@/lib/actions/pos';
import type { TableWithStatus } from '@/lib/actions/tables-status';

type Props = {
  initialOrders: ActiveOrder[];
  businessId: string;
};

type ComposerMode =
  | { kind: 'table'; tableId: string; tableName: string }
  | { kind: 'quick' }
  | { kind: 'addToOrder'; orderId: string; tableName?: string };

export function KasaBoard({ initialOrders, businessId }: Props) {
  const { cashier, businessName, lock, signOut } = useCashierSession();
  const [activeTab, setActiveTab] = useState<KasaTab>('tables');
  const [composerState, setComposerState] = useState<{ mode: ComposerMode } | null>(null);
  const [tableDetail, setTableDetail] = useState<{
    tableId: string;
    tableName: string;
  } | null>(null);
  // Hızlı satış ödemesi — composer başarılı olduktan sonra otomatik açılır
  const [autoPayOrder, setAutoPayOrder] = useState<OrderForPayment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Kasa açık mı? — kapalıysa sipariş/ödeme alımı engellenir
  // sessionStorage cache ile anında başlat
  const [kasaOpen, setKasaOpen] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem('aleg-kasa-session');
      if (cached && cached !== 'null') return true;
      if (cached === 'null') return false;
    } catch {
      // yoksay
    }
    return null;
  });

  // Kasa session durumunu takip et - tab değişiminde veya sipariş/kasa event'inde
  // (Polling YOK - kullanıcı action'ları ile senkron)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await getActiveCashSession();
        if (!mounted) return;
        const isOpen = r.success && r.session != null;
        setKasaOpen(isOpen);
        // Cache güncelle
        try {
          sessionStorage.setItem(
            'aleg-kasa-session',
            isOpen ? JSON.stringify(r.session) : 'null'
          );
        } catch {
          // yoksay
        }
      } catch {
        if (mounted) setKasaOpen(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey, activeTab]);

  const handleTableClick = useCallback(
    (table: TableWithStatus) => {
      // Kasa açık değilse (kapalı veya bilinmiyor) sipariş alma YOK
      if (kasaOpen !== true) {
        toast.error('Kasa kapalı - önce Kasa sekmesinden kasayı aç');
        return;
      }
      if (table.live_status === 'empty') {
        // Boş masa → direkt yeni sipariş aç
        setComposerState({
          mode: { kind: 'table', tableId: table.id, tableName: table.name },
        });
      } else {
        // Dolu masa → detay modali (sadece okuma, detay içinde zaten kontrol var)
        setTableDetail({ tableId: table.id, tableName: table.name });
      }
    },
    [kasaOpen]
  );

  const handleQuickSale = () => {
    if (kasaOpen !== true) {
      toast.error('Kasa kapalı - önce Kasa sekmesinden kasayı aç');
      return;
    }
    setComposerState({ mode: { kind: 'quick' } });
  };

  const handleComposerClose = () => setComposerState(null);

  const handleComposerSuccess = async (info: {
    queued?: boolean;
    online?: boolean;
    orderId?: string;
  }) => {
    const wasQuickSale = composerState?.mode.kind === 'quick';
    setComposerState(null);
    setRefreshKey((k) => k + 1);

    // Hızlı satış ise → PaymentModal'ı otomatik aç
    if (wasQuickSale && info.online && info.orderId) {
      const r = await getOrderForPayment(info.orderId);
      if (r.success && r.order) {
        setAutoPayOrder(r.order);
      }
    }
  };

  const handleAddItemsFromDetail = () => {
    if (!tableDetail) return;
    // "Yeni Sipariş Aç" akışı — mevcut siparişlerden bağımsız
    setComposerState({
      mode: { kind: 'table', tableId: tableDetail.tableId, tableName: tableDetail.tableName },
    });
    setTableDetail(null);
  };

  const handleAddItemsToExistingOrder = (orderId: string) => {
    if (!tableDetail) return;
    // Mevcut siparişe kalem ekleme
    setComposerState({
      mode: {
        kind: 'addToOrder',
        orderId,
        tableName: tableDetail.tableName,
      },
    });
    setTableDetail(null);
  };

  const handleGoToOrdersFromDetail = () => {
    setTableDetail(null);
    setActiveTab('orders');
  };

  if (!cashier) return null;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--paper)' }}
    >
      {/* Kasiyer üst bar */}
      <div
        className="sticky top-0 z-[60] flex items-center justify-between px-4 py-3 gap-3 flex-wrap"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--line)',
          boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              background: `color-mix(in srgb, ${cashier.color} 16%, var(--card))`,
              border: `1px solid color-mix(in srgb, ${cashier.color} 30%, transparent)`,
              fontSize: 20,
            }}
          >
            {cashier.emoji}
          </div>
          <div>
            <div
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: cashier.color,
              }}
            >
              AKTİF KASİYER
            </div>
            <div
              className="font-semibold"
              style={{
                color: 'var(--ink)',
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              {cashier.display_name}
              <span
                className="ml-2"
                style={{
                  color: 'var(--ink-3)',
                  fontSize: 12,
                  fontWeight: 400,
                  fontFamily: 'var(--f-mono)',
                }}
              >
                · {businessName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PrinterStatusWidget />
          <button
            onClick={lock}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              color: 'var(--ink-2)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
            title="Ekranı kilitle (5dk sonra otomatik)"
          >
            🔒 KİLİTLE
          </button>
          <button
            onClick={async () => {
              const ok = await confirmDialog({
                title: 'Çıkış yap?',
                body: 'Kasa oturumundan çıkacaksın.',
                confirmLabel: 'Çıkış',
                cancelLabel: 'Vazgeç',
              });
              if (ok) signOut();
            }}
            className="h-9 px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              color: 'var(--ink-3)',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            ÇIKIŞ
          </button>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="px-4 md:px-6 pt-4">
        <KasaTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* TAB İÇERİK */}
      <div className="flex-1 flex flex-col px-4 md:px-6 py-4 min-h-0">
        {/* Kasa kapalı uyarı bandı (register sekmesi hariç, açık DEĞİLSE göster) */}
        {kasaOpen !== true && activeTab !== 'register' && (
          <div
            className="mb-4 rounded-[10px] px-4 py-3 flex items-center gap-3"
            style={{
              background: 'color-mix(in srgb, var(--warn) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--warn) 40%, var(--line))',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--warn)',
                color: '#FAF5EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              !
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--warn)',
                  marginBottom: 2,
                }}
              >
                KASA KAPALI
              </div>
              <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Sipariş veya ödeme alabilmek için önce kasayı açman gerekiyor.
              </div>
            </div>
            <button
              onClick={() => setActiveTab('register')}
              className="h-9 px-3 rounded-[8px] text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
              style={{
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              KASAYA GİT
            </button>
          </div>
        )}

        {activeTab === 'tables' && (
          <div key={refreshKey}>
            <TablesGrid onTableClick={handleTableClick} />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <OrdersBoard initialOrders={initialOrders} businessId={businessId} />
          </div>
        )}
        {activeTab === 'quick' && (
          <div className="flex-1 flex items-center justify-center py-10">
            <QuickSaleLanding
              onStart={handleQuickSale}
              disabled={kasaOpen !== true}
            />
          </div>
        )}
        {activeTab === 'register' && (
          <div className="flex-1 min-h-0">
            <RegisterPanel businessId={businessId} />
          </div>
        )}
      </div>

      {/* Order Composer Modal */}
      {composerState && (
        <OrderComposer
          open={true}
          mode={composerState.mode}
          onClose={handleComposerClose}
          onSuccess={handleComposerSuccess}
        />
      )}

      {/* Dolu Masa Detay Modal */}
      {tableDetail && (
        <TableDetailModal
          tableId={tableDetail.tableId}
          tableName={tableDetail.tableName}
          onClose={() => setTableDetail(null)}
          onAddItems={handleAddItemsFromDetail}
          onAddItemsToOrder={handleAddItemsToExistingOrder}
          onGoToOrders={handleGoToOrdersFromDetail}
        />
      )}

      {/* Hızlı Satış Otomatik Ödeme Modal */}
      {autoPayOrder && (
        <PaymentModal
          open={true}
          onClose={() => setAutoPayOrder(null)}
          onItemsChanged={async () => {
            // Kalem ikramı yapıldı → autoPayOrder'ı güncel veriyle tazele
            const r = await getOrderForPayment(autoPayOrder.id);
            if (r.success && r.order) {
              setAutoPayOrder(r.order);
            }
          }}
          onSuccess={() => {
            setAutoPayOrder(null);
            setRefreshKey((k) => k + 1);
          }}
          order={autoPayOrder}
        />
      )}
    </div>
  );
}

// ============================================================
// QUICK SALE LANDING
// ============================================================

function QuickSaleLanding({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-10 md:p-14 text-center max-w-[540px] mx-auto"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: '0 4px 16px -8px rgba(42,31,24,0.08)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          color: 'var(--accent)',
          fontSize: 28,
        }}
      >
        ⚡
      </div>
      <div
        className="uppercase mb-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          color: 'var(--accent)',
        }}
      >
        MASASIZ SATIŞ
      </div>
      <h2
        className="mb-3"
        style={{
          fontFamily: 'var(--f-serif)',
          fontSize: 'clamp(32px, 4vw, 42px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.02,
          color: 'var(--ink)',
        }}
      >
        Hızlı{' '}
        <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>
          satış.
        </span>
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--ink-2)', maxWidth: 400, margin: '0 auto 24px' }}
      >
        {disabled
          ? 'Kasa kapalı olduğu için hızlı satış yapılamaz. Kasayı aç, satışa başla.'
          : 'Ayaküstü bir kahve, paket bir sandviç — masası olmayan satışlar için. Ödeme direkt alınır, sipariş mutfağa gider.'}
      </p>
      <button
        onClick={onStart}
        disabled={disabled}
        className="group h-12 px-6 rounded-[10px] font-semibold text-sm flex items-center gap-2 mx-auto transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:opacity-100 disabled:active:scale-100"
        style={{
          background: disabled ? 'var(--ink-3)' : 'var(--accent)',
          color: '#FAF5EA',
          boxShadow: disabled
            ? 'none'
            : '0 1px 2px rgba(196,85,58,0.2), 0 4px 12px -4px rgba(196,85,58,0.3)',
        }}
      >
        <span>{disabled ? 'Kasa kapalı' : 'Yeni hızlı satış başlat'}</span>
        {!disabled && (
          <span
            className="transition-transform group-hover:translate-x-1"
            style={{ fontSize: 16 }}
          >
            →
          </span>
        )}
      </button>
    </div>
  );
}
