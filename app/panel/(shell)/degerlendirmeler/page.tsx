import { getReviews } from '@/lib/actions/reviews';
import { ReviewsManager } from './reviews-manager';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const result = await getReviews({ limit: 100 });

  if (!result.success) {
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
            Değerlendirmeler yüklenemedi
          </h2>
          <p className="text-ink-3 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <ReviewsManager
      initialReviews={result.reviews || []}
      initialSummary={
        result.summary || {
          total: 0,
          average: 0,
          byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          thisMonthTotal: 0,
          thisMonthAverage: 0,
        }
      }
    />
  );
}
