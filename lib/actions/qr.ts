'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ============================================================
// QR Codes - Server Actions
// ============================================================

async function requireBusinessAccess() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Giriş yapmamışsınız');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) {
    throw new Error('İşletme üyeliği bulunamadı');
  }

  return { supabase, businessId: membership.business_id };
}

// ============================================================
// Tüm masalar için QR kodları al (yoksa oluştur)
// ============================================================

export type TableWithQr = {
  table_id: string;
  table_name: string;
  zone_name: string | null;
  zone_color: string | null;
  qr_slug: string;
  qr_url: string; // Tam URL (tarayınca buraya gider)
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 't';
}

export async function getAllTablesWithQr(): Promise<{
  success: boolean;
  tables?: TableWithQr[];
  businessSlug?: string;
  rootDomain?: string;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessAccess();
    const admin = createAdminClient();

    // İşletme slug ve root domain (QR URL için)
    const { data: business } = await admin
      .from('businesses')
      .select('slug')
      .eq('id', businessId)
      .maybeSingle();

    if (!business) {
      return { success: false, error: 'İşletme bulunamadı' };
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';

    // Tüm aktif masaları çek + bölge bilgisiyle
    const { data: tables, error: tablesError } = await admin
      .from('tables')
      .select('id, name, zone_id, table_zones(name, color)')
      .eq('business_id', businessId)
      .neq('status', 'inactive')
      .order('name', { ascending: true });

    if (tablesError) {
      return { success: false, error: tablesError.message };
    }

    if (!tables || tables.length === 0) {
      return {
        success: true,
        tables: [],
        businessSlug: business.slug,
        rootDomain,
      };
    }

    // Bu masaların mevcut QR kodları
    const tableIds = tables.map((t) => t.id);
    const { data: existingQrs } = await admin
      .from('qr_codes')
      .select('id, table_id, slug')
      .eq('business_id', businessId)
      .in('table_id', tableIds);

    const qrByTable = new Map<string, string>();
    (existingQrs || []).forEach((q) => {
      if (q.table_id) qrByTable.set(q.table_id, q.slug);
    });

    // Eksik QR'ları oluştur
    const toCreate: Array<{
      business_id: string;
      table_id: string;
      slug: string;
      purpose: 'table';
      active: boolean;
    }> = [];

    // Benzersiz slug üretmek için mevcut slug'ları da al
    const { data: allSlugs } = await admin
      .from('qr_codes')
      .select('slug')
      .eq('business_id', businessId);
    const usedSlugs = new Set((allSlugs || []).map((s) => s.slug));

    for (const table of tables) {
      if (qrByTable.has(table.id)) continue;

      // Masa adından slug türet: "Masa 1" → "masa-1"
      const base = slugify(table.name);
      let candidate = base;
      let n = 1;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      usedSlugs.add(candidate);
      qrByTable.set(table.id, candidate);

      toCreate.push({
        business_id: businessId,
        table_id: table.id,
        slug: candidate,
        purpose: 'table',
        active: true,
      });
    }

    if (toCreate.length > 0) {
      const { error: insertError } = await admin.from('qr_codes').insert(toCreate);
      if (insertError) {
        console.error('QR insert error:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    // Sonuç
    const result: TableWithQr[] = tables.map((t) => {
      const zoneData = Array.isArray(t.table_zones) ? t.table_zones[0] : t.table_zones;
      const slug = qrByTable.get(t.id) || slugify(t.name);
      return {
        table_id: t.id,
        table_name: t.name,
        zone_name: zoneData?.name || null,
        zone_color: zoneData?.color || null,
        qr_slug: slug,
        qr_url: `https://${business.slug}.${rootDomain}/?t=${slug}`,
      };
    });

    return {
      success: true,
      tables: result,
      businessSlug: business.slug,
      rootDomain,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

// ============================================================
// Slug → table_id çözücü (müşteri menü sayfasında kullanılır)
// ============================================================

export async function resolveQrSlug(
  businessId: string,
  slug: string
): Promise<{
  success: boolean;
  table_id?: string;
  table_name?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const { data: qr, error } = await admin
      .from('qr_codes')
      .select('table_id, tables(name)')
      .eq('business_id', businessId)
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle();

    if (error || !qr || !qr.table_id) {
      return { success: false, error: 'QR kod geçersiz' };
    }

    // Scan count artır (async, beklemeden)
    admin
      .from('qr_codes')
      .update({
        last_scanned_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('slug', slug)
      .then(() => {});

    const tableData = Array.isArray(qr.tables) ? qr.tables[0] : qr.tables;

    return {
      success: true,
      table_id: qr.table_id,
      table_name: tableData?.name || undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Hata',
    };
  }
}
