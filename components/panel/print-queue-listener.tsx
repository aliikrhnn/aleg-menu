'use client';

/**
 * Print Queue Listener v2
 *
 * Değişiklikler:
 * - Otomatik retry (3sn sonra 1 kez daha denenir, başarısız olursa failed)
 * - Global toast sistemine bağlandı
 * - Kendi özel toast UI'sı kaldırıldı (artık sağ üstteki ortak sistem kullanılıyor)
 * - Retry sırasında kullanıcıya "Tekrar deniyor..." bilgisi verilir
 * - UPDATE listener: retryPrintJob çağrılınca otomatik yakalar
 */

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  getPrintJobDetails,
  completePrintJob,
} from '@/lib/actions/printers';
import {
  buildKitchenTicket,
  buildCashierReceipt,
  buildTestReceipt,
  type OrderForPrint,
  type ReceiptOptions,
} from '@/lib/printer/escpos';
import {
  sendToBluetoothPrinter,
  isWebBluetoothSupported,
} from '@/lib/printer/bluetooth-client';
import { toast } from '@/components/ui/toast';

export function PrintQueueListener({ businessId }: { businessId: string }) {
  const processedJobs = useRef<Set<string>>(new Set());
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!businessId || !isWebBluetoothSupported()) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function processJob(jobId: string, isRetry = false) {
      if (processedJobs.current.has(jobId) && !isRetry) return;
      processedJobs.current.add(jobId);

      const result = await getPrintJobDetails(jobId);
      if (!result.success || !result.data) {
        await completePrintJob(jobId, false, result.error || 'Detay alınamadı');
        toast.error(`Yazdırma detayı alınamadı: ${result.error || 'Bilinmeyen hata'}`);
        return;
      }

      const { job, order, business } = result.data;
      const printer = job.printer;

      // Network yazıcıları Agent işler - tarayıcı karışmasın
      if (printer.connection_type === 'network') {
        return;
      }

      // Bluetooth bağlantı yoksa hata
      if (printer.connection_type !== 'bluetooth' || !printer.bluetooth_device_id) {
        await completePrintJob(jobId, false, 'Bluetooth eşleşmesi yok');
        toast.error(`${printer.name}: Bluetooth eşleşmesi yok`);
        return;
      }

      const jobLabel =
        job.job_type === 'test'
          ? 'Test fişi'
          : job.job_type === 'cashier' || job.job_type === 'reprint_cashier'
            ? 'Hesap fişi'
            : 'Mutfak fişi';

      // ESC/POS byte üret
      let bytes: Uint8Array;
      try {
        const settings = business.receipt_settings;
        const isCashier =
          job.job_type === 'cashier' || job.job_type === 'reprint_cashier';
        const reviewUrl =
          settings.review_qr_enabled && isCashier && order?.id
            ? `${window.location.origin}/deg/${order.id}`
            : undefined;

        const baseOpts: ReceiptOptions = {
          paperWidth: printer.paper_width,
          businessName: business.name,
          businessTagline: business.tagline || undefined,
          businessPhone: business.phone || undefined,
          businessAddress: business.address || undefined,
          customHeader: settings.header_text,
          customFooter: settings.footer_text,
          showLogo: settings.show_logo,
          logoUrl: business.logo_url,
          showTagline: settings.show_tagline,
          showPhone: settings.show_phone,
          showAddress: settings.show_address,
          kitchenBigFont: settings.kitchen_big_font,
          kitchenShowPrices: settings.kitchen_show_prices,
          kitchenShowNoteHighlight: settings.kitchen_show_note_highlight,
          reviewQrEnabled: settings.review_qr_enabled,
          reviewQrUrl: reviewUrl,
          reviewQrText: settings.review_qr_text,
        };

        if (job.job_type === 'test') {
          bytes = buildTestReceipt(printer.paper_width);
        } else if (order) {
          const orderData: OrderForPrint = {
            order_no: order.order_no,
            created_at: order.created_at,
            order_type: order.order_type,
            table_label: order.table_label,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            note: order.note,
            items: order.items,
            subtotal: order.subtotal,
            total: order.total,
          };

          if (job.job_type === 'kitchen' || job.job_type === 'reprint_kitchen') {
            bytes = buildKitchenTicket(orderData, baseOpts, result.data.station_name || undefined);
          } else {
            bytes = buildCashierReceipt(orderData, baseOpts);
          }
        } else {
          await completePrintJob(jobId, false, 'Sipariş verisi yok');
          toast.error(`${jobLabel}: Sipariş verisi yok`);
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fiş oluşturulamadı';
        await completePrintJob(jobId, false, msg);
        toast.error(`${jobLabel}: ${msg}`);
        return;
      }

      // Bluetooth'a gönder (kopya sayısı kadar)
      const copies = Math.max(1, Math.min(printer.copies || 1, 5));
      let sendResult: { success: boolean; error?: string } = { success: true };

      for (let i = 0; i < copies; i++) {
        sendResult = await sendToBluetoothPrinter(
          printer.bluetooth_device_id,
          bytes
        );
        if (!sendResult.success) break;
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (sendResult.success) {
        await completePrintJob(jobId, true);
        if (isRetry) {
          toast.success(`${jobLabel} · ${printer.name} (2. denemede)`);
        }
        // İlk seferde başarıda sessizlik — kullanıcı zaten yazıcıdan görür
        return;
      }

      // Başarısızlık — retry mantığı
      const errMsg = sendResult.error || 'Bilinmeyen hata';

      if (!isRetry) {
        // İlk deneme başarısız → 3 saniye sonra sessizce 1 kez daha dene
        toast.warn(`${jobLabel} · ${printer.name} · tekrar deniyor…`);
        setTimeout(() => {
          processJob(jobId, true);
        }, 3000);
        return;
      }

      // 2. deneme de başarısız — bırak
      await completePrintJob(jobId, false, errMsg);
      toast.error(`${jobLabel} · ${printer.name}: ${errMsg}`);
    }

    // Pending jobları çek (sayfa açıldığında)
    async function checkPendingJobs() {
      if (isProcessing.current) return;
      isProcessing.current = true;
      try {
        const { data: pending } = await supabase
          .from('print_jobs')
          .select('id')
          .eq('business_id', businessId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(10);

        for (const job of pending || []) {
          await processJob(job.id as string);
        }
      } finally {
        isProcessing.current = false;
      }
    }

    checkPendingJobs();

    // Realtime: INSERT (yeni job) + UPDATE (retry için)
    const channel = supabase
      .channel('print-queue')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_jobs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const job = payload.new as { id: string; status: string };
          if (job.status === 'pending') {
            processJob(job.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_jobs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const newJob = payload.new as { id: string; status: string };
          const oldJob = payload.old as { id: string; status: string };
          // pending'e geri döndüyse (retry action) → işle
          if (newJob.status === 'pending' && oldJob.status !== 'pending') {
            processedJobs.current.delete(newJob.id);
            processJob(newJob.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  return null;
}
