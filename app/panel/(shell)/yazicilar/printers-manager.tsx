'use client';

import { useState } from 'react';
import type { Printer } from '@/lib/actions/printers';
import type { ReceiptSettings } from '@/types/database';
import { PrintersTab } from './tabs/printers-tab';
import { ReceiptDesignTab } from './tabs/receipt-design-tab';
import { AdvancedTab } from './tabs/advanced-tab';

type TabId = 'printers' | 'receipt' | 'advanced';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'printers', label: 'Yazıcılar', icon: '🖨' },
  { id: 'receipt', label: 'Fiş Tasarımı', icon: '📄' },
  { id: 'advanced', label: 'Gelişmiş', icon: '⚙' },
];

export type StationLite = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type BusinessInfo = {
  name: string;
  tagline: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

export function PrintersManager({
  initialPrinters,
  initialSettings,
  stations,
  business,
}: {
  initialPrinters: Printer[];
  initialSettings: ReceiptSettings;
  stations: StationLite[];
  business: BusinessInfo;
}) {
  const [tab, setTab] = useState<TabId>('printers');
  const [printers, setPrinters] = useState<Printer[]>(initialPrinters);
  const [settings, setSettings] = useState<ReceiptSettings>(initialSettings);

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div
          className="uppercase mb-2"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--ink-3)',
            fontWeight: 700,
          }}
        >
          YAZDIRMA
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
          className="mb-2"
        >
          Yazıcılar & Fiş
        </h1>
        <p className="text-ink-2 text-[15px]">
          Termal fiş yazıcıları bağla, sipariş ve hesap fişlerinin tasarımını özelleştir.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-6 overflow-x-auto"
        style={{
          borderBottom: '1px solid var(--line)',
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3 text-[14px] font-semibold transition-colors relative flex-shrink-0"
              style={{
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                fontFamily: 'var(--f-sans)',
              }}
            >
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
              {active && (
                <span
                  className="absolute left-0 right-0 bottom-0 h-[2px]"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab içerikleri */}
      {tab === 'printers' && (
        <PrintersTab
          printers={printers}
          setPrinters={setPrinters}
          stations={stations}
        />
      )}
      {tab === 'receipt' && (
        <ReceiptDesignTab
          settings={settings}
          setSettings={setSettings}
          business={business}
          printers={printers}
        />
      )}
      {tab === 'advanced' && <AdvancedTab printers={printers} />}
    </div>
  );
}
