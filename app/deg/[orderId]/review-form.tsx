'use client';

import { useState } from 'react';
import { submitReview } from '@/lib/actions/reviews';

export function ReviewForm({
  orderId,
  businessId,
  businessName,
  smartRedirect,
  googlePlaceId,
  reviewText,
}: {
    orderId: string | null;
  businessId: string;
  businessName: string;
  smartRedirect: boolean;
  googlePlaceId: string;
  reviewText: string;
}) {
  const [step, setStep] = useState<'rating' | 'comment' | 'thanks' | 'google'>(
    'rating'
  );
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleStarClick(stars: number) {
    setRating(stars);
    // Akıllı yönlendirme aktif VE yıldız 4-5 VE Google Place ID varsa
    if (smartRedirect && stars >= 4 && googlePlaceId) {
      setStep('google');
    } else {
      setStep('comment');
    }
  }

  async function handleSubmit(redirectedToGoogle = false) {
    setSubmitting(true);
    const result = await submitReview({
      businessId,
      orderId,
      rating,
      comment,
      customerName: name,
      redirectedToGoogle,
    });
    setSubmitting(false);
    if (!result.success) {
      alert(result.error || 'Gönderilemedi');
      return;
    }
    setStep('thanks');
  }

  function handleGoogleRedirect() {
    handleSubmit(true);
    // Google review URL formatı
    const googleUrl = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
    setTimeout(() => {
      window.open(googleUrl, '_blank');
    }, 500);
  }

  return (
    <div
      data-theme="warm"
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div className="w-full max-w-md">
        {/* İşletme adı */}
        <div className="text-center mb-8">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.16em',
              color: 'var(--ink-3)',
              fontWeight: 700,
            }}
          >
            DEĞERLENDİRME
          </div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            {businessName}
          </h1>
        </div>

        {/* RATING */}
        {step === 'rating' && (
          <div
            className="rounded-[var(--r)] p-8 text-center"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <p className="text-[18px] mb-6 text-ink-2">{reviewText}</p>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStarClick(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  className="text-5xl transition-transform hover:scale-110"
                  style={{
                    color:
                      (hover || rating) >= s ? 'var(--gold)' : 'var(--line)',
                    cursor: 'pointer',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-3 mt-4">
              Bir yıldıza dokunun
            </p>
          </div>
        )}

        {/* GOOGLE YÖNLENDİRME (4-5 yıldız + smart redirect aktif) */}
        {step === 'google' && (
          <div
            className="rounded-[var(--r)] p-8 text-center"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="text-5xl mb-3" style={{ color: 'var(--gold)' }}>
              {'★'.repeat(rating)}
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
              }}
              className="mb-3"
            >
              Harika!
            </h2>
            <p className="text-[15px] text-ink-2 mb-6">
              Memnun kaldığınıza çok sevindik. Google&apos;da bizi değerlendirir
              misiniz? Bu, başka müşterilerin bizi bulmasına yardımcı olur.
            </p>
            <button
              onClick={handleGoogleRedirect}
              disabled={submitting}
              className="w-full h-12 rounded-[12px] text-[15px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mb-2"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              {submitting ? 'Yönlendiriliyor...' : "Google'da değerlendir →"}
            </button>
            <button
              onClick={() => setStep('comment')}
              className="w-full h-11 text-[13px] text-ink-3 hover:text-ink"
            >
              Sadece burada bırakmak istiyorum
            </button>
          </div>
        )}

        {/* YORUM */}
        {step === 'comment' && (
          <div
            className="rounded-[var(--r)] p-6"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="text-center mb-5">
              <div
                className="text-4xl"
                style={{ color: 'var(--gold)' }}
              >
                {'★'.repeat(rating)}
                <span style={{ color: 'var(--line)' }}>
                  {'★'.repeat(5 - rating)}
                </span>
              </div>
            </div>

            <label
              className="uppercase block mb-2"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              {rating <= 3
                ? 'NE OLDU? (Yardımcı olmamız için)'
                : 'YORUMUNUZ (opsiyonel)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={
                rating <= 3
                  ? 'Deneyiminizi anlatın, hatamızı düzeltelim...'
                  : 'Beğendiğiniz şeyleri paylaşın...'
              }
              className="w-full px-3 py-2 rounded-[10px] text-[14px] resize-none"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                fontFamily: 'var(--f-sans)',
              }}
            />

            <div className="mt-4">
              <label
                className="uppercase block mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  color: 'var(--ink-3)',
                }}
              >
                ADINIZ (opsiyonel)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Ahmet"
                className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                }}
              />
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="w-full h-12 mt-5 rounded-[12px] text-[15px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              {submitting ? 'Gönderiliyor...' : 'Değerlendirmeyi gönder'}
            </button>
          </div>
        )}

        {/* TEŞEKKÜR */}
        {step === 'thanks' && (
          <div
            className="rounded-[var(--r)] p-10 text-center"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="text-5xl mb-3">✓</div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 400,
              }}
              className="mb-2"
            >
              Teşekkürler!
            </h2>
            <p className="text-ink-2 text-[15px]">
              Geri bildiriminiz bizim için çok değerli. Hizmetimizi sürekli
              iyileştirmek için kullanacağız.
            </p>
          </div>
        )}

        <div
          className="text-center mt-8 text-[11px]"
          style={{
            color: 'var(--ink-3)',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.08em',
          }}
        >
          ALEG ile çalışıyor
        </div>
      </div>
    </div>
  );
}
