import { getReviewBusinessInfo } from '@/lib/actions/reviews';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({
  params,
}: {
  params: { orderId: string };
}) {
  const result = await getReviewBusinessInfo(params.orderId);

  if (!result.success || !result.data) {
    return (
      <div
        data-theme="warm"
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--paper)', color: 'var(--ink)' }}
      >
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">⚠</div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 400,
            }}
            className="mb-2"
          >
            Sayfa açılamadı
          </h1>
          <p className="text-ink-2 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  if (result.data.already_reviewed) {
    return (
      <div
        data-theme="warm"
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--paper)', color: 'var(--ink)' }}
      >
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">✓</div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
            }}
            className="mb-2"
          >
            Teşekkürler!
          </h1>
          <p className="text-ink-2 text-[15px]">
            Bu siparişiniz için zaten değerlendirme yaptınız. Geri bildiriminiz
            için minnettarız.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReviewForm
      orderId={result.data.order_id}
      businessId={result.data.business_id}
      businessName={result.data.business_name}
      smartRedirect={result.data.review_smart_redirect}
      googlePlaceId={result.data.google_place_id}
      reviewText={result.data.review_qr_text}
    />
  );
}
