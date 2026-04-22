'use client';

/**
 * Print Queue Listener
 *
 * Bu component panelde her zaman aktif olur (layout'a eklenir).
 * Supabase Realtime ile print_jobs tablosunu dinler.
 * Pending job gelince detayını çeker, ESC/POS byte üretir, Bluetooth'a gönderir.
 */

import { useEffect, useRef, useState } from 'react';
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

type JobStatus = {
  jobId: string;
  type: 'kitchen' | 'cashier' | 'reprint_kitchen' | 'reprint_cashier' | 'test';
  printerName: string;
  status: 'printing' | 'success' | 'failed';
  errorMessage?: string;
  timestamp: number;
};

export function PrintQueueListener({ businessId }: { businessId: string }) {
  const [toasts, setToasts] = useState<JobStatus[]>([]);
  const processedJobs = useRef<Set<string>>(new Set());
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!businessId || !isWebBluetoothSupported()) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function processJob(jobId: string) {
      if (processedJobs.current.has(jobId)) return;
      processedJobs.current.add(jobId);

      const result = await getPrintJobDetails(jobId);
      if (!result.success || !result.data) {
        await completePrintJob(jobId, false, result.error || 'Detay alınamadı');
        pushToast({
          jobId,
          type: 'test',
          printerName: 'Yazıcı',
          status: 'failed',
          errorMessage: result.error,
          timestamp: Date.now(),
        });
        return;
      }

      const { job, order, business } = result.data;
      const printer = job.printer;

      // Network yazıcıları Agent işler - tarayıcı karışmasın
      if (printer.connection_type === 'network') {
        // Agent bu işi yakalayacak - sessizce çıkıyoruz
        return;
      }

      // Bluetooth bağlantı yoksa hata
      if (printer.connection_type !== 'bluetooth' || !printer.bluetooth_device_id) {
        await completePrintJob(jobId, false, 'Bluetooth eşleşmesi yok');
        pushToast({
          jobId,
          type: job.job_type,
          printerName: printer.name,
          status: 'failed',
          errorMessage: 'Bluetooth eşleşmesi yok',
          timestamp: Date.now(),
        });
        return;
      }

      pushToast({
        jobId,
        type: job.job_type,
        printerName: printer.name,
        status: 'printing',
        timestamp: Date.now(),
      });

      // ESC/POS byte üret
      let bytes: Uint8Array;
      try {
        const settings = business.receipt_settings;

        // Değerlendirme QR URL'i — sadece kasa fişinde + sipariş bağlıysa
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
          // Kasa fişi toggle'ları
          showLogo: settings.show_logo,
          logoUrl: business.logo_url,
          showTagline: settings.show_tagline,
          showPhone: settings.show_phone,
          showAddress: settings.show_address,
          // Mutfak ayarları
          kitchenBigFont: settings.kitchen_big_font,
          kitchenShowPrices: settings.kitchen_show_prices,
          kitchenShowNoteHighlight: settings.kitchen_show_note_highlight,
          // Değerlendirme QR
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
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Fiş oluşturulamadı';
        await completePrintJob(jobId, false, msg);
        updateToast(jobId, 'failed', msg);
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
        // Kopyalar arasında küçük bekleme
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (sendResult.success) {
        await completePrintJob(jobId, true);
        updateToast(jobId, 'success');
      } else {
        await completePrintJob(jobId, false, sendResult.error);
        updateToast(jobId, 'failed', sendResult.error);
      }
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

    // Realtime: yeni pending job gelince işle
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    function pushToast(toast: JobStatus) {
      setToasts((prev) => [...prev.slice(-4), toast]);
    }

    function updateToast(jobId: string, status: 'success' | 'failed', errorMessage?: string) {
      setToasts((prev) =>
        prev.map((t) => (t.jobId === jobId ? { ...t, status, errorMessage } : t))
      );
      // 4 saniye sonra kaldır
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.jobId !== jobId));
      }, 4000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      style={{ maxWidth: 340 }}
    >
      {toasts.map((t) => (
        <div
          key={t.jobId}
          className="rounded-[12px] px-4 py-3 shadow-lg flex items-start gap-3"
          style={{
            background:
              t.status === 'success'
                ? 'var(--ok, #6B8E4E)'
                : t.status === 'failed'
                  ? 'var(--danger, #C4553A)'
                  : 'var(--ink, #2A1F18)',
            color: 'var(--paper, #F4EEE2)',
            animation: 'slideIn 0.25s ease-out',
          }}
        >
          <div style={{ fontSize: 18, lineHeight: 1 }}>
            {t.status === 'success' ? '✓' : t.status === 'failed' ? '✕' : '🖨'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold">
              {t.type === 'test'
                ? 'Test'
                : t.type === 'cashier' || t.type === 'reprint_cashier'
                  ? 'Hesap fişi'
                  : 'Mutfak fişi'}
              {' → '}
              {t.printerName}
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {t.status === 'printing'
                ? 'Yazdırılıyor…'
                : t.status === 'success'
                  ? 'Başarılı'
                  : t.errorMessage || 'Hata'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
