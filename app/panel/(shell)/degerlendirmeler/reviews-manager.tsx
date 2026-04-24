'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  replyToReview,
  archiveReview,
  type Review,
  type ReviewSummary,
} from '@/lib/actions/reviews';

export function ReviewsManager({
  initialReviews,
  initialSummary,
}: {
  initialReviews: Review[];
  initialSummary: ReviewSummary;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [summary] = useState<ReviewSummary>(initialSummary);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered =
    filter === 'all' ? reviews : reviews.filter((r) => r.rating === filter);

  async function handleReply(id: string) {
    if (!replyText.trim()) return;
    setSaving(true);
    const r = await replyToReview(id, replyText);
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'Cevap gönderilemedi');
      return;
    }
    setReviews((prev) =>
      prev.map((rev) =>
        rev.id === id
          ? { ...rev, reply_text: replyText, reply_at: new Date().toISOString() }
          : rev
      )
    );
    setReplyingId(null);
    setReplyText('');
  }

  async function handleArchive(id: string) {
    const ok = await confirmDialog({
      title: 'Değerlendirmeyi arşivle?',
      body: 'Arşivlenen değerlendirmeler listede görünmez.',
      tone: 'warn',
      confirmLabel: 'Arşivle',
    });
    if (!ok) return;
    setSaving(true);
    const r = await archiveReview(id, true);
    setSaving(false);
    if (!r.success) {
      toast.error(r.error || 'Arşivlenemedi');
      return;
    }
    setReviews((prev) => prev.filter((rev) => rev.id !== id));
  }

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
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
          MÜŞTERİ MEMNUNİYETİ
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
          className="mb-2"
        >
          Değerlendirmeler
        </h1>
        <p className="text-ink-2 text-[15px]">
          Müşterilerinizin geri bildirimleri. Her birine cevap verebilir,
          istemediklerinizi arşivleyebilirsiniz.
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Genel ortalama"
          value={summary.average.toFixed(1)}
          subtext={`${summary.total} değerlendirme`}
          stars={summary.average}
        />
        <SummaryCard
          label="Son 30 gün"
          value={summary.thisMonthAverage.toFixed(1)}
          subtext={`${summary.thisMonthTotal} değerlendirme`}
          stars={summary.thisMonthAverage}
        />
        <DistributionCard byStar={summary.byStar} total={summary.total} />
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Tümü"
          count={reviews.length}
        />
        {([5, 4, 3, 2, 1] as const).map((s) => (
          <FilterButton
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={`${s}★`}
            count={summary.byStar[s]}
          />
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="rounded-[var(--r)] p-10 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <div className="text-4xl mb-3">⭐</div>
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
            }}
            className="mb-2"
          >
            {filter === 'all'
              ? 'Henüz değerlendirme yok'
              : 'Bu filtrede değerlendirme yok'}
          </h2>
          <p className="text-ink-2 text-sm max-w-md mx-auto">
            {filter === 'all'
              ? 'Yazıcılar sayfasından "Değerlendirme QR" özelliğini etkinleştirdiğinizde, müşterileriniz hesap fişindeki kareyi okutarak deneyimlerini puanlar.'
              : 'Farklı bir filtre seçin veya tümünü görüntüleyin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isReplying={replyingId === r.id}
              replyText={replyText}
              onStartReply={() => {
                setReplyingId(r.id);
                setReplyText(r.reply_text || '');
              }}
              onCancelReply={() => {
                setReplyingId(null);
                setReplyText('');
              }}
              onChangeReply={setReplyText}
              onSubmitReply={() => handleReply(r.id)}
              onArchive={() => handleArchive(r.id)}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ====== Components ======

function SummaryCard({
  label,
  value,
  subtext,
  stars,
}: {
  label: string;
  value: string;
  subtext: string;
  stars: number;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div
        className="uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 36,
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span style={{ color: 'var(--gold)', fontSize: 18 }}>
          {renderStars(stars)}
        </span>
      </div>
      <div className="text-[12px] text-ink-3 mt-2">{subtext}</div>
    </div>
  );
}

function DistributionCard({
  byStar,
  total,
}: {
  byStar: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}) {
  return (
    <div
      className="rounded-[var(--r)] p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div
        className="uppercase mb-3"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          fontWeight: 700,
          color: 'var(--ink-3)',
        }}
      >
        Dağılım
      </div>
      <div className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((s) => {
          const count = byStar[s];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="w-6 text-[12px] text-ink-3 flex items-center gap-0.5">
                {s}
                <span style={{ color: 'var(--gold)', fontSize: 10 }}>★</span>
              </div>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--paper-2)' }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background:
                      s >= 4
                        ? 'var(--ok, #6B8E4E)'
                        : s === 3
                          ? 'var(--gold, #B08A3E)'
                          : 'var(--accent, #C4553A)',
                  }}
                />
              </div>
              <div className="w-8 text-[11px] text-ink-3 text-right">
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
      style={{
        background: active ? 'var(--ink)' : 'var(--card)',
        color: active ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.04em',
      }}
    >
      {label}
      <span
        className="text-[10px] px-1.5 rounded"
        style={{
          background: active ? 'rgba(255,255,255,0.18)' : 'var(--paper-2)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

function ReviewCard({
  review,
  isReplying,
  replyText,
  onStartReply,
  onCancelReply,
  onChangeReply,
  onSubmitReply,
  onArchive,
  saving,
}: {
  review: Review;
  isReplying: boolean;
  replyText: string;
  onStartReply: () => void;
  onCancelReply: () => void;
  onChangeReply: (s: string) => void;
  onSubmitReply: () => void;
  onArchive: () => void;
  saving: boolean;
}) {
  const ratingColor =
    review.rating >= 4
      ? 'var(--ok, #6B8E4E)'
      : review.rating === 3
        ? 'var(--gold, #B08A3E)'
        : 'var(--accent, #C4553A)';

  return (
    <article
      className="rounded-[var(--r)] p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderLeft: `4px solid ${ratingColor}`,
      }}
    >
      {/* Üst satır */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div style={{ color: 'var(--gold)', fontSize: 18 }}>
            {renderStars(review.rating)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-ink truncate">
              {review.customer_name || 'Anonim müşteri'}
            </div>
            <div className="text-[11px] text-ink-3 flex items-center gap-2 flex-wrap">
              <span>{formatDate(review.created_at)}</span>
              {review.order_no && (
                <>
                  <span>·</span>
                  <span style={{ fontFamily: 'var(--f-mono)' }}>
                    #{review.order_no}
                  </span>
                </>
              )}
              {review.redirected_to_google && (
                <>
                  <span>·</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: 'color-mix(in srgb, #4285F4 12%, transparent)',
                      color: '#4285F4',
                      fontWeight: 700,
                    }}
                  >
                    GOOGLE&apos;A YÖNLENDİRİLDİ
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yorum */}
      {review.comment && (
        <div
          className="text-[14px] text-ink-2 mb-3 leading-relaxed"
          style={{
            fontStyle: 'italic',
            paddingLeft: 12,
            borderLeft: '2px solid var(--line)',
          }}
        >
          {review.comment}
        </div>
      )}

      {/* Cevap (varsa) */}
      {review.reply_text && !isReplying && (
        <div
          className="mt-3 p-3 rounded-[10px]"
          style={{
            background: 'var(--paper-2)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <div
            className="uppercase mb-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              letterSpacing: '0.14em',
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            CEVABINIZ · {formatDate(review.reply_at!)}
          </div>
          <div className="text-[13px] text-ink-2">{review.reply_text}</div>
        </div>
      )}

      {/* Cevap formu */}
      {isReplying && (
        <div className="mt-3">
          <textarea
            value={replyText}
            onChange={(e) => onChangeReply(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Müşterinize cevap yazın..."
            className="w-full px-3 py-2 rounded-[10px] text-[13px] resize-none"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              fontFamily: 'var(--f-sans)',
            }}
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={onCancelReply}
              disabled={saving}
              className="h-9 px-4 rounded-[10px] text-[12px] font-semibold text-ink-3 hover:bg-[var(--paper-2)]"
            >
              İptal
            </button>
            <button
              onClick={onSubmitReply}
              disabled={saving || !replyText.trim()}
              className="h-9 px-4 rounded-[10px] text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--paper)' }}
            >
              {saving ? 'Kaydediliyor...' : 'Cevabı kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Aksiyonlar */}
      {!isReplying && (
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={onStartReply}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--accent)' }}
          >
            {review.reply_text ? '✎ Cevabı düzenle' : '↩ Cevap ver'}
          </button>
          <button
            onClick={onArchive}
            disabled={saving}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors hover:bg-[var(--paper-2)] ml-auto"
            style={{ color: 'var(--ink-3)' }}
          >
            Arşivle
          </button>
        </div>
      )}
    </article>
  );
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half ? '⯨' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}
