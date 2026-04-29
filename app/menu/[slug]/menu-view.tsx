'use client';
/* eslint-disable @next/next/no-img-element */

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useEscapeKey } from '@/lib/hooks/use-escape-key';
import type { LocalizedText } from '@/types/database';
import { CartDrawer } from './cart-drawer';
import { MyOrdersPanel } from './my-orders-panel';
import { getCustomerOrderIds } from '@/lib/customer-orders';
import {
  submitWaiterCall,
  getPublicCallButtons,
  type CallButton,
} from '@/lib/actions/call-buttons';

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
  orderConfig?: {
    modes: {
      dinein: boolean;
      pickup: boolean;
      delivery: boolean;
    };
  };
  callButtons?: CallButton[];
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
    // 05-11 sabah, 11-17 öğlen, 17-22 akşam, 22-05 gece
    if (h >= 5 && h < 11) return 'Günaydın';
    if (h >= 11 && h < 17) return 'İyi günler';
    if (h >= 17 && h < 22) return 'İyi akşamlar';
    return 'İyi geceler';
  }
  if (h >= 5 && h < 11) return 'Good morning';
  if (h >= 11 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}

export function MenuView({
  business,
  categories,
  products,
  qrTable,
  orderConfig,
  callButtons: initialCallButtons = [],
}: Props) {
  // Hangi modlar aktif? (default: sadece dinein)
  const activeModes = useMemo(() => {
    const m = orderConfig?.modes || { dinein: true, pickup: false, delivery: false };
    return {
      dinein: m.dinein !== false, // varsayılan açık
      pickup: !!m.pickup,
      delivery: !!m.delivery,
    };
  }, [orderConfig]);

  // Hizmet (çağrı) sheet
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [callingButtonId, setCallingButtonId] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState<{ name: string; ts: number } | null>(null);

  // Çağrı butonları - state olarak tut, sheet açıldığında refresh
  const [callButtons, setCallButtons] = useState<CallButton[]>(initialCallButtons);

  // Service sheet ESC ile kapanır (çağrı gönderme sırasında değil)
  useEscapeKey(
    () => setServiceSheetOpen(false),
    serviceSheetOpen && !callingButtonId
  );

  // Sheet açıldığında en güncel butonları çek (cache bypass)
  useEffect(() => {
    if (!serviceSheetOpen) return;
    let canceled = false;
    (async () => {
      const result = await getPublicCallButtons(business.id);
      if (!canceled && result.success && result.buttons) {
        setCallButtons(result.buttons);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [serviceSheetOpen, business.id]);

  const [lang, setLang] = useState<Lang>('tr');
  const [activeCat, setActiveCat] = useState<string | null>(categories[0]?.id || null);
  const [search, setSearch] = useState('');
  // İlk mode: QR ile geldi → dinein, yoksa aktif olanın ilki
  const initialMode: 'dinein' | 'pickup' | 'delivery' = qrTable
    ? 'dinein'
    : activeModes.dinein
      ? 'dinein'
      : activeModes.pickup
        ? 'pickup'
        : activeModes.delivery
          ? 'delivery'
          : 'dinein';
  const [mode, setMode] = useState<'dinein' | 'pickup' | 'delivery'>(initialMode);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ name: string; ts: number } | null>(null);

  // Siparişlerim paneli (müşteri tarafı sipariş takibi)
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  const [myOrdersCount, setMyOrdersCount] = useState(0);

  // Mount'ta ve panel açılıp kapandığında sipariş sayısını güncelle
  useEffect(() => {
    setMyOrdersCount(getCustomerOrderIds(business.slug).length);
  }, [business.slug, myOrdersOpen, cartDrawerOpen]);

  // Storage event'iyle başka sekmeler de senkron olsun + 30sn'de bir poll
  useEffect(() => {
    const updateCount = () =>
      setMyOrdersCount(getCustomerOrderIds(business.slug).length);
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 30000);
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, [business.slug]);

  // Sepet butonu pozisyonu - arc animasyonu için
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  // Sepete uçan item'lar (arc animasyon)
  const [flyingItems, setFlyingItems] = useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      emoji: string;
    }>
  >([]);
  // Sepet badge "pop" animasyonu trigger
  const [badgeBump, setBadgeBump] = useState(0);

  // Scroll-spy: hangi kategori görünürde
  const [scrollY, setScrollY] = useState(0);
  // Kategori scroll navigation için ref'ler
  const categoryRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  // Scroll handler - sticky header + scroll-spy
  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: viewport'a en yakın kategori
  useEffect(() => {
    if (search) return; // aramadayken scroll-spy kapalı
    // 180px offset (sticky header altı)
    const offsetY = 180;
    let closest: { id: string; dist: number } | null = null;
    categoryRefs.current.forEach((el, id) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - offsetY);
      if (rect.top - offsetY <= 0 && (!closest || dist < closest.dist)) {
        closest = { id, dist };
      }
    });
    if (closest && (closest as { id: string }).id !== activeCat) {
      setActiveCat((closest as { id: string }).id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollY, search]);

  // Kategori chip'ine tıklama → smooth scroll
  const scrollToCategory = useCallback((id: string) => {
    const el = categoryRefs.current.get(id);
    if (!el) {
      setActiveCat(id);
      return;
    }
    const offset = 170; // sticky header
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveCat(id);
  }, []);

  function showToast(product: Product) {
    const name =
      typeof product.name === 'object' && product.name !== null
        ? (product.name as { tr?: string }).tr || 'Ürün'
        : String(product.name || 'Ürün');
    setToast({ name, ts: Date.now() });
  }

  // Toast 2 saniye sonra kapansın
  useEffect(() => {
    if (!toast) return;
    const currentTs = toast.ts;
    const t = setTimeout(() => {
      setToast((prev) => (prev && prev.ts === currentTs ? null : prev));
    }, 2200);
    return () => clearTimeout(t);
  }, [toast]);

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

  // Tüm kategoriler için ürün grupları (scroll-spy için sıralı)
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    categories.forEach((c) => {
      map.set(
        c.id,
        products.filter((p) => p.category_id === c.id)
      );
    });
    return map;
  }, [categories, products]);

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
    // Sepeti otomatik açma - sadece toast göster
    showToast(p);
    // Badge pop animasyonu
    setBadgeBump((n) => n + 1);
    // Haptic feedback (mobile)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // yoksay
      }
    }
  };

  // Sepete uçan emoji animasyonu - butonun pozisyonundan sepete arc çizer
  const flyToCart = useCallback((startEl: HTMLElement, p: Product) => {
    const cartBtn = cartButtonRef.current;
    if (!cartBtn) return;
    const startRect = startEl.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();
    const id = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const emoji = isValidEmojiIcon(p.hero_icon)
      ? (p.hero_icon as string)
      : '+';
    const newItem = {
      id,
      startX: startRect.left + startRect.width / 2,
      startY: startRect.top + startRect.height / 2,
      endX: cartRect.left + cartRect.width / 2,
      endY: cartRect.top + cartRect.height / 2,
      emoji,
    };
    setFlyingItems((items) => [...items, newItem]);
    // 800ms sonra sil (animasyon süresi)
    setTimeout(() => {
      setFlyingItems((items) => items.filter((x) => x.id !== id));
    }, 800);
  }, []);

  // Çağrı butonu tıklama
  const handleCallButton = useCallback(
    async (button: CallButton) => {
      if (callingButtonId) return; // çift tıklama önle
      setCallingButtonId(button.id);

      // Haptic
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          // yoksay
        }
      }

      const result = await submitWaiterCall({
        businessId: business.id,
        tableId: qrTable?.id || null,
        buttonId: button.id,
      });

      setCallingButtonId(null);

      if (result.success) {
        setCallSuccess({ name: button.name, ts: Date.now() });
        // Sheet'i 700ms sonra kapat (success animasyonu için)
        setTimeout(() => {
          setServiceSheetOpen(false);
        }, 700);
        // Toast 3 sn sonra sönsün
        setTimeout(() => {
          setCallSuccess((s) =>
            s && Date.now() - s.ts >= 2900 ? null : s
          );
        }, 3000);
      } else {
        // Spam veya hata - geçici toast benzeri callSuccess kullan ama "hata" olarak işaretle
        setCallSuccess({
          name: result.error || (lang === 'tr' ? 'İletilemedi' : 'Failed'),
          ts: Date.now(),
        });
        setTimeout(() => {
          setCallSuccess((s) =>
            s && Date.now() - s.ts >= 2900 ? null : s
          );
        }, 3000);
      }
    },
    [business.id, qrTable?.id, callingButtonId, lang]
  );

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
    showToast(p);
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

  // activeCategory artık kullanılmıyor (scroll-spy sections ile değişti)

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
    <div data-theme="warm" className="min-h-screen bg-paper text-ink pb-24 relative overflow-x-hidden">
      {/* ============ HERO ARKA PLAN GRADIENT ============ */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: 420,
          background:
            'radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* ============ HERO — Sinematik Giriş ============ */}
      <div
        className="relative px-5 pt-6 pb-4"
        style={{
          // Hero scroll ile saydamlaşır
          opacity: Math.max(0, 1 - scrollY / 300),
          transform: `translateY(${Math.min(scrollY * 0.15, 30)}px)`,
        }}
      >
        {/* AÇIK pill + MASA rozeti (üst satır) */}
        <div
          className="flex items-center gap-2 mb-3 flex-wrap"
          style={{
            animation: 'menu-fade-in 400ms ease-out',
          }}
        >
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
              className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-3 rounded-full relative overflow-hidden"
              style={{
                background:
                  'color-mix(in srgb, var(--accent) 14%, transparent)',
                border:
                  '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                animation: 'menu-table-glow 2.8s ease-in-out infinite',
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
              >
                <polyline
                  points="20 6 9 17 4 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
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

        <div className="flex items-start justify-between gap-3">
          {/* Sol: Logo + İsim + Selamlama */}
          <div className="min-w-0 flex-1">
            {/* Logo veya inisyal */}
            <div
              className="flex items-center gap-3 mb-2"
              style={{
                animation: 'menu-slide-up 450ms ease-out 60ms both',
              }}
            >
              {business.logo_url ? (
                <div
                  className="w-14 h-14 rounded-[14px] overflow-hidden flex-shrink-0"
                  style={{
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                  }}
                >
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      'color-mix(in srgb, var(--accent) 12%, var(--paper-2))',
                    border:
                      '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 32,
                      fontWeight: 400,
                      color: 'var(--accent)',
                      lineHeight: 1,
                    }}
                  >
                    {business.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* İşletme ismi */}
              <div className="min-w-0">
                <h1
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 26,
                    fontWeight: 400,
                    letterSpacing: '-0.025em',
                    lineHeight: 1.05,
                    color: 'var(--ink)',
                  }}
                  className="truncate"
                >
                  {business.name}
                </h1>
                <div
                  className="text-ink-3 text-[13px] mt-0.5 truncate"
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  {greeting(lang)}
                </div>
              </div>
            </div>
          </div>

          {/* Sağ: Dil + Hesap */}
          <div
            className="flex flex-col items-end gap-2 flex-shrink-0"
            style={{
              animation: 'menu-fade-in 500ms ease-out 120ms both',
            }}
          >
            <div className="flex items-center gap-1 bg-paper-2 rounded-full p-0.5">
              <LangButton
                current={lang}
                value="tr"
                onClick={() => setLang('tr')}
              />
              <LangButton
                current={lang}
                value="en"
                onClick={() => setLang('en')}
              />
            </div>
            <button
              className="w-9 h-9 rounded-full bg-paper-2 border border-line flex items-center justify-center text-ink-2 hover:bg-paper-3 transition-colors"
              title={lang === 'tr' ? 'Hesabım' : 'My account'}
            >
              <UserIcon />
            </button>
          </div>
        </div>

        {/* Büyük başlık - mesaj */}
        <div
          className="mt-5"
          style={{
            animation: 'menu-slide-up 500ms ease-out 180ms both',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 8vw, 40px)',
              fontWeight: 400,
              letterSpacing: '-0.028em',
              lineHeight: 1.02,
              color: 'var(--ink)',
            }}
          >
            {lang === 'tr' ? 'Ne içersin,' : "What'll"}
            <br />
            <span style={{ color: 'var(--accent)' }}>
              {lang === 'tr' ? 'bugün?' : 'it be today?'}
            </span>
          </h2>
        </div>
      </div>

      {/* ============ STICKY SEARCH + MODE TABS ============ */}
      <div
        className="sticky top-0 z-30 px-5 pt-3 pb-3"
        style={{
          background:
            scrollY > 80
              ? 'color-mix(in srgb, var(--paper) 85%, transparent)'
              : 'transparent',
          backdropFilter: scrollY > 80 ? 'blur(14px) saturate(1.3)' : 'none',
          WebkitBackdropFilter:
            scrollY > 80 ? 'blur(14px) saturate(1.3)' : 'none',
          borderBottom:
            scrollY > 80
              ? '1px solid color-mix(in srgb, var(--line) 50%, transparent)'
              : '1px solid transparent',
          transition: 'background 200ms, border-color 200ms',
        }}
      >
        {/* Arama kutusu */}
        <div
          className="flex items-center gap-2 px-3 bg-card border border-line rounded-[12px] mb-2.5"
          style={{ height: 44 }}
        >
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'tr' ? 'Menüde ara…' : 'Search menu…'}
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-3"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-ink-3 text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-paper-2"
              aria-label={lang === 'tr' ? 'Temizle' : 'Clear'}
            >
              ✕
            </button>
          )}
        </div>

        {/* Mode toggle - sadece aktif modlar göster, tek mod varsa gizle */}
        {(() => {
          const allModes = [
            { id: 'dinein' as const, tr: 'Masada', en: 'Dine-in' },
            { id: 'pickup' as const, tr: 'Al götür', en: 'Pickup' },
            { id: 'delivery' as const, tr: 'Paket', en: 'Delivery' },
          ];
          const visibleModes = allModes.filter((m) => activeModes[m.id]);
          // Hiç mod yoksa veya sadece 1 mod aktifse tabs gizle
          if (visibleModes.length <= 1) return null;
          return (
            <div className="flex gap-1.5 mb-2.5">
              {visibleModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex-1 h-9 rounded-[10px] text-xs font-semibold transition-all active:scale-[0.97] ${
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
          );
        })()}

        {/* Kategori chip'leri - scroll-spy (arama yokken) */}
        {!search && categories.length > 0 && (
          <div
            className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-5 px-5"
            style={{ scrollbarWidth: 'none' }}
          >
            {categories.map((c) => {
              const active = c.id === activeCat;
              return (
                <button
                  key={c.id}
                  onClick={() => scrollToCategory(c.id)}
                  className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1.5 active:scale-95 ${
                    active
                      ? 'bg-ink text-paper'
                      : 'bg-card border border-line text-ink-2 hover:bg-paper-2'
                  }`}
                  style={{ fontFamily: 'var(--f-sans)' }}
                >
                  {isValidEmojiIcon(c.hero_icon) && (
                    <span className="text-sm">{c.hero_icon}</span>
                  )}
                  {tt(c.name, lang)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ FEATURED HERO CAROUSEL ============ */}
      {!search && featured.length > 0 && (
        <FeaturedHeroCarousel
          products={featured}
          lang={lang}
          onAdd={(p, el) => {
            flyToCart(el, p);
            addToCart(p);
          }}
        />
      )}

      {/* ============ KATEGORİ BÖLÜMLERİ (scroll-spy) ============ */}
      {!search ? (
        <div className="relative z-10">
          {categories.map((c, idx) => {
            const catProds = productsByCategory.get(c.id) || [];
            if (catProds.length === 0) return null;
            return (
              <section
                key={c.id}
                ref={(el) => {
                  categoryRefs.current.set(c.id, el);
                }}
                className="px-4 mb-8"
                style={{
                  scrollMarginTop: 170,
                }}
              >
                {/* Kategori başlık */}
                <div className="px-1 mb-3">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    {isValidEmojiIcon(c.hero_icon) && (
                      <span className="text-xl">{c.hero_icon}</span>
                    )}
                    <h3
                      style={{
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        fontSize: 26,
                        fontWeight: 400,
                        letterSpacing: '-0.025em',
                        lineHeight: 1.05,
                        color: 'var(--ink)',
                      }}
                    >
                      {tt(c.name, lang)}
                    </h3>
                    <span
                      className="text-ink-3 ml-auto"
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {catProds.length}{' '}
                      {lang === 'tr' ? 'ürün' : 'items'}
                    </span>
                  </div>
                  {c.description && tt(c.description, lang) && (
                    <p
                      className="text-ink-3 text-[12px] italic mt-0.5"
                      style={{ fontFamily: 'var(--f-serif)' }}
                    >
                      {tt(c.description, lang)}
                    </p>
                  )}
                  {/* Altçizgi */}
                  <div
                    className="mt-2"
                    style={{
                      height: 1,
                      background:
                        'linear-gradient(to right, var(--line) 0%, transparent 60%)',
                    }}
                  />
                </div>

                {/* Ürünler */}
                <div className="space-y-2">
                  {catProds.map((p, i) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      lang={lang}
                      onAdd={(el) => {
                        flyToCart(el, p);
                        addToCart(p);
                      }}
                      animationDelay={i * 25}
                    />
                  ))}
                </div>

                {/* Kategori sonu ornament (son kategori hariç) */}
                {idx < categories.length - 1 && (
                  <div className="flex items-center justify-center mt-6 gap-3">
                    <div
                      style={{
                        width: 24,
                        height: 1,
                        background: 'var(--line)',
                      }}
                    />
                    <span
                      className="text-ink-3"
                      style={{ fontSize: 10, opacity: 0.5 }}
                    >
                      ✦
                    </span>
                    <div
                      style={{
                        width: 24,
                        height: 1,
                        background: 'var(--line)',
                      }}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* ============ ARAMA SONUÇLARI ============ */
        <div className="relative z-10">
          <div className="px-5 mb-3 flex items-baseline justify-between gap-3 mt-2">
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
              {lang === 'tr' ? `"${search}" sonuçları` : `Results for "${search}"`}
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

          <div className="px-4 space-y-2">
            {catProducts.length === 0 && (
              <div className="text-center py-16 text-ink-3 text-sm">
                <div className="flex items-center justify-center gap-3 mb-3 opacity-40">
                  <div
                    style={{
                      width: 30,
                      height: 1,
                      background: 'var(--ink-3)',
                    }}
                  />
                  <span style={{ fontSize: 14 }}>○</span>
                  <div
                    style={{
                      width: 30,
                      height: 1,
                      background: 'var(--ink-3)',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 16,
                  }}
                >
                  {lang === 'tr' ? 'Ürün bulunamadı' : 'Nothing matched.'}
                </div>
              </div>
            )}
            {catProducts.map((p, i) => (
              <ProductRow
                key={p.id}
                product={p}
                lang={lang}
                onAdd={(el) => {
                  flyToCart(el, p);
                  addToCart(p);
                }}
                animationDelay={i * 25}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <div className="text-center pt-12 pb-4 relative z-10">
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

      {/* ============ FOOTER ORNAMENT ============ */}
      <div
        className="px-5 pt-10 pb-32 text-center"
        style={{ color: 'var(--ink-3)' }}
      >
        {/* Üstte ornament çizgi */}
        <div className="flex items-center justify-center gap-3 mb-5 opacity-50">
          <div
            style={{
              width: 40,
              height: 1,
              background: 'var(--ink-3)',
            }}
          />
          <span style={{ fontSize: 14, opacity: 0.7 }}>✦</span>
          <div
            style={{
              width: 40,
              height: 1,
              background: 'var(--ink-3)',
            }}
          />
        </div>

        {/* İşletme bilgisi */}
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--ink-2)',
          }}
        >
          {business.name}
        </div>
        {business.city && (
          <div
            className="mt-1.5"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
            }}
          >
            {business.city}
          </div>
        )}

        {/* Powered by */}
        <div
          className="mt-7"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: 'var(--ink-3)',
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          {lang === 'tr' ? 'TARAFINDAN' : 'POWERED BY'}{' '}
          <a
            href="https://alegstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0',
              textTransform: 'none',
              color: 'var(--accent)',
              textDecoration: 'none',
              opacity: 1,
              marginLeft: 4,
            }}
          >
            aleg
          </a>
        </div>
      </div>

      {/* ============ HİZMET (ÇAĞRI) BUTONU ============ */}
      {/* Sadece QR ile geldiyse (masa bilinmesi gerek) ve buton tanımlıysa göster */}
      {qrTable && callButtons.length > 0 && (
        <>
          <button
            onClick={() => {
              setServiceSheetOpen(true);
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                  navigator.vibrate(10);
                } catch {
                  // yoksay
                }
              }
            }}
            aria-label={lang === 'tr' ? 'Hizmet çağır' : 'Request service'}
            className="fixed z-40 grid place-items-center transition-all active:scale-90"
            style={{
              right: 16,
              // Cart bar varsa 84px yukarı, scroll-top varsa onun da üstünde
              bottom:
                cartCount > 0
                  ? scrollY > 600
                    ? 144
                    : 84
                  : scrollY > 600
                    ? 84
                    : 24,
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'var(--accent)',
              color: '#FAF5EA',
              boxShadow:
                '0 8px 22px -4px color-mix(in srgb, var(--accent) 55%, transparent), 0 3px 8px rgba(42,31,24,0.12)',
              animation: 'menu-service-btn-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* El kaldır ✋ ikon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {/* Sürekli yumuşak nabız */}
            <span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                animation: 'menu-service-pulse 2.4s ease-in-out infinite',
                background: 'var(--accent)',
                opacity: 0,
              }}
            />
          </button>

          {/* ============ BOTTOM SHEET ============ */}
          {serviceSheetOpen && (
            <div
              className="fixed inset-0 z-[1000] flex items-end justify-center"
              style={{
                background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                animation: 'cdFadeIn 0.2s ease',
              }}
              onClick={() => setServiceSheetOpen(false)}
            >
              <div
                className="bg-paper w-full max-w-[480px] rounded-t-[24px] border border-line"
                style={{
                  boxShadow: '0 -10px 40px -8px rgba(42,31,24,0.25)',
                  animation:
                    'cdSlideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-ink-3 opacity-30" />
                </div>

                {/* Başlık */}
                <div className="px-6 pt-3 pb-4 text-center">
                  <div
                    className="text-ink-3 uppercase mb-1.5"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                    }}
                  >
                    {qrTable.name.toUpperCase()} · HİZMET
                  </div>
                  <h3
                    className="text-ink"
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 26,
                      lineHeight: 1.15,
                    }}
                  >
                    {lang === 'tr' ? 'Nasıl yardımcı olabiliriz?' : 'How can we help?'}
                  </h3>
                </div>

                {/* Butonlar */}
                <div className="px-5 pb-5 space-y-2">
                  {callButtons.map((btn) => {
                    const colorVar = `var(--${btn.color || 'accent'})`;
                    const isPending = callingButtonId === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => handleCallButton(btn)}
                        disabled={!!callingButtonId}
                        className="w-full p-4 rounded-[16px] flex items-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
                        style={{
                          background: `color-mix(in srgb, ${colorVar} 10%, var(--card))`,
                          border: `1px solid color-mix(in srgb, ${colorVar} 30%, transparent)`,
                        }}
                      >
                        {/* Emoji / icon kutusu */}
                        <div
                          className="w-12 h-12 rounded-[12px] grid place-items-center flex-shrink-0"
                          style={{
                            background: `color-mix(in srgb, ${colorVar} 18%, transparent)`,
                            color: colorVar,
                            fontSize: 22,
                          }}
                        >
                          {btn.emoji ? (
                            btn.emoji
                          ) : (
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div
                            className="text-ink"
                            style={{ fontWeight: 600, fontSize: 15 }}
                          >
                            {btn.name}
                          </div>
                        </div>
                        {/* Sağ ok / pending spinner */}
                        {isPending ? (
                          <div
                            className="w-5 h-5 rounded-full border-2"
                            style={{
                              borderColor: colorVar,
                              borderTopColor: 'transparent',
                              animation: 'spin 0.7s linear infinite',
                            }}
                          />
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={colorVar}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: 0.7 }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* İptal */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => setServiceSheetOpen(false)}
                    className="w-full h-11 rounded-[10px] text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: 'transparent',
                      color: 'var(--ink-3)',
                    }}
                  >
                    {lang === 'tr' ? 'İptal' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Çağrı sonuç toast */}
          {callSuccess && (
            <div
              className="fixed left-1/2 z-[1100] pointer-events-none"
              style={{
                top: 'env(safe-area-inset-top, 16px)',
                marginTop: 16,
                transform: 'translateX(-50%)',
                animation: 'menu-call-toast-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div
                className="px-5 py-3 rounded-full flex items-center gap-2.5"
                style={{
                  background: 'var(--ink)',
                  color: '#FAF5EA',
                  boxShadow:
                    '0 12px 28px -6px rgba(42,31,24,0.4), 0 4px 8px rgba(42,31,24,0.18)',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ok)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {lang === 'tr' ? 'Çağrınız iletildi' : 'Request sent'}
                  {callSuccess.name && (
                    <span
                      style={{
                        marginLeft: 6,
                        opacity: 0.7,
                        fontFamily: 'var(--f-serif)',
                        fontStyle: 'italic',
                        fontWeight: 400,
                      }}
                    >
                      · {callSuccess.name}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ SCROLL-TO-TOP BUTTON ============ */}
      {scrollY > 600 && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(8);
              } catch {
                // yoksay
              }
            }
          }}
          aria-label={lang === 'tr' ? 'Yukarı çık' : 'Scroll to top'}
          className="fixed z-40 grid place-items-center transition-all active:scale-90"
          style={{
            right: 16,
            bottom: cartCount > 0 ? 84 : 24,
            width: 42,
            height: 42,
            borderRadius: 21,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--ink-2)',
            boxShadow:
              '0 4px 12px -2px rgba(42, 31, 24, 0.12), 0 2px 4px rgba(42, 31, 24, 0.06)',
            animation: 'menu-scroll-top-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* ============ FLOATING CART BUTTON ============ */}
      {cartCount > 0 && (
        <div className="fixed left-0 right-0 bottom-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-paper to-transparent">
          {/* Siparişlerim mini bar - cart üstünde */}
          {myOrdersCount > 0 && (
            <button
              onClick={() => setMyOrdersOpen(true)}
              className="w-full h-10 mb-2 rounded-[12px] flex items-center justify-between px-3.5 transition-all active:scale-[0.99]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                boxShadow: '0 4px 12px rgba(42,31,24,0.06)',
                animation:
                  'menu-myorders-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>📋</span>
                <span
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-2)',
                  }}
                >
                  {lang === 'tr' ? 'Siparişlerim' : 'My orders'}
                </span>
                <span
                  className="grid place-items-center"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    padding: '0 5px',
                    borderRadius: 9,
                    background:
                      'color-mix(in srgb, var(--accent) 14%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {myOrdersCount}
                </span>
              </span>
              <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>→</span>
            </button>
          )}
          <button
            ref={cartButtonRef}
            onClick={() => {
              setCartDrawerOpen(true);
              // Haptic
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                  navigator.vibrate(8);
                } catch {
                  // yoksay
                }
              }
            }}
            className="w-full h-14 rounded-[14px] bg-accent text-card flex items-center justify-between px-4 shadow-lg active:scale-[0.99] transition-transform"
            style={{
              boxShadow: '0 12px 32px rgba(196,85,58,0.4), 0 4px 12px rgba(196,85,58,0.2)',
              color: '#FAF5EA',
              animation: 'menu-cart-bar-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span className="flex items-center gap-2.5">
              <span
                key={badgeBump}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: 'rgba(255,248,236,0.2)',
                  fontFamily: 'var(--f-mono)',
                  animation:
                    badgeBump > 0
                      ? 'menu-badge-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                      : undefined,
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
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 18,
                letterSpacing: '-0.02em',
              }}
            >
              {money(cartTotal, lang)}
            </span>
          </button>
        </div>
      )}

      {/* ============ FLOATING SIPARIŞLERIM BUTONU (sepet boşken) ============ */}
      {cartCount === 0 && myOrdersCount > 0 && (
        <div className="fixed right-4 bottom-4 z-50">
          <button
            onClick={() => setMyOrdersOpen(true)}
            className="rounded-full flex items-center gap-2 pl-3 pr-3.5 h-12 transition-all active:scale-95"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              boxShadow:
                '0 12px 28px rgba(42,31,24,0.28), 0 4px 10px rgba(42,31,24,0.16)',
              animation:
                'menu-myorders-in 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <span style={{ fontSize: 16 }}>📋</span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {lang === 'tr' ? 'Siparişlerim' : 'My orders'}
            </span>
            <span
              className="grid place-items-center"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: 'var(--accent)',
                color: '#FAF5EA',
              }}
            >
              {myOrdersCount}
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
        businessSlug={business.slug}
        tableId={qrTable?.id || null}
        tableName={qrTable?.name || null}
        onQtyChange={handleQtyChange}
        onClearCart={handleClearCart}
      />

      {/* ============ MY ORDERS PANEL ============ */}
      <MyOrdersPanel
        open={myOrdersOpen}
        onClose={() => setMyOrdersOpen(false)}
        businessSlug={business.slug}
        lang={lang}
      />

      {/* ============ TOAST (sepete eklendi) ============ */}
      {toast && !cartDrawerOpen && (
        <div
          key={toast.ts}
          style={{
            position: 'fixed',
            bottom: 96, // alt bar/cart button üstünde
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--ink, #2A1F18)',
            color: 'var(--paper, #F4EEE2)',
            padding: '12px 20px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: '90vw',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            animation: 'toastSlideUp 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <span
            style={{
              background: 'var(--ok, #6B8E4E)',
              color: 'white',
              width: 18,
              height: 18,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            ✓
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <strong>{toast.name}</strong> {lang === 'en' ? 'added to cart' : 'sepete eklendi'}
          </span>
        </div>
      )}

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
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>

      {/* ============ FLYING CART ITEMS (arc animasyon) ============ */}
      {flyingItems.map((item) => {
        const dx = item.endX - item.startX;
        const dy = item.endY - item.startY;
        return (
          <div
            key={item.id}
            className="fixed pointer-events-none z-[100] flex items-center justify-center"
            style={
              {
                left: item.startX,
                top: item.startY,
                width: 44,
                height: 44,
                marginLeft: -22,
                marginTop: -22,
                borderRadius: 22,
                background: 'var(--accent)',
                color: '#FAF5EA',
                fontSize: item.emoji.length === 1 ? 20 : 22,
                fontWeight: 700,
                boxShadow:
                  '0 6px 16px -4px color-mix(in srgb, var(--accent) 60%, transparent)',
                // CSS variable ile animasyon — keyframes globals.css'te tanımlı
                ['--fly-dx' as string]: `${dx}px`,
                ['--fly-dy' as string]: `${dy}px`,
                ['--fly-mid-x' as string]: `${dx * 0.3}px`,
                ['--fly-mid-y' as string]: `${dy * 0.15}px`,
                animation:
                  'menu-fly-to-cart 700ms cubic-bezier(0.55, -0.1, 0.55, 1) forwards',
              } as React.CSSProperties
            }
          >
            {item.emoji}
          </div>
        );
      })}
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
  animationDelay = 0,
}: {
  product: Product;
  lang: Lang;
  onAdd: (el: HTMLElement) => void;
  animationDelay?: number;
}) {
  const isOut = product.status === 'soldout';
  const name = tt(product.name, lang);
  const description = tt(product.description, lang);
  const hasImage = !!product.hero_image_url;

  return (
    <div
      className="flex items-center gap-3 p-2.5 bg-card border rounded-[16px] transition-all active:scale-[0.985]"
      style={{
        borderColor: 'var(--line)',
        animation: `menu-slide-up 380ms ease-out ${animationDelay}ms both`,
        boxShadow: '0 1px 2px rgba(42,31,24,0.04)',
      }}
    >
      {/* Sol: hero (resim, ikon veya inisyal) */}
      <div
        className="w-[72px] h-[72px] rounded-[12px] flex items-center justify-center flex-shrink-0 overflow-hidden relative"
        style={{
          background: hasImage
            ? 'var(--paper-2)'
            : 'color-mix(in srgb, var(--accent) 8%, var(--paper-2))',
          filter: isOut ? 'grayscale(0.85)' : 'none',
        }}
      >
        {hasImage ? (
          <img
            src={product.hero_image_url!}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isValidEmojiIcon(product.hero_icon) ? (
          <span className="text-3xl">{product.hero_icon}</span>
        ) : (
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
              color: 'color-mix(in srgb, var(--accent) 45%, transparent)',
              lineHeight: 1,
            }}
          >
            {name.charAt(0)}
          </span>
        )}

        {/* ÖZEL rozet (sol üst) */}
        {product.is_featured && !isOut && (
          <div
            className="absolute top-1 left-1 flex items-center gap-0.5 px-1 py-0.5 rounded"
            style={{
              background: 'var(--gold)',
              color: '#FFF8EC',
              fontFamily: 'var(--f-mono)',
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            ★
          </div>
        )}

        {/* TÜKENDİ overlay */}
        {isOut && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(42,31,24,0.35)' }}
          >
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 26,
                color: 'rgba(250, 245, 234, 0.9)',
              }}
            >
              ✕
            </span>
          </div>
        )}
      </div>

      {/* Orta: bilgi */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5 mb-0.5">
          <span
            className="font-semibold truncate"
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              color: isOut ? 'var(--ink-2)' : 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            {name}
          </span>
          {product.is_featured && !isOut && (
            <span
              className="flex-shrink-0 px-1 py-0.5 rounded"
              style={{
                background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
                color: 'var(--gold)',
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {lang === 'tr' ? 'ÖZEL' : 'NEW'}
            </span>
          )}
          {isOut && (
            <span
              className="flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{
                background: 'color-mix(in srgb, var(--warn) 15%, transparent)',
                color: 'var(--warn)',
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border:
                  '1px solid color-mix(in srgb, var(--warn) 28%, transparent)',
              }}
            >
              {lang === 'tr' ? 'TÜKENDİ' : 'OUT'}
            </span>
          )}
        </div>

        {description && (
          <div
            className="text-ink-3 line-clamp-2"
            style={{
              fontSize: 11.5,
              lineHeight: 1.4,
              marginBottom: 4,
            }}
          >
            {description}
          </div>
        )}

        {/* Varyasyon ipucu */}
        {product.presets.length > 0 && !isOut && (
          <div
            className="inline-block mr-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              letterSpacing: '0.1em',
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
            }}
          >
            + {product.presets.length}{' '}
            {lang === 'tr' ? 'seçenek' : 'option'}
          </div>
        )}
      </div>

      {/* Sağ: Fiyat + buton grubu */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: isOut ? 'var(--ink-3)' : 'var(--ink)',
            textDecoration: isOut ? 'line-through' : 'none',
            lineHeight: 1,
          }}
        >
          {money(product.price, lang)}
        </span>

        <button
          onClick={(e) => onAdd(e.currentTarget)}
          disabled={isOut}
          className="rounded-full flex items-center justify-center font-bold transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            width: 32,
            height: 32,
            background: isOut ? 'var(--ink-3)' : 'var(--accent)',
            color: '#FAF5EA',
            fontSize: 18,
            lineHeight: 1,
            boxShadow: isOut
              ? 'none'
              : '0 2px 8px -2px color-mix(in srgb, var(--accent) 40%, transparent)',
          }}
          title={lang === 'tr' ? 'Sepete ekle' : 'Add to cart'}
          aria-label={lang === 'tr' ? 'Sepete ekle' : 'Add to cart'}
        >
          +
        </button>
      </div>
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
  // ESC ile kapama
  useEscapeKey(onClose);

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


// ============================================================
// FEATURED HERO CAROUSEL — Büyük tek kart, swipe, auto-advance
// ============================================================
function FeaturedHeroCarousel({
  products,
  lang,
  onAdd,
}: {
  products: Product[];
  lang: Lang;
  onAdd: (p: Product, el: HTMLElement) => void;
}) {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  // Auto-advance her 4.5 saniyede
  useEffect(() => {
    if (paused || products.length <= 1) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % products.length);
    }, 4500);
    return () => clearInterval(t);
  }, [paused, products.length]);

  // Active değişince scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[active] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - 20, behavior: 'smooth' });
  }, [active]);

  // Manual scroll → active güncelle (debounced)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let tid: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => {
        const cards = Array.from(el.children) as HTMLElement[];
        const scrollLeft = el.scrollLeft;
        let closest = 0;
        let minDist = Infinity;
        cards.forEach((c, i) => {
          const dist = Math.abs(c.offsetLeft - 20 - scrollLeft);
          if (dist < minDist) {
            minDist = dist;
            closest = i;
          }
        });
        if (closest !== active) {
          setActive(closest);
          setPaused(true);
          setTimeout(() => setPaused(false), 6000); // 6sn sonra auto tekrar aç
        }
      }, 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (tid) clearTimeout(tid);
    };
  }, [active]);

  return (
    <div
      className="mb-6 relative z-10"
      style={{
        animation: 'menu-fade-in 500ms ease-out 220ms both',
      }}
    >
      {/* Label */}
      <div className="px-5 mb-2.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="text-ink-3 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            {lang === 'tr' ? 'ÖNE ÇIKANLAR' : 'FEATURED'}
          </span>
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--accent)',
            }}
          >
            ✦
          </span>
        </div>
        {products.length > 1 && (
          <span
            className="text-ink-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
            }}
          >
            {String(active + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Scroll container - snap carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1"
        style={{
          scrollbarWidth: 'none',
          scrollSnapType: 'x mandatory',
        }}
      >
        {products.map((p, idx) => (
          <FeaturedHeroCard
            key={p.id}
            product={p}
            lang={lang}
            onAdd={(el) => onAdd(p, el)}
            active={idx === active}
          />
        ))}
      </div>

      {/* Dot indicators */}
      {products.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActive(i);
                setPaused(true);
                setTimeout(() => setPaused(false), 6000);
              }}
              aria-label={`${lang === 'tr' ? 'Ürün' : 'Item'} ${i + 1}`}
              className="transition-all"
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === active ? 'var(--accent)' : 'var(--line)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Featured Hero Card — büyük tek kart
function FeaturedHeroCard({
  product,
  lang,
  onAdd,
  active,
}: {
  product: Product;
  lang: Lang;
  onAdd: (el: HTMLElement) => void;
  active: boolean;
}) {
  const isOut = product.status === 'soldout';
  const name = tt(product.name, lang);
  const description = tt(product.description, lang);
  const hasImage = !!product.hero_image_url;

  return (
    <div
      className="flex-shrink-0 relative overflow-hidden rounded-[20px] transition-all"
      style={{
        width: 'calc(100vw - 56px)',
        maxWidth: 340,
        height: 200,
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        background: hasImage
          ? 'var(--ink)'
          : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--paper-2)), var(--paper-2))',
        border: '1px solid var(--line)',
        boxShadow: active
          ? '0 8px 24px -12px rgba(42,31,24,0.25)'
          : '0 2px 8px -4px rgba(42,31,24,0.1)',
        transform: active ? 'scale(1)' : 'scale(0.97)',
        opacity: isOut ? 0.8 : 1,
      }}
    >
      {/* Arka plan resim veya dev initial */}
      {hasImage ? (
        <img
          src={product.hero_image_url!}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: isOut ? 'grayscale(1)' : 'none',
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {isValidEmojiIcon(product.hero_icon) ? (
            <span
              style={{
                fontSize: 100,
                opacity: 0.35,
                filter: 'saturate(0.6)',
              }}
            >
              {product.hero_icon}
            </span>
          ) : (
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 120,
                fontWeight: 400,
                color: 'color-mix(in srgb, var(--accent) 25%, transparent)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {name.charAt(0)}
            </span>
          )}
        </div>
      )}

      {/* Karartma overlay (fotoğraf varsa) */}
      {hasImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(42,31,24,0.85) 0%, rgba(42,31,24,0.4) 40%, rgba(42,31,24,0.05) 100%)',
          }}
        />
      )}

      {/* ÖZEL rozet */}
      <div
        className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full"
        style={{
          background: 'rgba(250, 245, 234, 0.92)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <span style={{ color: 'var(--gold)', fontSize: 10 }}>★</span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'var(--ink)',
            textTransform: 'uppercase',
          }}
        >
          {lang === 'tr' ? 'ÖZEL' : 'FEATURED'}
        </span>
      </div>

      {/* TÜKENDİ overlay */}
      {isOut && (
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 py-2 text-center"
          style={{
            background: 'rgba(42,31,24,0.85)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            style={{
              color: '#FAF5EA',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
            }}
          >
            {lang === 'tr' ? 'TÜKENDİ' : 'SOLD OUT'}
          </span>
        </div>
      )}

      {/* Alt bilgi */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4
            className="truncate"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: hasImage ? '#FAF5EA' : 'var(--ink)',
              lineHeight: 1.1,
              marginBottom: 2,
            }}
          >
            {name}
          </h4>
          {description && (
            <div
              className="line-clamp-1"
              style={{
                fontSize: 11.5,
                color: hasImage
                  ? 'rgba(250, 245, 234, 0.75)'
                  : 'var(--ink-3)',
                marginBottom: 6,
              }}
            >
              {description}
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: hasImage ? '#FAF5EA' : 'var(--ink)',
              textDecoration: isOut ? 'line-through' : 'none',
              lineHeight: 1,
            }}
          >
            {money(product.price, lang)}
          </div>
        </div>

        <button
          onClick={(e) => onAdd(e.currentTarget)}
          disabled={isOut}
          className="rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            background: 'var(--accent)',
            color: '#FAF5EA',
            fontSize: 26,
            fontWeight: 400,
            lineHeight: 1,
            boxShadow:
              '0 4px 14px -4px color-mix(in srgb, var(--accent) 55%, transparent)',
          }}
          aria-label={lang === 'tr' ? 'Sepete ekle' : 'Add to cart'}
        >
          +
        </button>
      </div>
    </div>
  );
}
