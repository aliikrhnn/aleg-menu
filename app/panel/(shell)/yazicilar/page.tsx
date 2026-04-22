import { createClient } from '@/lib/supabase/server';
import { getPrinters, getReceiptSettings } from '@/lib/actions/printers';
import { getStations } from '@/lib/actions/stations';
import { PrintersManager } from './printers-manager';
import { DEFAULT_RECEIPT_SETTINGS } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function PrintersPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user?.id || '')
    .eq('status', 'active')
    .maybeSingle();

  const businessId = membership?.business_id;

  const { data: business } = await supabase
    .from('businesses')
    .select('name, tagline_tr, tagline_en, phone, address, logo_url')
    .eq('id', businessId || '')
    .maybeSingle();

  const [printersResult, stationsResult, settingsResult] = await Promise.all([
    getPrinters(),
    getStations(),
    getReceiptSettings(),
  ]);

  const printers = printersResult.success ? printersResult.printers || [] : [];
  const stations = stationsResult.success ? (stationsResult.stations || []).filter(s => s.is_active) : [];
  const settings = settingsResult.success
    ? settingsResult.settings!
    : DEFAULT_RECEIPT_SETTINGS;

  const businessInfo = {
    name: (business?.name as string) || 'İşletme',
    tagline:
      (business?.tagline_tr as string) ||
      (business?.tagline_en as string) ||
      null,
    phone: (business?.phone as string) || null,
    address: (business?.address as string) || null,
    logo_url: (business?.logo_url as string) || null,
  };

  return (
    <PrintersManager
      initialPrinters={printers}
      initialSettings={settings}
      stations={stations.map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
      }))}
      business={businessInfo}
    />
  );
}
