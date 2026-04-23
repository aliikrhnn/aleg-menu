import { Suspense } from 'react';
import { getDashboardData } from '@/lib/actions/dashboard';
import { DynamicGreeting } from './dashboard/greeting';
import { HeroMetrics } from './dashboard/hero-metrics';
import { HourlyChart } from './dashboard/hourly-chart';
import { TopProductsCard } from './dashboard/top-products';
import { LiveOps } from './dashboard/live-ops';
import { LatestReviewCard } from './dashboard/latest-review';
import { QuickActionsCard } from './dashboard/quick-actions';
import { OnboardingCard } from './dashboard/onboarding';
import { DashboardRealtime } from './dashboard/realtime';
import { DashboardSkeleton } from './dashboard/skeleton';
import { LiveClock } from './dashboard/live-clock';
import { SoldOutAlert } from './dashboard/soldout-alert';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default function PanelHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();

  if (!result.success || !result.data) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="bg-card border border-line rounded-[var(--r)] p-8 text-center">
          <div className="text-accent text-3xl mb-3">⚠</div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Veriler yüklenemedi
          </h2>
          <p className="text-ink-3 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const { data } = result;

  // Akıllı mantık: henüz hiç ürün yok mu?
  const isBrandNew = data.business.product_count === 0;
  // Ürün var ama henüz sipariş gelmeyen kafeler
  const hasProductsNoOrders =
    data.business.product_count > 0 && data.month.order_count === 0;

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1200px] mx-auto">
      {/* Realtime dinleyici (görünmez) */}
      <DashboardRealtime
        businessId={data.business.id}
        initialTodayOrderCount={data.today.order_count}
      />

      {/* Selam */}
      <DynamicGreeting
        firstName={data.user.first_name}
        todayOrderCount={data.today.order_count}
        activeOrders={data.live.activeOrders}
        todayRevenue={data.today.revenue}
      />

      {/* Onboarding - yalnızca hiç ürünü yoksa veya hiç sipariş almamışsa */}
      {(isBrandNew || hasProductsNoOrders) && (
        <OnboardingCard
          productCount={data.business.product_count}
          tableCount={data.business.table_count}
          slug={data.business.slug}
        />
      )}

      {/* Tükendi uyarı şeridi (varsa) */}
      <SoldOutAlert />

      {/* 4 hero metrics */}
      <HeroMetrics
        todayRevenue={data.today.revenue}
        todayOrderCount={data.today.order_count}
        avgBasket={data.today.avg_basket}
        monthRevenue={data.month.revenue}
        monthOrderCount={data.month.order_count}
        activeOrders={data.live.activeOrders}
        revenueChangePct={data.today.revenue_change_pct}
        orderChangePct={data.today.order_change_pct}
      />

      {/* Canlı operasyon — panelin kalbi, tam genişlikte */}
      <div className="mb-6">
        <LiveOps live={data.live} realtime={true} />
      </div>

      {/* 2 kolon: saatlik chart + popüler ürünler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <HourlyChart
          hourly={data.hourly}
          peakHour={data.peakHour}
          totalRevenue={data.today.revenue}
        />
        <TopProductsCard topProducts={data.topProducts} />
      </div>

      {/* 2 kolon: son değerlendirme + hızlı aksiyon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <LatestReviewCard review={data.latestReview} />
        <QuickActionsCard slug={data.business.slug} />
      </div>

      {/* Alt bilgi şeridi — durum */}
      <StatusBar
        subscriptionStatus={data.business.subscription_status}
        planName={data.business.plan_name}
        daysSinceCreation={data.business.days_since_creation}
        slug={data.business.slug}
      />
    </div>
  );
}

function StatusBar({
  subscriptionStatus,
  planName,
  daysSinceCreation,
  slug,
}: {
  subscriptionStatus: string | null;
  planName: string | null;
  daysSinceCreation: number;
  slug: string;
}) {
  const statusLabels: Record<string, { text: string; color: string }> = {
    trial: { text: 'DENEME', color: 'var(--gold)' },
    active: { text: 'AKTİF', color: 'var(--ok)' },
    past_due: { text: 'GECİKMİŞ', color: 'var(--warn)' },
    cancelled: { text: 'İPTAL', color: 'var(--danger)' },
    suspended: { text: 'ASKIDA', color: 'var(--danger)' },
  };
  const status = statusLabels[subscriptionStatus || ''] || {
    text: '—',
    color: 'var(--ink-3)',
  };

  return (
    <div
      className="rounded-[var(--r)] px-5 py-3.5 flex items-center gap-4 flex-wrap"
      style={{
        background: 'var(--card-2)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: status.color }}
        />
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: status.color,
          }}
        >
          {status.text}
        </span>
        {planName && (
          <span
            className="text-ink-3"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
          >
            · {planName}
          </span>
        )}
      </div>

      <div
        className="text-ink-3"
        style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
      >
        {daysSinceCreation === 0
          ? 'Bugün katıldın'
          : `${daysSinceCreation} gündür Aleg'tesin`}
      </div>

      <div className="flex-1" />

      {/* Canlı saat */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block rounded-full"
          style={{
            width: 5,
            height: 5,
            background: 'var(--ok)',
          }}
        />
        <LiveClock
          showSeconds
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>

      <a
        href={`https://${slug}.alegstudio.com`}
        target="_blank"
        rel="noreferrer"
        className="text-accent hover:underline flex items-center gap-1"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {slug}.alegstudio.com <span>↗</span>
      </a>
    </div>
  );
}
