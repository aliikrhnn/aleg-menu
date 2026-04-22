'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type AgentInfo = {
  id: string;
  name: string;
  version: string | null;
  last_seen_at: string | null;
  last_job_at: string | null;
  jobs_processed: number;
  is_active: boolean;
  // Hesaplanan
  is_online: boolean;
  seconds_since_seen: number | null;
};

async function requireBusinessAccess(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş yapmamışsınız');

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) throw new Error('İşletme üyeliği bulunamadı');
  return membership.business_id as string;
}

export async function getAgents(): Promise<{
  success: boolean;
  agents?: AgentInfo[];
  error?: string;
}> {
  try {
    const businessId = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('printer_agents')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const now = Date.now();
    const agents: AgentInfo[] = (data || []).map((a) => {
      const lastSeen = a.last_seen_at
        ? new Date(a.last_seen_at as string).getTime()
        : null;
      const seconds = lastSeen ? Math.floor((now - lastSeen) / 1000) : null;
      // 90 saniye içinde heartbeat atmışsa online sayılır (heartbeat 30sn'de bir)
      const isOnline = seconds !== null && seconds < 90;

      return {
        id: a.id as string,
        name: a.name as string,
        version: (a.version as string) || null,
        last_seen_at: (a.last_seen_at as string) || null,
        last_job_at: (a.last_job_at as string) || null,
        jobs_processed: (a.jobs_processed as number) || 0,
        is_active: (a.is_active as boolean) ?? true,
        is_online: isOnline,
        seconds_since_seen: seconds,
      };
    });

    return { success: true, agents };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function deleteAgent(
  agentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const businessId = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('printer_agents')
      .delete()
      .eq('id', agentId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
