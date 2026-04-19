'use client';

import { useState, useRef, useEffect } from 'react';
import type { LocalizedText } from '@/types/database';

type Lang = 'tr' | 'en';

type Business = {
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
};

type Category = {
  id: string;
  name: LocalizedText;
  description: LocalizedText | null;
  hero_icon: string | null;
};

type Product = {
  id: string;
  category_id: string | null;
  name: LocalizedText;
  description: LocalizedText | null;
  price: number;
  status: 'active' | 'soldout';
  is_featured: boolean;
  hero_icon: string | null;
};

interface Props {
  business: Business;
  categories: Category[];
  products: Product[];
}

// Yardımcı: dil-aware metin
function t(text: LocalizedText | null | undefined, lang: Lang, fallback = ''): string {
  if (!text) return fallback;
  return text[lang] || text.tr || fallback;
}

export function MenuView({ business, categories, products }: Props) {
  const [lang, setLang] = useState<Lang>('tr');
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.id || null
  );

  // Section ref'leri (scroll için)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);

  // Kategori bazlı ürün gruplaması
  const productsByCategory = new Map<string, Product[]>();
  for (const cat of categories) {
    productsByCategory.set(
      cat.id,
      products.filter((p) => p.category_id === cat.id)
    );
  }

  // Scroll observasyonu - aktif kategoriyi otomatik güncelle
  useEffect(() => {
    if (categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // En üstteki visible bölümü seç
          const topEntry = visibleEntries.reduce((top, current) =>
            current.boundingClientRect.top < top.boundingClientRect.top ? current : top
          );
          const id = topEntry.target.getAttribute('data-cat-id');
          if (id) setActiveCategory(id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Kategoriye scroll
  const scrollToCategory = (catId: string) => {
    const el = sectionRefs.current.get(catId);
    if (el) {
      const offset = 110; // Sticky header yüksekliği
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveCategory(catId);
    }
  };

  // Aktif kategori tab'ını görünür alanda tut
  useEffect(() => {
    if (!activeCategory || !tabsRef.current) return;
    const tab = tabsRef.current.querySelector(`[data-cat-tab="${activeCategory}"]`);
    if (tab) {
      tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCategory]);

  if (categories.length === 0) {
    return (
      <div data-theme="warm" className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">○</div>
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
            className="mb-3"
          >
            {business.name}
          </h1>
          <p className="text-ink-2 text-sm">
            Menü hazırlanıyor. Çok yakında burada olacak.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-theme="warm" className="min-h-screen bg-paper text-ink">
      {/* Üst bant - Sticky */}
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b border-line/60">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-[var(--r-sm)] bg-accent flex items-center justify-center flex-shrink-0"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 500,
                color: '#FAF5EA',
                letterSpacing: '-0.04em',
              }}
            >
              {business.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div
                className="text-ink truncate leading-tight"
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                }}
              >
                {business.name}
              </div>
              {business.city && (
                <div
                  className="text-ink-3 uppercase leading-tight"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  {business.city}
                </div>
              )}
            </div>
          </div>

          {/* Dil seçici */}
          <div className="flex items-center gap-1 bg-paper-2 rounded-full p-1 flex-shrink-0">
            <LangButton current={lang} value="tr" onClick={() => setLang('tr')} />
            <LangButton current={lang} value="en" onClick={() => setLang('en')} />
          </div>
        </div>

        {/* Kategori tabs - scrollable */}
        <div
          ref={tabsRef}
          className="overflow-x-auto scrollbar-hide border-t border-line/40"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex gap-1 px-5 py-2 max-w-2xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                data-cat-tab={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-ink text-paper'
                    : 'text-ink-2 hover:bg-paper-2'
                }`}
                style={{ fontFamily: 'var(--f-sans)' }}
              >
                {cat.hero_icon && <span className="mr-1.5">{cat.hero_icon}</span>}
                {t(cat.name, lang)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menü içerik */}
      <main className="max-w-2xl mx-auto px-5 pt-6 pb-20">
        {categories.map((cat) => {
          const catProducts = productsByCategory.get(cat.id) || [];
          if (catProducts.length === 0) return null;

          return (
            <section
              key={cat.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(cat.id, el);
              }}
              data-cat-id={cat.id}
              className="mb-12 scroll-mt-32"
            >
              {/* Kategori başlığı */}
              <div className="mb-5">
                <div className="flex items-baseline gap-3 mb-2">
                  {cat.hero_icon && <span className="text-2xl">{cat.hero_icon}</span>}
                  <h2
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 36,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.05,
                    }}
                  >
                    {t(cat.name, lang)}
                  </h2>
                </div>
                {cat.description && t(cat.description, lang) && (
                  <p className="text-ink-3 text-sm pl-1">{t(cat.description, lang)}</p>
                )}
              </div>

              {/* Ürünler */}
              <div className="space-y-4">
                {catProducts.map((p) => (
                  <ProductCard key={p.id} product={p} lang={lang} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4 border-t border-line/40">
          <div
            className="text-ink-3 mb-1"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 16,
              letterSpacing: '-0.02em',
            }}
          >
            Aleg
          </div>
          <div
            className="text-ink-3 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            QR İLE GELDİN, AFİYET OLSUN
          </div>
        </footer>
      </main>

      {/* Scrollbar gizleme */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Ürün kartı
// ============================================================
function ProductCard({ product, lang }: { product: Product; lang: Lang }) {
  const isOut = product.status === 'soldout';
  const name = t(product.name, lang);
  const description = t(product.description, lang);

  return (
    <div className={`flex items-start gap-3 ${isOut ? 'opacity-50' : ''}`}>
      {/* Sol: ikon (varsa) */}
      {product.hero_icon ? (
        <div
          className={`w-12 h-12 rounded-[var(--r-sm)] flex items-center justify-center text-2xl flex-shrink-0 ${
            isOut ? 'bg-paper-3' : 'bg-accent/10'
          }`}
        >
          {product.hero_icon}
        </div>
      ) : null}

      {/* Orta: bilgi */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3
              className="text-ink leading-tight"
              style={{
                fontFamily: 'var(--f-sans)',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {name}
            </h3>
            {product.is_featured && !isOut && (
              <span
                className="text-[9px] bg-gold/15 text-gold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                ÖZEL
              </span>
            )}
          </div>

          {/* Sağ: fiyat */}
          <div
            className="text-ink flex-shrink-0"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            ₺{product.price}
          </div>
        </div>

        {description && (
          <p className="text-ink-2 text-sm leading-relaxed mt-1">{description}</p>
        )}

        {isOut && (
          <div
            className="inline-block mt-2 text-[9px] bg-warn/15 text-warn px-2 py-0.5 rounded uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            BUGÜN TÜKENDİ
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Dil butonu
// ============================================================
function LangButton({
  current,
  value,
  onClick,
}: {
  current: Lang;
  value: Lang;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase transition-all ${
        active ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink-2'
      }`}
      style={{
        fontFamily: 'var(--f-mono)',
        fontWeight: 700,
        letterSpacing: '0.08em',
        fontSize: 10,
      }}
    >
      {value}
    </button>
  );
}
