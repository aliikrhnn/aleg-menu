/**
 * QR Menü yüklenirken gösterilen skeleton.
 * Sinematik hero + featured + kategori başlıkları + ürün satırları için yer tutucu.
 */
export default function MenuLoading() {
  return (
    <div data-theme="warm" className="min-h-screen bg-paper text-ink">
      {/* Hero alanı */}
      <div className="px-5 pt-6 pb-8 relative overflow-hidden">
        {/* Üst meta bar */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-ink-3 opacity-30 shimmer-pulse" />
          <div className="h-2.5 w-32 rounded shimmer-bar" />
          <div className="ml-auto h-6 w-20 rounded-full shimmer-bar" />
        </div>

        {/* Logo + isim */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-[14px] shimmer-bar" />
          <div className="flex-1">
            <div className="h-3 w-20 mb-2 rounded shimmer-bar" />
            <div className="h-7 w-48 rounded shimmer-bar" />
          </div>
        </div>

        {/* Büyük başlık */}
        <div className="h-10 w-72 rounded shimmer-bar mt-6 mb-2" />
        <div className="h-10 w-48 rounded shimmer-bar" />
      </div>

      {/* Search bar */}
      <div className="px-5 pb-3">
        <div className="h-11 w-full rounded-[12px] shimmer-bar" />
      </div>

      {/* Mode tabs */}
      <div className="px-5 pb-3">
        <div className="flex gap-1.5">
          <div className="flex-1 h-9 rounded-[10px] shimmer-bar" />
          <div className="flex-1 h-9 rounded-[10px] shimmer-bar" />
        </div>
      </div>

      {/* Kategori chip'leri */}
      <div className="px-5 pb-5">
        <div className="flex gap-1.5 overflow-hidden">
          <div className="h-8 w-20 rounded-full shimmer-bar flex-shrink-0" />
          <div className="h-8 w-24 rounded-full shimmer-bar flex-shrink-0" />
          <div className="h-8 w-16 rounded-full shimmer-bar flex-shrink-0" />
          <div className="h-8 w-20 rounded-full shimmer-bar flex-shrink-0" />
        </div>
      </div>

      {/* Featured carousel placeholder */}
      <div className="px-5 pb-6">
        <div className="h-[200px] w-[85vw] max-w-[400px] rounded-[18px] shimmer-bar" />
      </div>

      {/* Kategori başlığı */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 rounded shimmer-bar" />
          <div className="h-3 w-12 rounded shimmer-bar" />
        </div>
      </div>

      {/* Ürün satırları */}
      <div className="px-5 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card border border-line rounded-[14px] p-3 flex gap-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Hero */}
            <div className="w-[72px] h-[72px] rounded-[12px] shimmer-bar flex-shrink-0" />
            {/* İçerik */}
            <div className="flex-1 min-w-0">
              <div className="h-4 w-3/4 rounded shimmer-bar mb-2" />
              <div className="h-3 w-1/2 rounded shimmer-bar mb-3" />
              <div className="h-3 w-1/3 rounded shimmer-bar opacity-60" />
            </div>
            {/* Fiyat + buton */}
            <div className="flex flex-col items-end justify-between">
              <div className="h-5 w-12 rounded shimmer-bar" />
              <div className="w-8 h-8 rounded-full shimmer-bar" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom space */}
      <div className="h-20" />

      {/* Shimmer keyframes - inline */}
      <style>{`
        .shimmer-bar {
          position: relative;
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--ink) 6%, transparent) 0%,
            color-mix(in srgb, var(--ink) 12%, transparent) 50%,
            color-mix(in srgb, var(--ink) 6%, transparent) 100%
          );
          background-size: 200% 100%;
          animation: shimmer-slide 1.4s ease-in-out infinite;
        }
        .shimmer-pulse {
          animation: shimmer-pulse 1.6s ease-in-out infinite;
        }
        @keyframes shimmer-slide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes shimmer-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
