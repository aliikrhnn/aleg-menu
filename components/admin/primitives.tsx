/**
 * Süper Admin paneli için yeniden kullanılabilir tasarım primitive'leri.
 * Tasarım dosyasından (src-admin/primitives.jsx) Next.js + Tailwind'e adapte.
 *
 * İçerik:
 *   - Sparkline       (mini line chart, area opsiyonel)
 *   - BarChart        (mini bar chart, label'lı)
 *   - LogoTile        (işletme baş harfleri tile)
 *   - Avatar          (kullanıcı baş harfleri)
 *   - StatusDot       (renk kodlu nokta, pulse opsiyonel)
 *   - Pill            (badge - 7 tone)
 *   - Money           (₺ + serif italic büyük tutar)
 *   - SerifNum        (serif italic sayı)
 *   - SectionHead     (eyebrow + serif başlık)
 *   - MetricCard      (sparkline'lı metric kart)
 *   - SearchInput     (mono ⌕ ikonlu arama input)
 *   - Stepper         (yatay 5-step wizard ilerleme)
 *   - TurkiyeMap      (loose Türkiye silüeti + city dot'lar)
 *   - Placeholder     (dashed çerçeve placeholder)
 *   - FilterChip      (label + value rozeti, clearable opsiyonel)
 *   - Eyebrow         (mono uppercase küçük başlık)
 *   - SerifTitle      (italic serif sayfa başlığı)
 */

import { type ReactNode } from 'react';

// ===================================================================
// Eyebrow — mono uppercase küçük başlık (HER YERDE kullanılır)
// ===================================================================

export function Eyebrow({
  children,
  tone = 'muted',
  className = '',
}: {
  children: ReactNode;
  tone?: 'muted' | 'super' | 'accent' | 'ok' | 'warn' | 'danger' | 'gold' | 'olive';
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    muted: 'var(--ink-3)',
    super: 'var(--super)',
    accent: 'var(--accent)',
    ok: 'var(--ok)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
    gold: 'var(--gold)',
    olive: 'var(--olive)',
  };
  return (
    <div
      className={`uppercase ${className}`}
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color: colorMap[tone],
      }}
    >
      {children}
    </div>
  );
}

// ===================================================================
// SerifTitle — italic serif sayfa başlığı
// ===================================================================

export function SerifTitle({
  children,
  size = 46,
  tone = 'var(--ink)',
  className = '',
}: {
  children: ReactNode;
  size?: number;
  tone?: string;
  className?: string;
}) {
  return (
    <h1
      className={className}
      style={{
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        fontSize: size,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        color: tone,
      }}
    >
      {children}
    </h1>
  );
}

// ===================================================================
// Sparkline — küçük area+line chart
// ===================================================================

export function Sparkline({
  data,
  stroke = 'var(--super)',
  width = 120,
  height = 36,
  showArea = true,
}: {
  data: number[];
  stroke?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--line)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [
    i * stepX,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const d = pts
    .map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
    .join(' ');
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {showArea && <path d={area} fill={stroke} opacity="0.1" />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.5"
        fill={stroke}
      />
    </svg>
  );
}

// ===================================================================
// BarChart — küçük bar chart, label'lı
// ===================================================================

export function BarChart({
  data,
  color = 'var(--olive)',
  width = 280,
  height = 96,
  labels,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  labels?: string[];
}) {
  const max = Math.max(...data, 1);
  const barW = width / data.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {data.map((v, i) => {
        const h = (v / max) * (height - 18);
        return (
          <g key={i}>
            <rect
              x={i * barW + 2}
              y={height - h - 14}
              width={barW - 4}
              height={Math.max(h, 1)}
              fill={color}
              rx="2"
              opacity={i === data.length - 1 ? 1 : 0.7}
            />
            {labels && (
              <text
                x={i * barW + barW / 2}
                y={height - 2}
                fontSize="9"
                fontFamily="var(--f-mono)"
                fill="var(--ink-3)"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ===================================================================
// LogoTile — işletme/marka logosu (baş harf tile)
// ===================================================================

export function LogoTile({
  logo,
  tint = 'var(--super)',
  size = 36,
}: {
  logo: string;
  tint?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 'var(--r-sm)',
        background: tint,
        color: '#FAF5EA',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-serif)',
        fontSize: size * 0.42,
        fontWeight: 500,
        fontStyle: 'italic',
        letterSpacing: '-0.02em',
      }}
    >
      {logo}
    </div>
  );
}

// ===================================================================
// Avatar — kullanıcı baş harfleri
// ===================================================================

export function Avatar({
  text,
  tint = 'var(--paper-3)',
  size = 28,
}: {
  text: string;
  tint?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        background: tint,
        color: 'var(--ink)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-sans)',
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );
}

// ===================================================================
// StatusDot — renkli durum noktası, pulse opsiyonel
// ===================================================================

export function StatusDot({
  tone = 'ok',
  pulse = false,
  size = 8,
}: {
  tone?: 'ok' | 'warn' | 'danger' | 'muted' | 'super';
  pulse?: boolean;
  size?: number;
}) {
  const colorMap: Record<string, string> = {
    ok: 'var(--ok)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
    muted: 'var(--ink-3)',
    super: 'var(--super)',
  };
  const color = colorMap[tone] || colorMap.ok;

  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: 999,
          background: color,
        }}
      />
      {pulse && (
        <>
          <span
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 999,
              border: `1.5px solid ${color}`,
              opacity: 0.5,
              animation: 'sa-pulse 1.6s ease-out infinite',
            }}
          />
          <style>{`@keyframes sa-pulse {
            0% { transform: scale(.8); opacity: .6; }
            100% { transform: scale(1.8); opacity: 0; }
          }`}</style>
        </>
      )}
    </span>
  );
}

// ===================================================================
// Pill — küçük rozet (7 tone)
// ===================================================================

const PILL_TONES: Record<string, { bg: string; fg: string }> = {
  muted: { bg: 'var(--paper-2)', fg: 'var(--ink-3)' },
  ok: { bg: 'color-mix(in oklab, var(--ok) 15%, transparent)', fg: 'var(--ok)' },
  warn: { bg: 'color-mix(in oklab, var(--warn) 15%, transparent)', fg: 'var(--warn)' },
  danger: { bg: 'color-mix(in oklab, var(--danger) 15%, transparent)', fg: 'var(--danger)' },
  super: { bg: 'var(--super-soft)', fg: 'var(--super)' },
  gold: { bg: 'color-mix(in oklab, var(--gold) 15%, transparent)', fg: 'var(--gold)' },
  olive: { bg: 'color-mix(in oklab, var(--olive) 15%, transparent)', fg: 'var(--olive)' },
  accent: { bg: 'color-mix(in oklab, var(--accent) 12%, transparent)', fg: 'var(--accent)' },
};

export function Pill({
  tone = 'muted',
  children,
  icon,
}: {
  tone?: keyof typeof PILL_TONES;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const c = PILL_TONES[tone] || PILL_TONES.muted;
  return (
    <span
      className="inline-flex items-center gap-1 rounded uppercase"
      style={{
        background: c.bg,
        color: c.fg,
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '2px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <span style={{ marginRight: 2 }}>{icon}</span>}
      {children}
    </span>
  );
}

// ===================================================================
// Money — ₺ + serif italic tutar
// ===================================================================

export function Money({
  amount,
  size = 42,
  currency = '₺',
  tone = 'var(--ink)',
}: {
  amount: number;
  size?: number;
  currency?: string;
  tone?: string;
}) {
  const formatted = (amount || 0).toLocaleString('tr-TR');
  return (
    <span
      style={{
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: tone,
        fontWeight: 400,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          fontSize: size * 0.6,
          verticalAlign: '0.15em',
          marginRight: 2,
          opacity: 0.55,
        }}
      >
        {currency}
      </span>
      {formatted}
    </span>
  );
}

// ===================================================================
// SerifNum — italic serif sayı (Money'in para olmayan eşi)
// ===================================================================

export function SerifNum({
  children,
  size = 42,
  tone = 'var(--ink)',
}: {
  children: ReactNode;
  size?: number;
  tone?: string;
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--f-serif)',
        fontStyle: 'italic',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: tone,
        fontWeight: 400,
      }}
    >
      {children}
    </span>
  );
}

// ===================================================================
// MetricCard — sparkline + trend'li büyük metric kartı
// ===================================================================

export function MetricCard({
  label,
  value,
  currency,
  trend,
  trendLabel,
  sparkline,
  sparkColor,
  accent,
}: {
  label: string;
  value: number | string;
  currency?: boolean;
  trend?: number;
  trendLabel?: string;
  sparkline?: number[];
  sparkColor?: string;
  accent?: string;
}) {
  const displayValue =
    typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5 grid gap-3.5 min-h-[150px]">
      <div className="flex justify-between items-start">
        <Eyebrow>{label}</Eyebrow>
        {trend !== undefined && (
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: trend >= 0 ? 'var(--ok)' : 'var(--danger)',
              letterSpacing: '0.04em',
              fontFamily: 'var(--f-mono)',
            }}
          >
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        {currency ? (
          <Money amount={displayValue} size={40} tone={accent || 'var(--ink)'} />
        ) : (
          <SerifNum size={40} tone={accent || 'var(--ink)'}>
            {typeof value === 'number'
              ? value.toLocaleString('tr-TR')
              : value}
          </SerifNum>
        )}
      </div>
      <div className="flex justify-between items-end gap-3">
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {trendLabel}
        </span>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline
            data={sparkline}
            stroke={sparkColor || 'var(--super)'}
            width={110}
            height={34}
          />
        )}
      </div>
    </div>
  );
}

// ===================================================================
// SearchInput — mono ⌕ ikonlu arama
// ===================================================================

export function SearchInput({
  value,
  onChange,
  placeholder = 'Ara…',
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
}) {
  return (
    <div
      className="relative inline-flex items-center"
      style={{ width: width || 320 }}
    >
      <span
        className="absolute left-3 pointer-events-none"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          color: 'var(--ink-3)',
        }}
      >
        ⌕
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-8 pr-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-sm placeholder:text-ink-3 focus:outline-none focus:border-super focus:ring-1 focus:ring-super/20"
        style={{ fontFamily: 'var(--f-sans)' }}
      />
    </div>
  );
}

// ===================================================================
// FilterChip — clearable filtre rozeti
// ===================================================================

export function FilterChip({
  label,
  value,
  active,
  onClear,
  onClick,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClear?: () => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--r-sm)] border text-xs transition-colors ${
        active
          ? 'border-super bg-super/10 text-super'
          : 'border-line bg-card text-ink-2 hover:border-line-2'
      }`}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: active ? 'var(--super)' : 'var(--ink-3)',
        }}
      >
        {label}
      </span>
      <span className="font-medium">{value}</span>
      {active && onClear && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Filtreyi temizle"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }
          }}
          className="text-super/60 hover:text-super cursor-pointer"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          ×
        </span>
      )}
    </button>
  );
}

// ===================================================================
// Stepper — yatay multi-step ilerleme göstergesi
// ===================================================================

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex items-center gap-2"
              style={{ opacity: done || active ? 1 : 0.45 }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  background: done
                    ? 'var(--super)'
                    : active
                    ? 'var(--super-soft)'
                    : 'var(--paper-2)',
                  color: done ? 'var(--card)' : 'var(--super)',
                  border: active ? '2px solid var(--super)' : 'none',
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active || done ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 1,
                  background: done ? 'var(--super)' : 'var(--line)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===================================================================
// SectionHead — kart için eyebrow + serif başlık header
// ===================================================================

export function SectionHead({
  eyebrow,
  title,
  italic = true,
  children,
  eyebrowTone,
}: {
  eyebrow: string;
  title: string;
  italic?: boolean;
  children?: ReactNode;
  eyebrowTone?: 'muted' | 'super' | 'accent' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: italic ? 'italic' : 'normal',
            fontSize: 22,
            fontWeight: 400,
            marginTop: 2,
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}

// ===================================================================
// TurkiyeMap — loose Türkiye silüeti + city dot'lar
// ===================================================================

export type CityDot = { city: string; count: number; x?: number; y?: number };

// Şehir → koordinat haritası (% bazlı, viewBox 100×50)
const CITY_COORDS: Record<string, [number, number]> = {
  İstanbul: [28, 22],
  Istanbul: [28, 22],
  Ankara: [50, 38],
  İzmir: [22, 46],
  Izmir: [22, 46],
  Antalya: [42, 62],
  Bursa: [28, 30],
  Eskişehir: [38, 34],
  Eskisehir: [38, 34],
  Muğla: [30, 60],
  Mugla: [30, 60],
  Trabzon: [74, 22],
  Konya: [46, 50],
  Gaziantep: [72, 56],
  Kayseri: [60, 44],
  Adana: [62, 60],
  Mersin: [56, 62],
  Samsun: [62, 22],
  Diyarbakır: [80, 50],
  Diyarbakir: [80, 50],
  Erzurum: [82, 36],
  Van: [90, 46],
  Sivas: [66, 36],
  Malatya: [76, 44],
  Şanlıurfa: [76, 58],
  Sanliurfa: [76, 58],
  Hatay: [64, 66],
  Manisa: [24, 44],
  Aydın: [22, 52],
  Aydin: [22, 52],
  Denizli: [30, 52],
  Tekirdağ: [22, 22],
  Tekirdag: [22, 22],
  Kocaeli: [32, 26],
  Sakarya: [36, 26],
  Balıkesir: [22, 36],
  Balikesir: [22, 36],
  Çanakkale: [16, 32],
  Canakkale: [16, 32],
  Edirne: [16, 18],
  Kırklareli: [22, 16],
  Kirklareli: [22, 16],
  Bolu: [42, 28],
  Düzce: [40, 26],
  Duzce: [40, 26],
  Zonguldak: [46, 22],
  Bartın: [50, 22],
  Bartin: [50, 22],
  Karabük: [50, 26],
  Karabuk: [50, 26],
  Kastamonu: [54, 22],
  Çorum: [58, 28],
  Corum: [58, 28],
  Amasya: [62, 28],
  Tokat: [66, 30],
  Yozgat: [60, 36],
  Kırşehir: [56, 38],
  Kirsehir: [56, 38],
  Nevşehir: [58, 42],
  Nevsehir: [58, 42],
  Niğde: [58, 48],
  Nigde: [58, 48],
  Aksaray: [54, 44],
  Karaman: [50, 56],
  Burdur: [38, 56],
  Isparta: [40, 54],
  Afyonkarahisar: [38, 44],
  Kütahya: [32, 38],
  Kutahya: [32, 38],
  Uşak: [32, 46],
  Usak: [32, 46],
  Bilecik: [34, 30],
  Yalova: [30, 26],
  Bayburt: [78, 30],
  Gümüşhane: [76, 28],
  Gumushane: [76, 28],
  Rize: [78, 22],
  Artvin: [82, 24],
  Ardahan: [86, 28],
  Kars: [88, 32],
  Iğdır: [92, 36],
  Igdir: [92, 36],
  Ağrı: [88, 40],
  Agri: [88, 40],
  Muş: [84, 44],
  Mus: [84, 44],
  Bitlis: [86, 48],
  Batman: [82, 50],
  Siirt: [84, 52],
  Şırnak: [86, 54],
  Sirnak: [86, 54],
  Hakkari: [92, 52],
  Mardin: [80, 56],
  Kilis: [70, 60],
  Osmaniye: [66, 58],
  Kahramanmaraş: [70, 50],
  Kahramanmaras: [70, 50],
  Adıyaman: [76, 52],
  Adiyaman: [76, 52],
  Tunceli: [76, 38],
  Bingöl: [80, 42],
  Bingol: [80, 42],
  Elazığ: [76, 42],
  Elazig: [76, 42],
  Erzincan: [76, 36],
  Çankırı: [54, 30],
  Cankiri: [54, 30],
  Kırıkkale: [52, 36],
  Kirikkale: [52, 36],
  Sinop: [58, 18],
  Ordu: [70, 22],
  Giresun: [72, 22],
};

export function TurkiyeMap({
  dots,
  accent = 'var(--super)',
}: {
  dots: CityDot[];
  accent?: string;
}) {
  const enriched = dots.map((d) => {
    if (typeof d.x === 'number' && typeof d.y === 'number') return d;
    const coord = CITY_COORDS[d.city];
    return coord ? { ...d, x: coord[0], y: coord[1] } : d;
  });

  const totalCities = enriched.length;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2 / 1',
        background: 'var(--paper-2)',
        borderRadius: 'var(--r)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path
          d="M 4 30 C 4 22, 8 18, 16 18 L 24 14 L 38 12 L 54 14 L 70 12 L 84 16 L 94 22 L 96 32 L 90 40 L 78 42 L 64 40 L 50 42 L 36 44 L 22 42 L 10 38 Z"
          fill="var(--paper-3)"
          stroke="var(--line-2)"
          strokeWidth="0.3"
        />
      </svg>

      {enriched.map((d, i) => {
        if (typeof d.x !== 'number' || typeof d.y !== 'number') return null;
        const r = 3 + Math.sqrt(d.count) * 0.8;
        return (
          <div
            key={`${d.city}-${i}`}
            style={{
              position: 'absolute',
              left: `${d.x}%`,
              top: `${d.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              style={{
                width: r * 2,
                height: r * 2,
                borderRadius: 999,
                background: accent,
                opacity: 0.18,
                position: 'absolute',
                inset: 0,
                transform: 'scale(2)',
              }}
            />
            <div
              style={{
                width: r * 2,
                height: r * 2,
                borderRadius: 999,
                background: accent,
                boxShadow: '0 0 0 1.5px var(--card)',
                position: 'relative',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: r * 2 + 4,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--f-mono)',
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--ink-2)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.04em',
              }}
            >
              {d.city}{' '}
              <span style={{ color: accent }}>{d.count}</span>
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 12,
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        TR · {totalCities} şehir
      </div>
    </div>
  );
}

// ===================================================================
// Placeholder — dashed çerçeve placeholder
// ===================================================================

export function Placeholder({
  label,
  width,
  height,
  ratio,
}: {
  label: string;
  width?: number | string;
  height?: number | string;
  ratio?: string;
}) {
  return (
    <div
      style={{
        width: width || '100%',
        height,
        aspectRatio: ratio,
        border: '1px dashed var(--line-2)',
        borderRadius: 'var(--r-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-3)',
        fontFamily: 'var(--f-mono)',
        fontSize: 10.5,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  );
}

// ===================================================================
// PageHeader — sayfa başlığı bloğu (eyebrow + title + action)
// ===================================================================

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  size = 46,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <SerifTitle size={size} className="mt-2">
          {title}
        </SerifTitle>
        {description && (
          <p className="text-ink-2 text-base mt-3 max-w-[640px]">{description}</p>
        )}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
