'use client';

/**
 * useAgentStatus — Print Agent'ın online olup olmadığını dinler
 *
 * Background agent (Bluetooth Print Agent / native uygulama) çalışıyorsa
 * tarayıcı sekmesinin yazdırma yapmasını engellemek için kullanılır.
 *
 * Agent 30 saniyede bir heartbeat atar → 90 saniye içinde son görüldüyse
 * "online" sayılır.
 *
 * Bu hook 30 saniyede bir DB'den check eder + Supabase realtime ile
 * printer_agents tablosundaki UPDATE event'lerini dinler.
 */

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export type AgentStatus = {
  /** En az bir aktif agent online mu? */
  hasOnlineAgent: boolean;
  /** Online agent sayısı */
  onlineCount: number;
  /** Toplam aktif agent sayısı (online + offline) */
  totalCount: number;
  /** İlk yüklemede true, sonradan false */
  loading: boolean;
};

const POLL_INTERVAL_MS = 30_000; // 30 sn
const ONLINE_THRESHOLD_SECONDS = 90; // 90 sn içinde heartbeat → online

export function useAgentStatus(businessId: string | null): AgentStatus {
  const [status, setStatus] = useState<AgentStatus>({
    hasOnlineAgent: false,
    onlineCount: 0,
    totalCount: 0,
    loading: true,
  });

  useEffect(() => {
    if (!businessId) {
      setStatus({
        hasOnlineAgent: false,
        onlineCount: 0,
        totalCount: 0,
        loading: false,
      });
      return;
    }

    let alive = true;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function check() {
      const { data } = await supabase
        .from('printer_agents')
        .select('id, last_seen_at, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (!alive) return;

      const now = Date.now();
      let onlineCount = 0;
      const total = (data || []).length;
      for (const a of data || []) {
        const lastSeen = a.last_seen_at
          ? new Date(a.last_seen_at as string).getTime()
          : 0;
        const seconds = lastSeen ? Math.floor((now - lastSeen) / 1000) : Infinity;
        if (seconds < ONLINE_THRESHOLD_SECONDS) onlineCount++;
      }

      setStatus({
        hasOnlineAgent: onlineCount > 0,
        onlineCount,
        totalCount: total,
        loading: false,
      });
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    // Realtime - agent heartbeat geldiğinde anında güncelle
    const channel = supabase
      .channel('agent-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'printer_agents',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          // Heartbeat veya yeni agent → tazele
          check();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  return status;
}
