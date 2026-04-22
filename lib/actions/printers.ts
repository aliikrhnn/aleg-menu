'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ReceiptSettings } from '@/types/database';
import { DEFAULT_RECEIPT_SETTINGS } from '@/types/database';

// ============================================================
// Types
// ============================================================

export type Printer = {
  id: string;
  name: string;
  role: 'kitchen' | 'cashier';
  connection_type: 'bluetooth' | 'network';
  bluetooth_device_id: string | null;
  ip_address: string | null;
  port: number;
  paper_width: 32 | 48;
  model: string | null;
  station_id: string | null;
  station_name?: string | null;
  station_color?: string | null;
  station_icon?: string | null;
  copies: number;
  auto_print_new_orders: boolean;
  auto_print_takeaway: boolean;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_success: boolean | null;
  last_test_error: string | null;
};

export type PrinterInput = {
  name: string;
  role: 'kitchen' | 'cashier';
  connection_type: 'bluetooth' | 'network';
  bluetooth_device_id?: string | null;
  ip_address?: string | null;
  port?: number;
  paper_width?: 32 | 48;
  model?: string | null;
  station_id?: string | null;
  copies?: number;
  auto_print_new_orders?: boolean;
  auto_print_takeaway?: boolean;
  is_active?: boolean;
};

export type PrintJob = {
  id: string;
  printer_id: string | null;
  printer_name: string | null;
  order_id: string | null;
  order_no: string | null;
  station_id: string | null;
  station_name: string | null;
  job_type: 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test';
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  created_at: string;
};

// ============================================================
// Business access
// ============================================================

async function requireBusinessAccess(): Promise<{ businessId: string; userId: string }> {
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
  return { businessId: membership.business_id, userId: user.id };
}

// ============================================================
// PRINTERS CRUD
// ============================================================

export async function getPrinters(): Promise<{
  success: boolean;
  printers?: Printer[];
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: printers, error } = await admin
      .from('printers')
      .select('*')
      .eq('business_id', businessId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Station isimlerini ve renklerini çek
    const stationIds = [
      ...new Set(
        (printers || []).map((p) => p.station_id).filter(Boolean)
      ),
    ] as string[];

    const stationMap = new Map<string, { name: string; icon: string; color: string }>();
    if (stationIds.length > 0) {
      const { data: stations } = await admin
        .from('stations')
        .select('id, name, icon, color')
        .in('id', stationIds);
      (stations || []).forEach((s) => {
        stationMap.set(s.id as string, {
          name: s.name as string,
          icon: (s.icon as string) || '●',
          color: (s.color as string) || '#C4553A',
        });
      });
    }

    const result: Printer[] = (printers || []).map((p) => {
      const stationData = p.station_id ? stationMap.get(p.station_id) : null;
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        connection_type: p.connection_type,
        bluetooth_device_id: p.bluetooth_device_id,
        ip_address: p.ip_address,
        port: p.port || 9100,
        paper_width: (p.paper_width || 48) as 32 | 48,
        model: p.model,
        station_id: p.station_id,
        station_name: stationData?.name || null,
        station_icon: stationData?.icon || null,
        station_color: stationData?.color || null,
        copies: p.copies || 1,
        auto_print_new_orders: p.auto_print_new_orders ?? true,
        auto_print_takeaway: p.auto_print_takeaway ?? true,
        is_active: p.is_active ?? true,
        last_tested_at: p.last_tested_at,
        last_test_success: p.last_test_success,
        last_test_error: p.last_test_error,
      };
    });

    return { success: true, printers: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function createPrinter(
  input: PrinterInput
): Promise<{ success: boolean; printer?: Printer; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    if (!input.name?.trim()) return { success: false, error: 'Yazıcı adı gerekli' };

    // Kitchen yazıcıya station zorunlu
    if (input.role === 'kitchen' && !input.station_id) {
      return { success: false, error: 'Mutfak yazıcısı için istasyon seçmelisiniz' };
    }

    // Cashier için station yok
    const stationId = input.role === 'cashier' ? null : input.station_id;

    const { data, error } = await admin
      .from('printers')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        role: input.role,
        connection_type: input.connection_type,
        bluetooth_device_id: input.bluetooth_device_id || null,
        ip_address: input.ip_address || null,
        port: input.port || 9100,
        paper_width: input.paper_width || 48,
        model: input.model || null,
        station_id: stationId,
        copies: input.copies || 1,
        auto_print_new_orders: input.auto_print_new_orders ?? true,
        auto_print_takeaway: input.auto_print_takeaway ?? true,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/yazicilar');

    // Station bilgisini tekrar çek
    let stationData: { name: string; icon: string; color: string } | null = null;
    if (data.station_id) {
      const { data: s } = await admin
        .from('stations')
        .select('name, icon, color')
        .eq('id', data.station_id)
        .maybeSingle();
      if (s) {
        stationData = {
          name: s.name as string,
          icon: (s.icon as string) || '●',
          color: (s.color as string) || '#C4553A',
        };
      }
    }

    const printer: Printer = {
      id: data.id,
      name: data.name,
      role: data.role,
      connection_type: data.connection_type,
      bluetooth_device_id: data.bluetooth_device_id,
      ip_address: data.ip_address,
      port: data.port || 9100,
      paper_width: (data.paper_width || 48) as 32 | 48,
      model: data.model,
      station_id: data.station_id,
      station_name: stationData?.name || null,
      station_icon: stationData?.icon || null,
      station_color: stationData?.color || null,
      copies: data.copies || 1,
      auto_print_new_orders: data.auto_print_new_orders ?? true,
      auto_print_takeaway: data.auto_print_takeaway ?? true,
      is_active: data.is_active ?? true,
      last_tested_at: data.last_tested_at,
      last_test_success: data.last_test_success,
      last_test_error: data.last_test_error,
    };

    return { success: true, printer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function updatePrinter(
  printerId: string,
  input: Partial<PrinterInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('printers')
      .select('id, role')
      .eq('id', printerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Yazıcı bulunamadı' };

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.role !== undefined) updates.role = input.role;
    if (input.connection_type !== undefined) updates.connection_type = input.connection_type;
    if (input.bluetooth_device_id !== undefined) updates.bluetooth_device_id = input.bluetooth_device_id;
    if (input.ip_address !== undefined) updates.ip_address = input.ip_address;
    if (input.port !== undefined) updates.port = input.port;
    if (input.paper_width !== undefined) updates.paper_width = input.paper_width;
    if (input.model !== undefined) updates.model = input.model;
    if (input.station_id !== undefined) updates.station_id = input.station_id;
    if (input.copies !== undefined) updates.copies = input.copies;
    if (input.auto_print_new_orders !== undefined) updates.auto_print_new_orders = input.auto_print_new_orders;
    if (input.auto_print_takeaway !== undefined) updates.auto_print_takeaway = input.auto_print_takeaway;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    // Cashier ise station null
    const finalRole = (updates.role as string) || existing.role;
    if (finalRole === 'cashier') updates.station_id = null;

    if (Object.keys(updates).length === 0) return { success: true };

    const { error } = await admin
      .from('printers')
      .update(updates)
      .eq('id', printerId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/yazicilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function deletePrinter(
  printerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('printers')
      .select('id')
      .eq('id', printerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) return { success: false, error: 'Yazıcı bulunamadı' };

    const { error } = await admin
      .from('printers')
      .delete()
      .eq('id', printerId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/yazicilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// RECEIPT SETTINGS
// ============================================================

export async function getReceiptSettings(): Promise<{
  success: boolean;
  settings?: ReceiptSettings;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('businesses')
      .select('receipt_settings')
      .eq('id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    const settings = {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...((data?.receipt_settings as ReceiptSettings) || {}),
    };

    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function updateReceiptSettings(
  settings: Partial<ReceiptSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Mevcut ayarları al
    const { data: current } = await admin
      .from('businesses')
      .select('receipt_settings')
      .eq('id', businessId)
      .maybeSingle();

    const merged = {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...((current?.receipt_settings as ReceiptSettings) || {}),
      ...settings,
    };

    const { error } = await admin
      .from('businesses')
      .update({ receipt_settings: merged })
      .eq('id', businessId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/panel/yazicilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// PRINT JOB - Manual trigger (POS'tan "hesap yazdır" butonu)
// ============================================================

export async function requestCashierReceipt(
  orderId: string
): Promise<{ success: boolean; jobIds?: string[]; error?: string }> {
  try {
    const { businessId, userId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Orderı doğrula
    const { data: order } = await admin
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!order) return { success: false, error: 'Sipariş bulunamadı' };

    // Aktif kasa yazıcılarını bul
    const { data: printers } = await admin
      .from('printers')
      .select('id')
      .eq('business_id', businessId)
      .eq('role', 'cashier')
      .eq('is_active', true);

    if (!printers || printers.length === 0) {
      return { success: false, error: 'Tanımlı aktif kasa yazıcısı yok. /panel/yazicilar sayfasından ekleyin.' };
    }

    // Her kasa yazıcısı için print job oluştur
    const jobIds: string[] = [];
    for (const printer of printers) {
      const { data: job } = await admin
        .from('print_jobs')
        .insert({
          business_id: businessId,
          printer_id: printer.id,
          order_id: orderId,
          job_type: 'cashier',
          status: 'pending',
          triggered_by: 'manual',
          user_id: userId,
        })
        .select('id')
        .single();

      if (job) jobIds.push(job.id);
    }

    return { success: true, jobIds };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

export async function requestKitchenReprint(
  orderId: string,
  stationId?: string | null // null = tüm istasyonlara
): Promise<{ success: boolean; jobIds?: string[]; error?: string }> {
  try {
    const { businessId, userId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Sipariş + itemlar
    const { data: order } = await admin
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!order) return { success: false, error: 'Sipariş bulunamadı' };

    // Siparişin hangi istasyonlara düştüğünü bul
    const { data: items } = await admin
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);

    const productIds = [
      ...new Set((items || []).map((i) => i.product_id).filter(Boolean)),
    ] as string[];

    let targetStationIds: string[] = [];
    if (productIds.length > 0) {
      const { data: products } = await admin
        .from('products')
        .select('station_id')
        .in('id', productIds);
      targetStationIds = [
        ...new Set(
          (products || [])
            .map((p) => p.station_id as string | null)
            .filter(Boolean) as string[]
        ),
      ];
    }

    // Belirli bir istasyon istenmiş ise filtrele
    if (stationId) {
      targetStationIds = targetStationIds.filter((id) => id === stationId);
    }

    if (targetStationIds.length === 0) {
      return { success: false, error: 'Bu siparişin hiçbir item\'ı bir istasyona bağlı değil' };
    }

    // Her istasyonun aktif yazıcılarını bul
    const { data: printers } = await admin
      .from('printers')
      .select('id, station_id')
      .eq('business_id', businessId)
      .eq('role', 'kitchen')
      .eq('is_active', true)
      .in('station_id', targetStationIds);

    if (!printers || printers.length === 0) {
      return { success: false, error: 'Bu istasyonlarda tanımlı yazıcı yok' };
    }

    const jobIds: string[] = [];
    for (const printer of printers) {
      const { data: job } = await admin
        .from('print_jobs')
        .insert({
          business_id: businessId,
          printer_id: printer.id,
          order_id: orderId,
          station_id: printer.station_id,
          job_type: 'reprint_kitchen',
          status: 'pending',
          triggered_by: 'manual',
          user_id: userId,
        })
        .select('id')
        .single();

      if (job) jobIds.push(job.id);
    }

    return { success: true, jobIds };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Test fişi — yazıcıyı doğrulamak için
// previewType verilirse gerçek ayarlar + mock sipariş ile basılır
// Verilmezse sabit "ALEG TEST" fişi basılır
export async function requestTestPrint(
  printerId: string,
  previewType?: 'cashier' | 'kitchen'
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { businessId, userId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: printer } = await admin
      .from('printers')
      .select('id, station_id')
      .eq('id', printerId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!printer) return { success: false, error: 'Yazıcı bulunamadı' };

    const { data: job, error } = await admin
      .from('print_jobs')
      .insert({
        business_id: businessId,
        printer_id: printerId,
        // previewType verilirse o tipte, değilse sabit test
        job_type: previewType || 'test',
        // Mutfak preview'da kendi station'ına göre
        station_id:
          previewType === 'kitchen' ? printer.station_id : null,
        status: 'pending',
        triggered_by: 'manual',
        user_id: userId,
      })
      .select('id')
      .single();

    if (error || !job) return { success: false, error: error?.message || 'Job oluşturulamadı' };

    return { success: true, jobId: job.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Print job sonucunu kaydet (client tarafından çağrılır yazdırma bitince)
export async function completePrintJob(
  jobId: string,
  success: boolean,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('print_jobs')
      .update({
        status: success ? 'success' : 'failed',
        error_message: errorMessage || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
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

// Yazıcı test sonucunu kaydet
export async function recordPrinterTest(
  printerId: string,
  success: boolean,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { error } = await admin
      .from('printers')
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_success: success,
        last_test_error: errorMessage || null,
      })
      .eq('id', printerId)
      .eq('business_id', businessId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/panel/yazicilar');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Son print job'ları (log için)
export async function getRecentPrintJobs(
  limit: number = 50
): Promise<{ success: boolean; jobs?: PrintJob[]; error?: string }> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    const { data: jobs, error } = await admin
      .from('print_jobs')
      .select(`
        id, printer_id, order_id, station_id, job_type, status, error_message, created_at
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { success: false, error: error.message };

    // Printer + order + station isimlerini çek
    const printerIds = [...new Set((jobs || []).map((j) => j.printer_id).filter(Boolean))] as string[];
    const orderIds = [...new Set((jobs || []).map((j) => j.order_id).filter(Boolean))] as string[];
    const stationIds = [...new Set((jobs || []).map((j) => j.station_id).filter(Boolean))] as string[];

    const [printersRes, ordersRes, stationsRes] = await Promise.all([
      printerIds.length ? admin.from('printers').select('id, name').in('id', printerIds) : Promise.resolve({ data: [] }),
      orderIds.length ? admin.from('orders').select('id').in('id', orderIds) : Promise.resolve({ data: [] }),
      stationIds.length ? admin.from('stations').select('id, name').in('id', stationIds) : Promise.resolve({ data: [] }),
    ]);

    const printerMap = new Map((printersRes.data || []).map((p) => [p.id, p.name]));
    const orderMap = new Map((ordersRes.data || []).map((o) => [o.id, (o.id as string).slice(0, 8).toUpperCase()]));
    const stationMap = new Map((stationsRes.data || []).map((s) => [s.id, s.name]));

    const result: PrintJob[] = (jobs || []).map((j) => ({
      id: j.id,
      printer_id: j.printer_id,
      printer_name: j.printer_id ? (printerMap.get(j.printer_id) as string) || null : null,
      order_id: j.order_id,
      order_no: j.order_id ? (orderMap.get(j.order_id) as string) || null : null,
      station_id: j.station_id,
      station_name: j.station_id ? (stationMap.get(j.station_id) as string) || null : null,
      job_type: j.job_type,
      status: j.status,
      error_message: j.error_message,
      created_at: j.created_at,
    }));

    return { success: true, jobs: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// Client'ın yazdırması için job detayını çek (order items + business info)
export async function getPrintJobDetails(jobId: string): Promise<{
  success: boolean;
  data?: {
    job: {
      id: string;
      job_type: 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test';
      printer: Printer;
    };
    order?: {
      id: string;
      order_no: string;
      created_at: string;
      order_type: 'dine_in' | 'pickup' | 'delivery';
      table_label: string | null;
      customer_name: string | null;
      customer_phone: string | null;
      note: string | null;
      subtotal: number;
      total: number;
      items: Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
        note: string | null;
        station_id: string | null;
        options: Array<{
          preset_name: string;
          value_name: string;
          price_delta: number;
        }>;
      }>;
    };
    business: {
      name: string;
      tagline: string | null;
      phone: string | null;
      address: string | null;
      logo_url: string | null;
      receipt_settings: ReceiptSettings;
    };
    station_name?: string | null;
  };
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // Job + printer
    const { data: job } = await admin
      .from('print_jobs')
      .select('id, job_type, printer_id, order_id, station_id')
      .eq('id', jobId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!job) return { success: false, error: 'Job bulunamadı' };

    const { data: printerRow } = await admin
      .from('printers')
      .select('*')
      .eq('id', job.printer_id as string)
      .maybeSingle();

    if (!printerRow) return { success: false, error: 'Yazıcı bulunamadı' };

    // Business
    const { data: business } = await admin
      .from('businesses')
      .select('name, tagline_tr, tagline_en, phone, address, logo_url, receipt_settings')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) return { success: false, error: 'İşletme bulunamadı' };

    const receiptSettings: ReceiptSettings = {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...((business.receipt_settings as ReceiptSettings) || {}),
    };

    const printer: Printer = {
      id: printerRow.id,
      name: printerRow.name,
      role: printerRow.role,
      connection_type: printerRow.connection_type,
      bluetooth_device_id: printerRow.bluetooth_device_id,
      ip_address: printerRow.ip_address,
      port: printerRow.port || 9100,
      paper_width: (printerRow.paper_width || 48) as 32 | 48,
      model: printerRow.model,
      station_id: printerRow.station_id,
      copies: printerRow.copies || 1,
      auto_print_new_orders: printerRow.auto_print_new_orders ?? true,
      auto_print_takeaway: printerRow.auto_print_takeaway ?? true,
      is_active: printerRow.is_active ?? true,
      last_tested_at: printerRow.last_tested_at,
      last_test_success: printerRow.last_test_success,
      last_test_error: printerRow.last_test_error,
    };

    const businessInfo = {
      name: business.name as string,
      tagline:
        (business.tagline_tr as string) ||
        (business.tagline_en as string) ||
        null,
      phone: (business.phone as string) || null,
      address: (business.address as string) || null,
      logo_url: (business.logo_url as string) || null,
      receipt_settings: receiptSettings,
    };

    // Test fişi - sipariş yok
    if (job.job_type === 'test') {
      return {
        success: true,
        data: {
          job: { id: job.id, job_type: 'test', printer },
          business: businessInfo,
        },
      };
    }

    // Order detayları
    if (!job.order_id) return { success: false, error: 'Job siparişe bağlı değil' };

    const { data: orderRow } = await admin
      .from('orders')
      .select('id, order_type, customer_name, customer_phone, note, subtotal, total, created_at, table_id')
      .eq('id', job.order_id)
      .maybeSingle();

    if (!orderRow) return { success: false, error: 'Sipariş bulunamadı' };

    // Masa adı
    let tableLabel: string | null = null;
    if (orderRow.table_id) {
      const { data: table } = await admin
        .from('tables')
        .select('name')
        .eq('id', orderRow.table_id)
        .maybeSingle();
      tableLabel = (table?.name as string) || null;
    }

    // Items
    const { data: itemsRaw } = await admin
      .from('order_items')
      .select('id, product_id, product_name, quantity, unit_price, note, options')
      .eq('order_id', job.order_id);

    const productIds = [
      ...new Set((itemsRaw || []).map((i) => i.product_id).filter(Boolean)),
    ] as string[];

    const productStationMap = new Map<string, string | null>();
    if (productIds.length > 0) {
      const { data: products } = await admin
        .from('products')
        .select('id, station_id')
        .in('id', productIds);
      (products || []).forEach((p) => {
        productStationMap.set(p.id as string, (p.station_id as string | null) || null);
      });
    }

    let items = (itemsRaw || []).map((i) => ({
      product_name: i.product_name as string,
      quantity: i.quantity as number,
      unit_price: i.unit_price as number,
      note: (i.note as string | null) || null,
      station_id: i.product_id ? productStationMap.get(i.product_id as string) || null : null,
      options: Array.isArray(i.options)
        ? (i.options as Array<{ preset_name: string; value_name: string; price_delta: number }>)
        : [],
    }));

    // Mutfak fişi ise sadece bu istasyonun item'ları
    if ((job.job_type === 'kitchen' || job.job_type === 'reprint_kitchen') && job.station_id) {
      items = items.filter((i) => i.station_id === job.station_id);
    }

    // Station name
    let stationName: string | null = null;
    if (job.station_id) {
      const { data: s } = await admin
        .from('stations')
        .select('name')
        .eq('id', job.station_id)
        .maybeSingle();
      stationName = (s?.name as string) || null;
    }

    return {
      success: true,
      data: {
        job: { id: job.id, job_type: job.job_type as 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test', printer },
        order: {
          id: orderRow.id as string,
          order_no: (orderRow.id as string).slice(0, 8).toUpperCase(),
          created_at: orderRow.created_at as string,
          order_type: orderRow.order_type as 'dine_in' | 'pickup' | 'delivery',
          table_label: tableLabel,
          customer_name: (orderRow.customer_name as string) || null,
          customer_phone: (orderRow.customer_phone as string) || null,
          note: (orderRow.note as string) || null,
          subtotal: orderRow.subtotal as number,
          total: orderRow.total as number,
          items,
        },
        business: businessInfo,
        station_name: stationName,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}
