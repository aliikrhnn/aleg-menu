'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  enableNotifications,
  disableNotifications,
  getNotificationStatus,
  type NotificationStatus,
} from '@/lib/push-client';
import { sendTestPush } from '@/lib/actions/push-notifications';
import { toast } from '@/components/ui/toast';

/**
 * NotificationBell — Garson/Kasa header'ında bildirim toggle butonu.
 *
 * Stateler:
 *   • desteklenmiyor → gri, devre dışı, tıklama açıklama gösterir
 *   • desteklenir, izin yok, subscribe değil → 🔕, tıkla → izin iste + subscribe
 *   • desteklenir, izin verildi, subscribe → 🔔, tıkla → menü (test gönder, kapat)
 *   • izin reddedildi → ❌, tıkla → "tarayıcı ayarlarından aç" mesajı
 *
 * İlk yüklemede status okunur, browser destek + permission kontrol edilir.
 */
export function NotificationBell() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // İlk yüklemede status oku
  const refreshStatus = useCallback(async () => {
    const s = await getNotificationStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Menü dışına tıklayınca kapat
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [menuOpen]);

  // ─────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────

  const handleEnable = useCallback(async () => {
    setBusy(true);
    const result = await enableNotifications();
    setBusy(false);

    if (result.success) {
      toast.success('Bildirimler etkinleştirildi 🔔', 3000);
      await refreshStatus();
    } else {
      toast.error(result.error || 'Bildirim açılamadı', 5000);
      await refreshStatus();
    }
  }, [refreshStatus]);

  const handleDisable = useCallback(async () => {
    setBusy(true);
    setMenuOpen(false);
    const result = await disableNotifications();
    setBusy(false);

    if (result.success) {
      toast.info('Bildirimler kapatıldı', 3000);
      await refreshStatus();
    } else {
      toast.error(result.error || 'Bildirim kapatılamadı', 5000);
    }
  }, [refreshStatus]);

  const handleTest = useCallback(async () => {
    setBusy(true);
    setMenuOpen(false);
    const result = await sendTestPush();
    setBusy(false);

    if (result.success) {
      toast.success(result.message || 'Test bildirimi gönderildi', 4000);
    } else {
      toast.error(result.error || 'Test gönderilemedi', 5000);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  // Status henüz yüklenmediyse boş yer tut (layout shift önle)
  if (!status) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  // Browser desteklemiyor — gri buton, tıklama açıklama
  if (!status.supported) {
    return (
      <button
        onClick={() =>
          toast.warn(
            'Bu tarayıcı bildirimi desteklemiyor. Chrome veya Edge öneriyoruz.',
            5000
          )
        }
        className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95 opacity-50"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
        }}
        aria-label="Bildirim desteklenmiyor"
      >
        <BellOffIcon />
      </button>
    );
  }

  // İzin reddedildi — kırmızımsı, tıklama açıklama
  if (status.permission === 'denied') {
    return (
      <button
        onClick={() =>
          toast.warn(
            'Bildirim izni reddedildi. Tarayıcı adres çubuğundaki kilit ikonundan izin verebilirsin.',
            6000
          )
        }
        className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95"
        style={{
          background: 'color-mix(in srgb, var(--warn) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warn) 35%, var(--line))',
          color: 'var(--warn)',
        }}
        aria-label="Bildirim engellendi - tarayıcı ayarlarından aç"
      >
        <BellOffIcon />
      </button>
    );
  }

  // Subscribe değil — 🔕, tıkla → izin iste + subscribe
  if (!status.subscribed) {
    return (
      <button
        onClick={handleEnable}
        disabled={busy}
        className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95 disabled:opacity-60"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
        }}
        aria-label="Bildirimleri aç"
        title="Bildirimleri aç"
      >
        <BellOffIcon />
      </button>
    );
  }

  // Subscribe ve aktif — 🔔, tıkla → menü
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((m) => !m);
        }}
        disabled={busy}
        className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-all active:scale-95 disabled:opacity-60"
        style={{
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 35%, var(--line))',
          color: 'var(--accent)',
        }}
        aria-label="Bildirim ayarları"
        title="Bildirimler aktif"
      >
        <BellOnIcon />
      </button>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 z-50 rounded-[10px] overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md, 0 4px 12px rgba(42,31,24,0.12))',
            minWidth: 200,
          }}
        >
          <button
            onClick={handleTest}
            disabled={busy}
            className="w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-2 hover:bg-paper-2 transition-colors disabled:opacity-60"
            style={{ color: 'var(--ink)' }}
          >
            <span>🧪</span>
            <span>Test bildirimi gönder</span>
          </button>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <button
            onClick={handleDisable}
            disabled={busy}
            className="w-full text-left px-3.5 py-2.5 text-[13px] flex items-center gap-2 hover:bg-paper-2 transition-colors disabled:opacity-60"
            style={{ color: 'var(--ink-2)' }}
          >
            <span>🔕</span>
            <span>Bildirimleri kapat</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────

function BellOnIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
