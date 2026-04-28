'use client';

/**
 * AgentStatusBadge — Print Agent durumunu gösterir
 *
 * 🟢 AGENT AKTİF — Background agent çalışıyor, sekme yazdırmayı agent'a bıraktı
 * 🟡 SADECE SEKME — Agent kapalı, yazıcıyı sekme yönetiyor (Bluetooth gerekli)
 * ⚫ AGENT YOK — Hiç agent kayıtlı değil
 *
 * Sayfaya 1 kez koy. Tıklayınca tooltip/açıklama açılır.
 */

import { useState } from 'react';
import { useAgentStatus } from '@/lib/hooks/use-agent-status';

type Props = {
  businessId: string;
  /** "kasa" veya "panel" - bu sekmenin agent ile çakışıp çakışmadığını gösterir */
  context?: 'kasa' | 'panel';
};

export function AgentStatusBadge({ businessId, context = 'panel' }: Props) {
  const status = useAgentStatus(businessId);
  const [showInfo, setShowInfo] = useState(false);

  if (status.loading) return null;

  // Renk + ikon + label
  let color = '#777';
  let bgColor = 'rgba(0,0,0,0.04)';
  let icon = '⚫';
  let label = 'AGENT YOK';
  let tooltip =
    'Bluetooth print agent kayıtlı değil. Yazıcı işlemleri tarayıcı (sekme) tarafından yapılır.';

  if (status.hasOnlineAgent) {
    color = '#1f7a3a';
    bgColor = 'rgba(31, 122, 58, 0.1)';
    icon = '🟢';
    label = `AGENT AKTİF${status.onlineCount > 1 ? ` ×${status.onlineCount}` : ''}`;
    tooltip = `Background print agent çalışıyor (${status.onlineCount} cihaz). Yazıcı işlemleri agent tarafından yönetilir — bu ${context === 'kasa' ? 'kasa' : 'panel'} sekmesi yazdırma yapmaz. Çift fiş çıkmaz.`;
  } else if (status.totalCount > 0) {
    color = '#a86700';
    bgColor = 'rgba(168, 103, 0, 0.1)';
    icon = '🟡';
    label = 'AGENT KAPALI';
    tooltip = `${status.totalCount} agent kayıtlı ama hiçbiri online değil. Bu ${context === 'kasa' ? 'kasa' : 'panel'} sekmesi Bluetooth ile yazdıracak. Eğer agent uygulaması da çalışıyorsa çift fiş riski var!`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowInfo((p) => !p)}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] transition-colors"
        style={{
          background: bgColor,
          border: `1px solid ${color}30`,
          color: color,
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
        aria-label={tooltip}
      >
        <span style={{ fontSize: 10 }}>{icon}</span>
        <span>{label}</span>
      </button>

      {showInfo && (
        <div
          className="absolute right-0 mt-1 w-72 p-3 rounded-[10px] z-50"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            top: '100%',
          }}
        >
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: color,
            }}
          >
            YAZICI AGENT DURUMU
          </div>
          <div
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 12,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
            }}
          >
            {tooltip}
          </div>

          {status.totalCount > 0 && !status.hasOnlineAgent && (
            <div
              className="mt-2 pt-2"
              style={{
                borderTop: '1px solid var(--line)',
                fontSize: 11,
                color: 'var(--ink-3)',
                fontStyle: 'italic',
                fontFamily: 'var(--f-serif)',
              }}
            >
              💡 Agent uygulamasını başlat veya bu sekmeyle bluetooth eşleştir.
            </div>
          )}

          {status.hasOnlineAgent && (
            <div
              className="mt-2 pt-2"
              style={{
                borderTop: '1px solid var(--line)',
                fontSize: 11,
                color: 'var(--ink-3)',
                fontStyle: 'italic',
                fontFamily: 'var(--f-serif)',
              }}
            >
              ✓ Birden fazla sekme açsanız bile çift fiş çıkmaz.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
