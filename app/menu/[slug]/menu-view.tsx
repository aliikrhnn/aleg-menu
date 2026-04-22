'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo } from 'react';
import type { LocalizedText } from '@/types/database';
import { CartDrawer } from './cart-drawer';

type Lang = 'tr' | 'en';

// Hero icon emoji mi kontrol et (metin ise gösterme)
function isValidEmojiIcon(icon: string | null): boolean {
  if (!icon) return false;
  return /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(icon);
}

type Business = {
  id: string;
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

type OptionValue = {
  id: string;
  name: LocalizedText;
  price_delta: number;
  is_default: boolean;
};

type OptionPreset = {
  id: string;
  name: LocalizedText;
  type: 'single' | 'multi';
  required: boolean;
  values: OptionValue[];
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
  hero_image_url: string | null;
  presets: OptionPreset[];
};

type SelectedOption = {
  preset_id: string;
  preset_name: string;
  value_id: string;
  value_name: string;
  price_delta: number;
};

type CartItem = {
  // Aynı ürün farklı varyasyonlarla olabileceği için unique key
  key: string;
  product_id: string;
  qty: number;
  unit_price: number; // seçimler dahil
  selections: SelectedOption[];
};

interface Props {
  business: Business;
  categories: Category[];
  products: Product[];
  qrTable?: { id: string; name: string } | null;
}

// Yardımcı: dil-aware metin
function tt(text: LocalizedText | null | undefined, lang: Lang, fallback = ''): string {
  if (!text) return fallback;
  return text[lang] || text.tr || fallback;
}

// Para
function money(n: number, lang: Lang) {
  return lang === 'tr' ? `₺${n.toFixed(0)}` : `${n.toFixed(0)}₺`;
}

// Selamlama
function greeting(lang: Lang) {
  const h = new Date().getHours();
  if (lang === 'tr') {
    if (h < 11) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }
  if (h < 11) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function MenuView({ business, categories, products, qrTable }: Props) {
  const [lang, setLang] = useState<Lang>('tr');
  const [activeCat, setActiveCat] = useState<string | null>(categories[0]?.id || null);
  const [search, setSearch] = useState('');
  // QR ile gelince otomatik "dinein" modu
  const [mode, setMode] = useState<'dinein' | 'pickup' | 'delivery'>(
    qrTable ? 'dinein' : 'dinein'
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Aktif kategorideki ürünler (search uygulu)
  const catProducts = useMemo(() => {
    if (search) {
      // Arama varsa tüm aktif ürünlerden ara
      const s = search.toLowerCase();
      return products.filter((p) => {
        const n = tt(p.name, lang).toLowerCase();
        const d = tt(p.description, lang).toLowerCase();
        return n.includes(s) || d.includes(s);
      });
    }
    return products.filter((p) => p.category_id === activeCat);
  }, [search, products, activeCat, lang]);

  // Featured ürünler (sadece arama olmadığında)
  const featured = useMemo(() => {
    return products.filter((p) => p.is_featured && p.status === 'active').slice(0, 4);
  }, [products]);

  // Sepet hesapları
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.unit_price * c.qty, 0);

  // Varyasyon seçim modal state
  const [optionModal, setOptionModal] = useState<Product | null>(null);

  // Unique cart key (selections'a göre)
  function cartKey(productId: string, selections: SelectedOption[]): string {
    const selectionKey = selections
      .map((s) => `${s.preset_id}:${s.value_id}`)
      .sort()
      .join('|');
    return `${productId}|${selectionKey}`;
  }

  const addToCart = (p: Product) => {
    if (p.status === 'soldout') return;
    // Preset varsa modal aç
    if (p.presets && p.presets.length > 0) {
      setOptionModal(p);
      return;
    }
    // Yoksa direkt sepete ekle
    const key = cartKey(p.id, []);
    setCart((c) => {
      const existing = c.find((x) => x.key === key);
      if (existing) {
        return c.map((x) => (x === existing ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...c,
        {
          key,
          product_id: p.id,
          qty: 1,
          unit_price: p.price,
          selections: [],
        },
      ];
    });
    // Sepet drawer'ı otomatik aç (kullanıcı not ekleyebilsin, görsel feedback olsun)
    setCartDrawerOpen(true);
  };

  // Modal'dan onaylı ürün ekle
  const addConfiguredProduct = (
    p: Product,
    selections: SelectedOption[]
  ) => {
    const unitPrice =
      p.price + selections.reduce((sum, s) => sum + s.price_delta, 0);
    const key = cartKey(p.id, selections);

    setCart((c) => {
      const existing = c.find((x) => x.key === key);
      if (existing) {
        return c.map((x) => (x === existing ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...c,
        {
          key,
          product_id: p.id,
          qty: 1,
          unit_price: unitPrice,
          selections,
        },
      ];
    });
    setOptionModal(null);
    setCartDrawerOpen(true); // varyasyon modal kapanınca sepeti aç
  };

  const handleQtyChange = (cartItemKey: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((c) => c.filter((x) => x.key !== cartItemKey));
    } else {
      setCart((c) =>
        c.map((x) => (x.key === cartItemKey ? { ...x, qty: newQty } : x))
      );
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Drawer için ürün adlarıyla birlikte sepet kalemleri
  const cartItemsForDrawer = useMemo(
    () =>
      cart.map((c) => {
        const product = products.find((p) => p.id === c.product_id);
        return {
          key: c.key,
          product_id: c.product_id,
          product_name: tt(product?.name, lang, 'Ürün'),
          qty: c.qty,
          unit_price: c.unit_price,
          hero_image_url: product?.hero_image_url ?? null,
          hero_icon: product?.hero_icon ?? null,
          selections: c.selections,
        };
      }),
    [cart, products, lang]
  );

  const activeCategory = categories.find((c) => c.id === activeCat);

  if (categories.length === 0) {
    return (
      <div data-theme="warm" className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4 opacity-40">○</div>
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
            {lang === 'tr' ? 'Menü hazırlanıyor. Çok yakında burada olacak.' : 'Menu coming soon.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-theme="warm" className="min-h-screen bg-paper text-ink pb-24">
      {/* ============ HERO + HEADER ============ */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            {/* AÇIK pill + MASA rozeti */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                  }}
                >
                  {business.city ? `${business.city} · ` : ''}
                  {lang === 'tr' ? 'AÇIK' : 'OPEN'}
                </span>
              </div>

              {qrTable && (
                <div
                  className="inline-flex items-center gap-1.5 h-5 pl-2 pr-2.5 rounded-full"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: 'var(--accent)',
                    }}
                  >
                    {qrTable.name.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Selamlama */}
            <div className="text-ink-3 text-sm mb-1">{greeting(lang)}</div>

            {/* Hero başlık */}
            <h1
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
              }}
              className="text-ink"
            >
              {lang === 'tr' ? 'Ne içersin?' : "What'll it be?"}
            </h1>
          </div>

          {/* Sağ: Hesap + Dil */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-paper-2 rounded-full p-0.5">
              <LangButton current={lang} value="tr" onClick={() => setLang('tr')} />
              <LangButton current={lang} value="en" onClick={() => setLang('en')} />
            </div>
            <button
              className="w-9 h-9 rounded-full bg-paper-2 border border-line flex items-center justify-center text-ink-2 hover:bg-paper-3 transition-colors"
              title={lang === 'tr' ? 'Hesabım' : 'My account'}
            >
              <UserIcon />
            </button>
          </div>
        </div>

        {/* Arama kutusu */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-card border border-line rounded-[12px] mb-3">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'tr' ? 'Menüde ara…' : 'Search menu…'}
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-3"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-ink-3 text-sm">
              ✕
            </button>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {([
            { id: 'dinein', tr: 'Masada', en: 'Dine-in' },
            { id: 'pickup', tr: 'Al götür', en: 'Pickup' },
            { id: 'delivery', tr: 'Paket', en: 'Delivery' },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex-1 h-10 rounded-[10px] text-xs font-semibold transition-all ${
                mode === m.id
                  ? 'bg-ink text-paper'
                  : 'bg-card border border-line text-ink-2 hover:bg-paper-2'
              }`}
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              {lang === 'tr' ? m.tr : m.en}
            </button>
          ))}
        </div>
      </div>

      {/* ============ FEATURED RAIL ============ */}
      {!search && featured.length > 0 && (
        <div className="mb-4">
          <div className="px-5 mb-2 flex items-baseline justify-between">
            <span
              className="text-ink-3 uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.14em',
              }}
            >
              {lang === 'tr' ? 'Öne Çıkanlar' : 'Featured'}
            </span>
            <span
              className="text-ink-3"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                letterSpacing: '0.06em',
              }}
            >
              {featured.length} {lang === 'tr' ? 'ürün' : 'items'}
            </span>
          </div>
          <div
            className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {featured.map((p) => (
              <FeaturedCard key={p.id} product={p} lang={lang} onAdd={() => addToCart(p)} />
            ))}
          </div>
        </div>
      )}

      {/* ============ KATEGORİ CHIPS ============ */}
      {!search && (
        <div
          className="flex gap-1.5 px-5 mb-3 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {categories.map((c) => {
            const active = c.id === activeCat;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`flex-shrink-0 px-3 h-9 rounded-full text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-ink text-paper'
                    : 'bg-card border border-line text-ink-2 hover:bg-paper-2'
                }`}
                style={{ fontFamily: 'var(--f-sans)' }}
              >
                {isValidEmojiIcon(c.hero_icon) && <span className="text-sm">{c.hero_icon}</span>}
                {tt(c.name, lang)}
              </button>
            );
          })}
        </div>
      )}

      {/* ============ KATEGORİ BAŞLIK ============ */}
      <div className="px-5 mb-3 flex items-baseline justify-between gap-3">
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
          className="truncate"
        >
          {search
            ? lang === 'tr'
              ? `"${search}" sonuçları`
              : `Results for "${search}"`
            : tt(activeCategory?.name, lang)}
        </h2>
        <span
          className="text-ink-3 flex-shrink-0"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.06em',
          }}
        >
          {catProducts.length} {lang === 'tr' ? 'ürün' : 'items'}
        </span>
      </div>

      {/* Kategori açıklaması */}
      {!search && activeCategory?.description && tt(activeCategory.description, lang) && (
        <p className="text-ink-3 text-sm px-5 mb-3 italic" style={{ fontFamily: 'var(--f-serif)' }}>
          {tt(activeCategory.description, lang)}
        </p>
      )}

      {/* ============ ÜRÜN LİSTESİ ============ */}
      <div className="px-4 space-y-2">
        {catProducts.length === 0 && (
          <div className="text-center py-12 text-ink-3 text-sm">
            <div className="text-3xl mb-2 opacity-40">○</div>
            {lang === 'tr' ? 'Ürün bulunamadı' : 'Nothing matched.'}
          </div>
        )}
        {catProducts.map((p) => (
          <ProductRow key={p.id} product={p} lang={lang} onAdd={() => addToCart(p)} />
        ))}
      </div>

      {/* ============ FOOTER ============ */}
      <div className="text-center pt-12 pb-4">
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            letterSpacing: '-0.02em',
          }}
          className="text-ink-3"
        >
          Aleg
        </div>
        <div
          className="text-ink-3 uppercase mt-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          {lang === 'tr' ? 'QR İLE GELDİN, AFİYET OLSUN' : 'YOU CAME VIA QR, ENJOY'}
        </div>
      </div>

      {/* ============ FLOATING CART BUTTON ============ */}
      {cartCount > 0 && (
        <div className="fixed left-0 right-0 bottom-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-paper to-transparent">
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="w-full h-14 rounded-[14px] bg-accent text-card flex items-center justify-between px-4 shadow-lg active:scale-[0.99] transition-transform"
            style={{
              boxShadow: '0 12px 32px rgba(196,85,58,0.4), 0 4px 12px rgba(196,85,58,0.2)',
              color: '#FAF5EA',
            }}
          >
            <span className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: 'rgba(255,248,236,0.2)',
                  fontFamily: 'var(--f-mono)',
                }}
              >
                {cartCount}
              </span>
              <span className="text-sm font-semibold">
                {lang === 'tr' ? 'Sepeti görüntüle' : 'View cart'}
              </span>
            </span>
            <span
              className="font-bold"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 14 }}
            >
              {money(cartTotal, lang)}
            </span>
          </button>
        </div>
      )}

      {/* ============ CART DRAWER ============ */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lang={lang}
        mode={mode}
        items={cartItemsForDrawer}
        total={cartTotal}
        businessId={business.id}
        tableId={qrTable?.id || null}
        tableName={qrTable?.name || null}
        onQtyChange={handleQtyChange}
        onClearCart={handleClearCart}
      />

      {/* ============ OPTION PICKER MODAL ============ */}
      {optionModal && (
        <OptionPickerModal
          product={optionModal}
          lang={lang}
          onConfirm={(selections) => addConfiguredProduct(optionModal, selections)}
          onClose={() => setOptionModal(null)}
        />
      )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// FEATURED CARD
// ============================================================
function FeaturedCard({
  product,
  lang,
  onAdd,
}: {
  product: Product;
  lang: Lang;
  onAdd: () => void;
}) {
  const isOut = product.status === 'soldout';
  return (
    <div
      className="flex-shrink-0 w-44 bg-card border border-line rounded-[14px] overflow-hidden"
      style={{
        boxShadow: '0 1px 2px rgba(42,31,24,0.05)',
      }}
    >
      {/* Hero alanı */}
      <div className="h-24 bg-gradient-to-br from-accent-soft to-paper-2 relative flex items-center justify-center overflow-hidden">
        {product.hero_image_url ? (
          <img
            src={product.hero_image_url}
            alt={tt(product.name, lang)}
            className="w-full h-full object-cover"
          />
        ) : isValidEmojiIcon(product.hero_icon) ? (
          <span className="text-4xl">{product.hero_icon}</span>
        ) : (
          <span
            className="text-ink/30"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 400,
            }}
          >
            {tt(product.name, lang).charAt(0)}
          </span>
        )}
        {/* ÖZEL rozeti */}
        <span
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
          style={{
            background: 'var(--gold)',
            color: '#FFF8EC',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.1em',
          }}
        >
          {lang === 'tr' ? 'ÖZEL' : 'FEATURED'}
        </span>
      </div>
      {/* İçerik */}
      <div className="p-2.5">
        <div className="text-[12px] font-semibold text-ink leading-tight truncate">
          {tt(product.name, lang)}
        </div>
        <div className="text-[10px] text-ink-3 mt-0.5 truncate">
          {tt(product.description, lang)}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span
            className="text-ink"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            {money(product.price, lang)}
          </span>
          <button
            onClick={onAdd}
            disabled={isOut}
            className="w-6 h-6 rounded-full bg-accent text-card flex items-center justify-center text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-105"
            style={{ color: '#FAF5EA', lineHeight: 1 }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT ROW (kompakt - resim solda)
// ============================================================
function ProductRow({
  product,
  lang,
  onAdd,
}: {
  product: Product;
  lang: Lang;
  onAdd: () => void;
}) {
  const isOut = product.status === 'soldout';
  const name = tt(product.name, lang);
  const description = tt(product.description, lang);

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-card border border-line rounded-[14px] transition-all ${
        isOut ? 'opacity-50' : 'hover:border-line-2'
      }`}
    >
      {/* Sol: hero (resim, ikon veya inisyal) */}
      <div className="w-14 h-14 rounded-[10px] bg-paper-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product.hero_image_url ? (
          <img
            src={product.hero_image_url}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : isValidEmojiIcon(product.hero_icon) ? (
          <span className="text-2xl">{product.hero_icon}</span>
        ) : (
          <span
            className="text-ink/30"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            {name.charAt(0)}
          </span>
        )}
      </div>

      {/* Orta: bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[13px] font-semibold text-ink truncate"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
            {name}
          </span>
          {product.is_featured && !isOut && (
            <span
              className="text-[8px] px-1 py-0.5 rounded font-bold uppercase flex-shrink-0"
              style={{
                background: 'var(--gold)',
                color: '#FFF8EC',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              {lang === 'tr' ? 'ÖZEL' : 'NEW'}
            </span>
          )}
        </div>
        {description && (
          <div className="text-[11px] text-ink-3 leading-snug line-clamp-2">{description}</div>
        )}
        <div className="mt-1.5">
          {isOut ? (
            <span
              className="text-[9px] uppercase font-bold"
              style={{
                color: 'var(--accent)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.12em',
              }}
            >
              {lang === 'tr' ? 'TÜKENDİ' : 'SOLD OUT'}
            </span>
          ) : (
            <span
              className="text-ink"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 400,
                letterSpacing: '-0.02em',
              }}
            >
              {money(product.price, lang)}
            </span>
          )}
        </div>
      </div>

      {/* Sağ: + butonu */}
      <button
        onClick={onAdd}
        disabled={isOut}
        className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-lg font-bold flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
        style={{ lineHeight: 1 }}
        title={lang === 'tr' ? 'Sepete ekle' : 'Add to cart'}
      >
        +
      </button>
    </div>
  );
}

// ============================================================
// LANG BUTTON
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
      className={`px-2 py-1 rounded-full font-bold uppercase transition-all ${
        active ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink-2'
      }`}
      style={{
        fontFamily: 'var(--f-mono)',
        letterSpacing: '0.08em',
        fontSize: 9.5,
      }}
    >
      {value}
    </button>
  );
}

// ============================================================
// SVG ICONS (lucide-react import etmemek için inline)
// ============================================================
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ============================================================
// OPTION PICKER MODAL — Müşteri varyasyon seçimi
// ============================================================
function OptionPickerModal({
  product,
  lang,
  onConfirm,
  onClose,
}: {
  product: Product;
  lang: Lang;
  onConfirm: (selections: SelectedOption[]) => void;
  onClose: () => void;
}) {
  // İlk seçimleri hazırla (default'lar)
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    product.presets.forEach((preset) => {
      const defaults = preset.values.filter((v) => v.is_default).map((v) => v.id);
      if (preset.type === 'single') {
        // Tek seçim: ya default ya boş
        init[preset.id] = defaults.length > 0 ? [defaults[0]] : [];
      } else {
        init[preset.id] = defaults;
      }
    });
    return init;
  });

  // Tek seçim toggle
  function pickSingle(presetId: string, valueId: string) {
    setSelections((s) => ({ ...s, [presetId]: [valueId] }));
  }

  // Çoklu seçim toggle
  function toggleMulti(presetId: string, valueId: string) {
    setSelections((s) => {
      const current = s[presetId] || [];
      const next = current.includes(valueId)
        ? current.filter((id) => id !== valueId)
        : [...current, valueId];
      return { ...s, [presetId]: next };
    });
  }

  // Validation: tüm zorunlu preset'lerde seçim var mı?
  const missingRequired = product.presets.find(
    (p) => p.required && (selections[p.id]?.length || 0) === 0
  );

  // Toplam fiyat hesabı (canlı)
  const totalDelta = useMemo(() => {
    let delta = 0;
    product.presets.forEach((preset) => {
      const selectedIds = selections[preset.id] || [];
      preset.values.forEach((v) => {
        if (selectedIds.includes(v.id)) {
          delta += v.price_delta;
        }
      });
    });
    return delta;
  }, [selections, product.presets]);

  const totalPrice = product.price + totalDelta;

  function handleConfirm() {
    if (missingRequired) {
      return;
    }

    // Selections'ı backend formatına çevir
    const result: SelectedOption[] = [];
    product.presets.forEach((preset) => {
      const selectedIds = selections[preset.id] || [];
      preset.values
        .filter((v) => selectedIds.includes(v.id))
        .forEach((v) => {
          result.push({
            preset_id: preset.id,
            preset_name: tt(preset.name, lang),
            value_id: v.id,
            value_name: tt(v.name, lang),
            price_delta: v.price_delta,
          });
        });
    });

    onConfirm(result);
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center sm:p-5"
      style={{
        background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
        backdropFilter: 'blur(6px)',
        animation: 'optModalFade 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-[520px] max-h-[92vh] flex flex-col overflow-hidden border border-line rounded-t-[22px] sm:rounded-[22px]"
        style={{
          boxShadow: '0 30px 60px -20px rgba(42,31,24,0.35)',
          animation: 'optModalSlide 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero - resim veya placeholder */}
        <div
          className="relative flex-shrink-0"
          style={{ height: 180, background: 'var(--paper-2)' }}
        >
          {product.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.hero_image_url}
              alt={tt(product.name, lang)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isValidEmojiIcon(product.hero_icon) ? (
                <span className="text-6xl">{product.hero_icon}</span>
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 60,
                    color: 'var(--ink)',
                    opacity: 0.2,
                  }}
                >
                  {tt(product.name, lang).charAt(0)}
                </span>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full grid place-items-center transition-all hover:scale-105"
            style={{
              background: 'rgba(250, 245, 234, 0.95)',
              backdropFilter: 'blur(8px)',
              color: 'var(--ink)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-2">
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              {tt(product.name, lang)}
            </h2>
            {tt(product.description, lang) && (
              <p className="text-ink-2 text-[13px] mt-1.5">
                {tt(product.description, lang)}
              </p>
            )}
          </div>

          <div className="px-5 pb-4 flex flex-col gap-5">
            {product.presets.map((preset) => (
              <div key={preset.id}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {tt(preset.name, lang)}
                  </span>
                  {preset.required ? (
                    <span
                      className="uppercase px-1.5 py-0.5 rounded"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 8,
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                        color: 'var(--accent)',
                      }}
                    >
                      ZORUNLU
                    </span>
                  ) : (
                    <span
                      className="uppercase px-1.5 py-0.5 rounded"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 8,
                        letterSpacing: '0.1em',
                        fontWeight: 700,
                        background: 'var(--paper-2)',
                        color: 'var(--ink-3)',
                      }}
                    >
                      OPSİYONEL
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {preset.values.map((v) => {
                    const selected = (selections[preset.id] || []).includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          if (preset.type === 'single') {
                            pickSingle(preset.id, v.id);
                          } else {
                            toggleMulti(preset.id, v.id);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-[12px] transition-all text-left"
                        style={{
                          background: selected
                            ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                            : 'var(--paper-2)',
                          border: selected
                            ? '2px solid var(--accent)'
                            : '1px solid var(--line)',
                        }}
                      >
                        {/* Indicator */}
                        <span
                          className="flex-shrink-0 grid place-items-center"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: preset.type === 'single' ? '50%' : '5px',
                            background: selected ? 'var(--accent)' : 'var(--card)',
                            border: selected ? 'none' : '1.5px solid var(--line-2)',
                          }}
                        >
                          {selected && preset.type === 'single' && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#FAF5EA',
                              }}
                            />
                          )}
                          {selected && preset.type === 'multi' && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FAF5EA" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>

                        <span className="flex-1 text-sm font-medium text-ink">
                          {tt(v.name, lang)}
                        </span>

                        {v.price_delta !== 0 && (
                          <span
                            className="flex-shrink-0 text-[12px]"
                            style={{
                              fontFamily: 'var(--f-mono)',
                              fontWeight: 700,
                              color: v.price_delta > 0 ? 'var(--accent)' : 'var(--ok)',
                            }}
                          >
                            {v.price_delta > 0 ? '+' : ''}
                            {money(v.price_delta, lang)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - sepete ekle */}
        <div
          className="flex-shrink-0 p-4"
          style={{
            background: 'var(--card)',
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!!missingRequired}
            className="w-full h-12 rounded-[14px] flex items-center justify-between px-5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#FAF5EA' }}
          >
            <span className="text-[14px]">
              {missingRequired
                ? `Lütfen ${tt(missingRequired.name, lang)} seç`
                : 'Sepete Ekle'}
            </span>
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 500,
              }}
            >
              {money(totalPrice, lang)}
            </span>
          </button>
        </div>

        <style jsx>{`
          @keyframes optModalFade {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes optModalSlide {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

