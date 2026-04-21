'use client';

import type { BusinessSettings } from '@/lib/actions/settings';
import { Card } from '../shared';

interface Props {
  settings: BusinessSettings;
}

export function PreviewTab({ settings }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Sol: Müşteri menüsü önizlemesi */}
      <Card title="Müşteri Menüsü" description="QR taradığında müşterinin gördüğü ekran">
        <div
          className="rounded-[14px] overflow-hidden"
          style={{
            background: '#F4EEE2',
            border: '1px solid #D6C9B2',
          }}
        >
          {/* Hero */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#7a9e5a' }}
              />
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#8C7A69',
                }}
              >
                {settings.city ? `${settings.city} · ` : ''}AÇIK
              </span>
            </div>

            <div className="flex items-center gap-3">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt=""
                  className="w-14 h-14 rounded-[14px] object-contain"
                  style={{ background: '#FAF5EA' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-[14px] grid place-items-center flex-shrink-0"
                  style={{
                    background: '#2A1F18',
                    color: '#F4EEE2',
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 28,
                    fontWeight: 600,
                  }}
                >
                  {settings.name?.[0]?.toUpperCase() || 'A'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 28,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: '#2A1F18',
                    lineHeight: 1,
                  }}
                  className="truncate"
                >
                  {settings.name || 'İşletme adı'}
                </h2>
                {settings.tagline_tr && (
                  <p
                    className="mt-1 truncate text-[12px]"
                    style={{ color: '#5A4A3D' }}
                  >
                    {settings.tagline_tr}
                  </p>
                )}
              </div>
            </div>

            {/* Mini menü kart gösterimi */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <MiniProductCard name="Filtre Kahve" price={`${currencySymbol(settings.currency)}65`} />
              <MiniProductCard name="Latte" price={`${currencySymbol(settings.currency)}85`} />
            </div>
          </div>

          {/* Footer - iletişim */}
          {(settings.address || settings.phone || settings.instagram) && (
            <div
              className="px-5 py-4"
              style={{
                background: '#EDE4D3',
                borderTop: '1px solid #D6C9B2',
              }}
            >
              <div
                className="uppercase mb-1.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  color: '#8C7A69',
                }}
              >
                BİZE ULAŞ
              </div>
              {settings.address && (
                <div
                  className="text-[11px] mb-0.5"
                  style={{ color: '#5A4A3D', lineHeight: 1.4 }}
                >
                  📍 {settings.address}
                </div>
              )}
              {settings.phone && (
                <div className="text-[11px] mb-0.5" style={{ color: '#5A4A3D' }}>
                  📞 {settings.phone}
                </div>
              )}
              {settings.instagram && (
                <div className="text-[11px]" style={{ color: '#5A4A3D' }}>
                  📷 @{settings.instagram}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Sağ: QR kartı önizlemesi */}
      <Card title="QR Kart" description="Her masaya yapıştırılacak QR kodunda logon nasıl görünecek">
        <div className="flex flex-col gap-3">
          {/* Warm QR card mock */}
          <div
            className="rounded-[14px] p-8 text-center"
            style={{
              background: '#F4EEE2',
              border: '1px solid #D6C9B2',
            }}
          >
            <div
              className="uppercase mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: '#C4553A',
              }}
            >
              QR · SİPARİŞ
            </div>
            <div
              className="w-16 h-[1px] mx-auto mb-6"
              style={{ background: '#D6C9B2' }}
            />
            {/* Logo + QR placeholder */}
            <div className="flex flex-col items-center gap-3 mb-4">
              {settings.logo_url && (
                <img
                  src={settings.logo_url}
                  alt=""
                  className="h-10 object-contain"
                />
              )}
              <div
                className="w-28 h-28 rounded-[8px] grid place-items-center"
                style={{ background: '#FFFDF7', border: '1px solid #D6C9B2' }}
              >
                <svg width="72" height="72" viewBox="0 0 72 72" fill="#2A1F18">
                  {/* Fake QR pattern */}
                  <rect x="0" y="0" width="16" height="16" />
                  <rect x="4" y="4" width="8" height="8" fill="#F4EEE2" />
                  <rect x="56" y="0" width="16" height="16" />
                  <rect x="60" y="4" width="8" height="8" fill="#F4EEE2" />
                  <rect x="0" y="56" width="16" height="16" />
                  <rect x="4" y="60" width="8" height="8" fill="#F4EEE2" />
                  <rect x="24" y="4" width="4" height="4" />
                  <rect x="32" y="12" width="4" height="4" />
                  <rect x="40" y="4" width="4" height="4" />
                  <rect x="48" y="12" width="4" height="4" />
                  <rect x="24" y="24" width="4" height="4" />
                  <rect x="36" y="28" width="4" height="4" />
                  <rect x="48" y="32" width="4" height="4" />
                  <rect x="20" y="40" width="4" height="4" />
                  <rect x="36" y="44" width="4" height="4" />
                  <rect x="52" y="40" width="4" height="4" />
                  <rect x="28" y="52" width="4" height="4" />
                  <rect x="44" y="60" width="4" height="4" />
                </svg>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 500,
                letterSpacing: '-1.2px',
                color: '#2A1F18',
                lineHeight: 1,
              }}
            >
              Masa 1
            </div>
            <div
              className="uppercase mt-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.24em',
                color: '#8C7A69',
              }}
            >
              {(settings.name || 'İŞLETME').toUpperCase()}
            </div>
            <div
              className="mt-5"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 14,
                color: '#5A4A3D',
              }}
            >
              kameranı aç, menüyü görüntüle
            </div>
            <div
              className="text-right mt-3 italic"
              style={{
                fontFamily: 'var(--f-serif)',
                fontSize: 9,
                color: '#8C7A69',
                opacity: 0.85,
              }}
            >
              aleg
            </div>
          </div>

          <div
            className="text-[11px] text-ink-3 px-3 py-2 rounded-[8px]"
            style={{ background: 'var(--paper-2)' }}
          >
            💡 Logo eklediğinde QR kartlarının üstünde küçük boyutta görünür. Masalar → QR İndir'den yazdırabilirsin.
          </div>
        </div>
      </Card>
    </div>
  );
}

function MiniProductCard({ name, price }: { name: string; price: string }) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: '#FAF5EA',
        border: '1px solid #D6C9B2',
      }}
    >
      <div className="w-full h-12 rounded-[6px] mb-2" style={{ background: '#E5D9C1' }} />
      <div
        className="text-[12px] font-medium truncate"
        style={{ color: '#2A1F18' }}
      >
        {name}
      </div>
      <div
        className="text-[11px]"
        style={{ color: '#C4553A', fontFamily: 'var(--f-mono)', fontWeight: 700 }}
      >
        {price}
      </div>
    </div>
  );
}

function currencySymbol(code: string): string {
  return { TRY: '₺', EUR: '€', USD: '$', GBP: '£' }[code] || '₺';
}
