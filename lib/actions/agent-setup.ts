'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Agent kurulumu için gereken bilgileri döndür.
 * Sadece işletme sahibine/yöneticisine.
 * Service Role Key döndürmez - o Supabase dashboard'dan alınmalı (güvenlik).
 */
export async function getAgentSetupInfo(): Promise<{
  success: boolean;
  data?: {
    business_id: string;
    business_name: string;
    supabase_url: string;
    panel_url: string;
  };
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Giriş yapmamışsınız');

    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id, role_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) throw new Error('İşletme üyeliği yok');

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', membership.business_id)
      .maybeSingle();

    return {
      success: true,
      data: {
        business_id: membership.business_id as string,
        business_name: (business?.name as string) || 'İşletme',
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        panel_url:
          process.env.NEXT_PUBLIC_PANEL_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://alegstudio.com',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
