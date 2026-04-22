'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ReceiptSettings } from '@/types/database';
import type { BusinessInfo } from '../printers-manager';

// Örnek sipariş verisi (preview için)
const SAMPLE_ORDER = {
  order_no: 'A7B2E1',
  created_at: new Date().toISOString(),
  order_type: 'dine_in' as const,
  table_label: '4',
  customer_name: 'Ahmet Yılmaz',
  items: [
    {
      product_name: 'Latte',
      quantity: 2,
      unit_price: 50,
      note: null,
      station_name: 'Bar',
      options: [{ preset_name: 'Süt', value_name: 'Yulaf', price_delta: 5 }],
    },
    {
      product_name: 'Kurabiye',
      quantity: 1,
      unit_price: 25,
      note: 'Fazla kavrulmasın',
      station_name: 'Pastane',
      options: [],
    },
  ],
  note: 'Pencere kenarı masa',
  subtotal: 130,
  total: 130,
};

export function ReceiptPreview({
  type,
  settings,
  business,
  stationName,
}: {
  type: 'cashier' | 'kitchen';
  settings: ReceiptSettings;
  business: BusinessInfo;
  stationName?: string;
}) {
  const width = settings.paper_width;
  const paperMm = width === 48 ? '80mm' : '58mm';
  const maxW = width === 48 ? 380 : 280;

  // Mutfak fişi sadece bu istasyonun item'larını gösterir
  const filteredItems =
    type === 'kitchen'
      ? SAMPLE_ORDER.items.filter((i) =>
          stationName ? i.station_name === stationName : true
        )
      : SAMPLE_ORDER.items;

  return (
    <div className="flex flex-col items-center">
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
        ÖRNEK ÇIKTI · {paperMm}
      </div>

      {/* Termal kağıt görünümü */}
      <div
        className="relative"
        style={{
          width: maxW,
          background: '#FFFFFF',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          fontFamily: 'ui-monospace, SF Mono, Menlo, Consolas, monospace',
          fontSize: 11,
          lineHeight: 1.35,
          color: '#1a1a1a',
        }}
      >
        {/* Zig-zag üst kenar */}
        <div
          style={{
            height: 10,
            background:
              'linear-gradient(135deg, transparent 50%, #FFFFFF 50%) 0 0 / 10px 10px repeat-x, linear-gradient(-135deg, transparent 50%, #FFFFFF 50%) 5px 0 / 10px 10px repeat-x',
            transform: 'translateY(-10px)',
          }}
        />

        <div style={{ padding: '8px 16px 16px' }}>
          {type === 'cashier' ? (
            <CashierReceipt
              order={SAMPLE_ORDER}
              settings={settings}
              business={business}
              items={filteredItems}
            />
          ) : (
            <KitchenReceipt
              order={SAMPLE_ORDER}
              settings={settings}
              stationName={stationName || 'Bar'}
              items={filteredItems}
            />
          )}
        </div>

        {/* Zig-zag alt kenar */}
        <div
          style={{
            height: 10,
            background:
              'linear-gradient(45deg, transparent 50%, #FFFFFF 50%) 0 0 / 10px 10px repeat-x, linear-gradient(-45deg, transparent 50%, #FFFFFF 50%) 5px 0 / 10px 10px repeat-x',
            transform: 'translateY(10px)',
          }}
        />
      </div>

      <div
        className="mt-4 text-[11px] text-center"
        style={{ color: 'var(--ink-3)', maxWidth: maxW }}
      >
        {type === 'cashier'
          ? 'Müşteri hesap istediğinde bu fiş kasa yazıcısından çıkar. Gel-al/paket siparişlerde otomatik basılır.'
          : `"${stationName || 'Bar'}" istasyonuna düşen item'lar. Yeni sipariş gelince otomatik basar.`}
      </div>
    </div>
  );
}

// ====== KASİYER FİŞİ ======

function CashierReceipt({
  order,
  settings,
  business,
  items,
}: {
  order: typeof SAMPLE_ORDER;
  settings: ReceiptSettings;
  business: BusinessInfo;
  items: typeof SAMPLE_ORDER.items;
}) {
  // Gerçek QR SVG generate et
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (!settings.review_qr_enabled) return;
    const sampleUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/deg/ornek-siparis-id`
        : 'https://alegstudio.com/deg/ornek-siparis-id';
    QRCode.toString(sampleUrl, {
      type: 'svg',
      margin: 0,
      width: 100,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((svg) => setQrSvg(svg))
      .catch(() => setQrSvg(''));
  }, [settings.review_qr_enabled]);

  return (
    <>
      {/* Logo + başlık */}
      {settings.show_logo && business.logo_url && (
        <div className="text-center mb-2">
          <img
            src={business.logo_url}
            alt={business.name}
            style={{
              maxHeight: 40,
              maxWidth: '100%',
              filter: 'grayscale(100%) contrast(150%)',
              margin: '0 auto',
            }}
          />
        </div>
      )}

      <div
        className="text-center"
        style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}
      >
        {business.name.toUpperCase()}
      </div>

      {settings.show_tagline && business.tagline && (
        <div
          className="text-center"
          style={{ fontSize: 10, color: '#555' }}
        >
          {business.tagline}
        </div>
      )}

      {settings.show_address && business.address && (
        <div
          className="text-center"
          style={{ fontSize: 9, color: '#555', marginTop: 2 }}
        >
          {business.address}
        </div>
      )}
      {settings.show_phone && business.phone && (
        <div className="text-center" style={{ fontSize: 9, color: '#555' }}>
          Tel: {business.phone}
        </div>
      )}

      {settings.header_text && (
        <div
          className="text-center"
          style={{ fontSize: 10, marginTop: 8, fontStyle: 'italic' }}
        >
          {settings.header_text}
        </div>
      )}

      <Divider double />

      {/* Sipariş meta */}
      <TwoCol left="Sipariş No:" right={`#${order.order_no}`} />
      <TwoCol left="Tarih:" right={formatDateTime(order.created_at)} />
      <TwoCol
        left="Tip:"
        right={
          order.order_type === 'dine_in'
            ? 'MASA'
            : (order.order_type as string) === 'pickup'
              ? 'GEL-AL'
              : 'PAKET'
        }
      />
      {order.table_label && <TwoCol left="Masa:" right={order.table_label} />}
      {order.customer_name && (
        <TwoCol left="Müşteri:" right={order.customer_name} />
      )}

      <Divider />

      {/* Ürünler */}
      {items.map((item, i) => {
        const lineTotal = item.quantity * item.unit_price;
        return (
          <div key={i} style={{ marginBottom: 4 }}>
            <TwoCol
              left={`${item.quantity}x ${item.product_name}`}
              right={formatMoney(lineTotal)}
              bold
            />
            {item.options.map((opt, j) => {
              const deltaStr =
                opt.price_delta !== 0
                  ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta}TL)`
                  : '';
              return (
                <div key={j} style={{ paddingLeft: 12, color: '#555' }}>
                  + {opt.value_name}
                  {deltaStr}
                </div>
              );
            })}
            {item.note && (
              <div style={{ paddingLeft: 12, color: '#555', fontStyle: 'italic' }}>
                Not: {item.note}
              </div>
            )}
          </div>
        );
      })}

      <Divider />

      {/* Toplam */}
      <TwoCol left="Ara toplam:" right={formatMoney(order.subtotal)} />
      <TwoCol
        left="TOPLAM:"
        right={formatMoney(order.total)}
        bold
        large
      />

      <div style={{ marginTop: 12 }} />

      {/* Alt yazı */}
      {settings.footer_text && (
        <div
          className="text-center"
          style={{ fontSize: 10, fontStyle: 'italic' }}
        >
          {settings.footer_text}
        </div>
      )}

      {/* DEĞERLENDİRME QR */}
      {settings.review_qr_enabled && (
        <>
          <div
            style={{
              margin: '10px 0 6px',
              letterSpacing: -1,
              color: '#666',
              fontSize: 9,
            }}
          >
            {'─'.repeat(48)}
          </div>
          <div
            className="text-center"
            style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}
          >
            {settings.review_qr_text || 'Deneyiminizi değerlendirin'}
          </div>
          {/* Gerçek QR */}
          <div className="flex justify-center mb-1">
            {qrSvg ? (
              <div
                style={{
                  width: 100,
                  height: 100,
                  background: 'white',
                  padding: 4,
                }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div
                style={{
                  width: 100,
                  height: 100,
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: '#999',
                }}
              >
                QR yükleniyor...
              </div>
            )}
          </div>
          <div
            className="text-center"
            style={{ fontSize: 9, color: '#666' }}
          >
            Karekodu okutun
          </div>
        </>
      )}

      <div
        className="text-center"
        style={{ fontSize: 9, color: '#888', marginTop: 6 }}
      >
        Aleg POS
      </div>
    </>
  );
}

// ====== MUTFAK FİŞİ ======

function KitchenReceipt({
  order,
  settings,
  stationName,
  items,
}: {
  order: typeof SAMPLE_ORDER;
  settings: ReceiptSettings;
  stationName: string;
  items: typeof SAMPLE_ORDER.items;
}) {
  const big = settings.kitchen_big_font;

  return (
    <>
      {/* İstasyon adı */}
      <div
        className="text-center"
        style={{
          fontSize: big ? 20 : 16,
          fontWeight: 800,
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {stationName.toUpperCase()}
      </div>

      {/* Sipariş no büyük */}
      <div
        className="text-center"
        style={{
          fontSize: big ? 22 : 18,
          fontWeight: 900,
          marginBottom: 6,
        }}
      >
        #{order.order_no}
      </div>

      {/* Masa/Tip */}
      <div
        className="text-center"
        style={{
          fontSize: big ? 14 : 12,
          fontWeight: 700,
        }}
      >
        {order.order_type === 'dine_in' && order.table_label
          ? `MASA: ${order.table_label}`
          : order.order_type === 'pickup'
            ? 'GEL-AL'
            : 'PAKET'}
      </div>
      {order.customer_name && (
        <div
          className="text-center"
          style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}
        >
          {order.customer_name.toUpperCase()}
        </div>
      )}

      <div
        className="text-center"
        style={{ fontSize: 9, color: '#555', marginTop: 2 }}
      >
        {formatDateTime(order.created_at)}
      </div>

      <Divider />

      {/* Ürünler (büyük) */}
      {items.map((item, i) => (
        <div key={i} style={{ marginBottom: big ? 6 : 3 }}>
          <div
            style={{
              fontSize: big ? 14 : 12,
              fontWeight: 800,
              letterSpacing: 0.3,
            }}
          >
            {item.quantity}x {item.product_name.toUpperCase()}
            {settings.kitchen_show_prices && (
              <span style={{ float: 'right', fontWeight: 600 }}>
                {formatMoney(item.quantity * item.unit_price)}
              </span>
            )}
          </div>
          {item.options.map((opt, j) => (
            <div
              key={j}
              style={{
                paddingLeft: 14,
                fontSize: big ? 11 : 10,
                color: '#333',
              }}
            >
              * {opt.value_name}
            </div>
          ))}
          {item.note && settings.kitchen_show_note_highlight && (
            <div
              style={{
                paddingLeft: 14,
                fontSize: big ? 12 : 10,
                fontWeight: 800,
                marginTop: 2,
              }}
            >
              {'>>'} {item.note}
            </div>
          )}
          {item.note && !settings.kitchen_show_note_highlight && (
            <div
              style={{
                paddingLeft: 14,
                fontSize: big ? 11 : 10,
                color: '#333',
                fontStyle: 'italic',
              }}
            >
              Not: {item.note}
            </div>
          )}
        </div>
      ))}

      {/* Müşteri notu */}
      {order.note && (
        <>
          <Divider />
          <div style={{ fontSize: 11, fontWeight: 700 }}>MÜŞTERİ NOTU:</div>
          <div style={{ fontSize: 11 }}>{order.note}</div>
        </>
      )}

      <div style={{ marginTop: 12 }} />
    </>
  );
}

// ====== Helpers ======

function Divider({ double }: { double?: boolean } = {}) {
  const ch = double ? '═' : '─';
  return (
    <div
      style={{
        margin: '6px 0',
        letterSpacing: -1,
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
      }}
    >
      {ch.repeat(48)}
    </div>
  );
}

function TwoCol({
  left,
  right,
  bold,
  large,
}: {
  left: string;
  right: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: bold ? 700 : 400,
        fontSize: large ? 13 : 11,
        letterSpacing: large ? 0.3 : 0,
      }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function formatMoney(n: number): string {
  return `${n.toFixed(2)} TL`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
