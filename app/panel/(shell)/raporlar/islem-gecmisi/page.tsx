import { redirect } from 'next/navigation';
import { getOrderLogs, getAuditSummary } from '@/lib/actions/audit-log';
import { AuditLogClient } from './client';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  // Bugünün başı
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  );

  const [logsRes, summaryRes] = await Promise.all([
    getOrderLogs({
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
      limit: 200,
    }),
    getAuditSummary({
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
    }),
  ]);

  if (!logsRes.success) {
    redirect('/panel');
  }

  return (
    <AuditLogClient
      initialLogs={logsRes.logs || []}
      initialSummary={summaryRes.rows || []}
    />
  );
}
