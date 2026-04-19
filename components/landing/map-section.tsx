'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export function MapSection() {
  const [view, setView] = useState<'world' | 'turkey'>('world');
  const [animating, setAnimating] = useState(false);

  const goToTurkey = () => {
    if (view === 'turkey' || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setView('turkey');
      setTimeout(() => setAnimating(false), 50);
    }, 600);
  };

  const goToWorld = () => {
    if (view === 'world') return;
    setView('world');
  };

  return (
    <section
      id="map"
      className="relative z-10"
      style={{ padding: '120px 0', background: 'var(--paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        <div className="inline-flex items-center gap-2.5 mb-5">
          <span className="w-6 h-px bg-ink-3" />
          <span
            className="text-ink-3 uppercase"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              fontWeight: 500,
            }}
          >
            Yayılma · Live Map
          </span>
        </div>

        <div className="flex justify-between items-end mb-12 gap-10 flex-wrap">
          <h2
            className="text-ink max-w-[720px]"
            style={{
              fontSize: 'clamp(48px, 6vw, 84px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            Aleg burada{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              büyüyor.
            </span>
          </h2>
          <p className="text-ink-2 max-w-[420px]" style={{ fontSize: 17, lineHeight: 1.5 }}>
            Dünya&apos;dan Isparta&apos;ya, oradan senin şehrine. Türkiye üzerine tıkla, detayı gör.
          </p>
        </div>

        <div className="inline-flex bg-card border border-line rounded-full p-1 mb-7">
          <button
            onClick={goToWorld}
            className={`px-5 py-2.5 rounded-full transition-all ${
              view === 'world' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
            }`}
            style={{ fontSize: 14 }}
          >
            Dünya
          </button>
          <button
            onClick={goToTurkey}
            className={`px-5 py-2.5 rounded-full transition-all ${
              view === 'turkey' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
            }`}
            style={{ fontSize: 14 }}
          >
            Türkiye
          </button>
        </div>

        <div
          className="relative rounded-[22px] overflow-hidden border"
          style={{
            background: view === 'world' ? '#000000' : '#1a1510',
            borderColor: view === 'world' ? '#1a2030' : 'rgba(0,0,0,0.3)',
            aspectRatio: '16/9',
            boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 30px 80px -20px rgba(42,31,24,0.35)',
            transition: 'all 0.5s',
          }}
        >
          {view === 'world' ? (
            <WorldView onTurkeyClick={goToTurkey} animating={animating} />
          ) : (
            <TurkeyView onBack={goToWorld} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-7">
          {[
            { lab: '🗓 Başlangıç', val: "Yaz 2026 · Isparta'dan başlıyoruz" },
            { lab: '📍 Aktif Şehir', val: '6 şehir · 9 işletme' },
            { lab: '🌍 Ufuk', val: "2027 · Avrupa'ya genişleme planlı" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-line rounded-[14px] px-5 py-4">
              <div
                className="text-ink-3 mb-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                }}
              >
                {s.lab}
              </div>
              <div
                className="text-ink"
                style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.3 }}
              >
                {s.val}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// WORLD
// ============================================================
function WorldView({ onTurkeyClick, animating }: { onTurkeyClick: () => void; animating: boolean }) {
  return (
    <div
      className="absolute inset-0 cursor-pointer overflow-hidden"
      onClick={onTurkeyClick}
      style={{ background: 'radial-gradient(ellipse at center, #0a0e1a 0%, #000 70%)' }}
    >
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 7 === 0 ? 3 : i % 3 === 0 ? 1 : 2,
              height: i % 7 === 0 ? 3 : i % 3 === 0 ? 1 : 2,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              opacity: 0.3 + (i % 5) * 0.14,
              animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.15) % 4}s`,
            }}
          />
        ))}
      </div>

      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: 'min(78%, 560px)',
          aspectRatio: 1,
          transform: 'translate(-50%, -50%)',
          animation: animating
            ? 'globeZoom 0.6s cubic-bezier(0.7, 0, 0.84, 0) forwards'
            : 'globeFloat 8s ease-in-out infinite',
        }}
      >
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            boxShadow: `
              0 0 80px 8px rgba(80, 140, 220, 0.25),
              inset -30px -20px 80px rgba(0, 0, 0, 0.6),
              inset 20px 20px 60px rgba(120, 180, 230, 0.08)
            `,
          }}
        >
          <div
            className="absolute -inset-1"
            style={{ animation: 'earthSpin 90s linear infinite' }}
          >
            <Image
              src="/map/earth.webp"
              alt="Dünya"
              fill
              priority
              className="object-cover"
              style={{ filter: 'brightness(0.95) saturate(1.05)' }}
            />
          </div>
        </div>

        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: '-8%',
            background:
              'radial-gradient(circle at 38% 38%, transparent 55%, rgba(100, 160, 220, 0.3) 72%, transparent 80%)',
          }}
        />

        <div
          className="absolute z-10"
          style={{
            top: '38%',
            left: '56%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onTurkeyClick();
          }}
        >
          <div
            className="relative rounded-full cursor-pointer"
            style={{
              width: 14,
              height: 14,
              background: '#E85D3A',
              boxShadow: '0 0 0 3px rgba(232, 93, 58, 0.35), 0 0 20px rgba(232, 93, 58, 0.7)',
              zIndex: 2,
            }}
          />
          {[0, 1.1].map((delay, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: -4,
                border: '2px solid #E85D3A',
                animation: `worldPulse 2.2s ease-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          ))}
          <div
            className="absolute whitespace-nowrap"
            style={{
              left: 'calc(100% + 14px)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 10,
              padding: '8px 12px',
              color: 'white',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                color: '#FFB89E',
                fontWeight: 600,
              }}
            >
              TÜRKİYE
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              Tıkla · detayı gör
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-5 left-5 flex flex-col gap-1"
        style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, zIndex: 3 }}
      >
        {[
          ['KONUM', 'Isparta · 37.76°N · 30.55°E'],
          ['STATÜS', 'Yaz 2026 pilot · 3 işletme'],
          ['HEDEF', "2027 · Avrupa'ya genişleme"],
        ].map(([lab, val], i) => (
          <div key={i} className="flex gap-2.5">
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.14em',
                minWidth: 70,
                fontSize: 9,
              }}
            >
              {lab}
            </span>
            <b style={{ color: 'white', fontWeight: 500, fontSize: 11 }}>{val}</b>
          </div>
        ))}
      </div>

      <div
        className="absolute top-5 right-5 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)',
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
        }}
      >
        TIKLA · YAKINLAŞTIR
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes globeFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        @keyframes globeZoom {
          to { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes earthSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes worldPulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// TURKEY — Silüet + kodla eklenmiş keskin şehir isimleri
// ============================================================

// 18 şehir — gerçek Türkiye pozisyonlarına göre (%)
// status: 'main' | 'active' | 'waiting'
// labelPos: pin'in neresinde etiket gözüksün ('top', 'bottom', 'left', 'right')
const CITIES = [
  // MAIN — Isparta pilot
  {
    id: 'isparta',
    name: 'ISPARTA',
    x: 26,
    y: 58,
    status: 'main' as const,
    count: 3,
    tag: 'PİLOT · YAZ 2026',
    msg: '🚀 Aleg ilk buradan başlıyor',
    labelPos: 'bottom' as const,
  },
  // ACTIVE — Beta şehirler (Bursa da aktif yapıldı)
  {
    id: 'istanbul',
    name: 'İstanbul',
    x: 15,
    y: 14,
    status: 'active' as const,
    count: 2,
    tag: 'BETA · Q3 2026',
    labelPos: 'bottom' as const,
  },
  {
    id: 'ankara',
    name: 'Ankara',
    x: 38,
    y: 29,
    status: 'active' as const,
    count: 1,
    tag: 'BETA · Q3 2026',
    labelPos: 'bottom' as const,
  },
  {
    id: 'izmir',
    name: 'İzmir',
    x: 7,
    y: 48,
    status: 'active' as const,
    count: 1,
    tag: 'BETA · Q3 2026',
    labelPos: 'left' as const,
  },
  {
    id: 'antalya',
    name: 'Antalya',
    x: 28,
    y: 72,
    status: 'active' as const,
    count: 1,
    tag: 'BETA · Q3 2026',
    labelPos: 'bottom' as const,
  },
  {
    id: 'bursa',
    name: 'Bursa',
    x: 17,
    y: 24,
    status: 'active' as const,
    count: 1,
    tag: 'BETA · Q3 2026',
    labelPos: 'left' as const,
  },
  // WAITING — Talep bekleyen
  { id: 'eskisehir', name: 'Eskişehir', x: 28, y: 32, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'konya', name: 'Konya', x: 37, y: 55, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'adana', name: 'Adana', x: 53, y: 62, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'gaziantep', name: 'Gaziantep', x: 63, y: 70, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'trabzon', name: 'Trabzon', x: 73, y: 17, status: 'waiting' as const, labelPos: 'top' as const },
  { id: 'diyarbakir', name: 'Diyarbakır', x: 77, y: 56, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'samsun', name: 'Samsun', x: 55, y: 14, status: 'waiting' as const, labelPos: 'top' as const },
  { id: 'kayseri', name: 'Kayseri', x: 51, y: 48, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'van', name: 'Van', x: 92, y: 49, status: 'waiting' as const, labelPos: 'right' as const },
  { id: 'erzurum', name: 'Erzurum', x: 83, y: 30, status: 'waiting' as const, labelPos: 'bottom' as const },
  { id: 'denizli', name: 'Denizli', x: 15, y: 58, status: 'waiting' as const, labelPos: 'left' as const },
  { id: 'mugla', name: 'Muğla', x: 14, y: 70, status: 'waiting' as const, labelPos: 'left' as const },
];

function TurkeyView({ onBack }: { onBack: () => void }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a1510 0%, #0f0c08 50%, #1a1510 100%)',
      }}
    >
      {/* Dotted grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(196,85,58,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient glow behind Isparta */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '26%',
          top: '58%',
          width: 400,
          height: 400,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(196,85,58,0.12) 0%, transparent 60%)',
          animation: 'ambientGlow 4s ease-in-out infinite',
        }}
      />

      {/* Stage */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: 'min(94%, 1200px)',
          aspectRatio: '1400 / 762',
          maxHeight: '90%',
          transform: 'translate(-50%, -50%)',
          animation: 'trLandIn 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* CLEAN silhouette */}
        <div className="absolute inset-0">
          <Image
            src="/map/turkey-silhouette.webp"
            alt="Türkiye"
            fill
            priority
            className="pointer-events-none"
            style={{
              objectFit: 'fill',
              filter: 'drop-shadow(0 0 20px rgba(196,85,58,0.15))',
            }}
          />
        </div>

        {/* Glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              'radial-gradient(ellipse at 30% 55%, rgba(196,85,58,0.25) 0%, transparent 40%)',
          }}
        />

        {/* Arcs from Isparta to active cities */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="arcGlow">
              <feGaussianBlur stdDeviation="0.3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {CITIES.filter((c) => c.status === 'active').map((c, i) => {
            const ispX = 26;
            const ispY = 58;
            const mx = (ispX + c.x) / 2;
            const my = (ispY + c.y) / 2;
            const dx = c.x - ispX;
            const dy = c.y - ispY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const lift = Math.min(dist * 0.28, 14);
            const cy = my - lift;
            const d = `M ${ispX} ${ispY} Q ${mx} ${cy} ${c.x} ${c.y}`;
            const delay = (i * 0.45) % 3.5;
            return (
              <g key={c.id}>
                <path
                  d={d}
                  fill="none"
                  stroke="#E85D3A"
                  strokeWidth="0.2"
                  strokeDasharray="0.6 1.0"
                  opacity="0.5"
                  filter="url(#arcGlow)"
                />
                <circle r="0.7" fill="#FFB89E" filter="url(#arcGlow)">
                  <animateMotion dur="3.2s" repeatCount="indefinite" path={d} begin={`${delay}s`} />
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.1;0.9;1"
                    dur="3.2s"
                    repeatCount="indefinite"
                    begin={`${delay}s`}
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Pins with labels */}
        {CITIES.map((c, idx) => (
          <CityPin key={c.id} city={c} idx={idx} tick={tick} />
        ))}
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 rounded-xl px-4 py-3.5 flex flex-col gap-1.5 z-10"
        style={{
          background: 'rgba(26, 21, 16, 0.85)',
          border: '1px solid rgba(232, 93, 58, 0.3)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        <LegendItem color="#E85D3A" ring="#E85D3A" text="Pilot · Isparta · 3 işletme" />
        <LegendItem color="#FFB89E" text="Beta · 6 işletme" />
        <LegendItem color="rgba(255,255,255,0.4)" border="rgba(255,255,255,0.6)" text="Talep bekliyor" />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 right-4 rounded-full transition-all hover:bg-black/70 z-10"
        style={{
          background: 'rgba(26, 21, 16, 0.85)',
          border: '1px solid rgba(232, 93, 58, 0.3)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'var(--f-mono)',
        }}
      >
        ← Dünyayı göster
      </button>

      <style jsx>{`
        @keyframes trLandIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes pinDrop {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes pinPulse {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        @keyframes pinGlow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        @keyframes ambientGlow {
          0%, 100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Şehir Pin + Etiket
// ============================================================
type City = (typeof CITIES)[number];

function CityPin({ city, idx, tick }: { city: City; idx: number; tick: number }) {
  const isMain = city.status === 'main';
  const isActive = city.status === 'active';
  const isWaiting = city.status === 'waiting';

  // Aktif şehirler farklı zamanlarda yanıp sönsün
  const breatheOn = (tick + idx) % 4 < 2;

  // Label pozisyonu
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    fontFamily: 'var(--f-mono)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };

  if (city.labelPos === 'top') {
    labelStyle.bottom = 'calc(100% + 10px)';
    labelStyle.left = '50%';
    labelStyle.transform = 'translateX(-50%)';
  } else if (city.labelPos === 'left') {
    labelStyle.right = 'calc(100% + 12px)';
    labelStyle.top = '50%';
    labelStyle.transform = 'translateY(-50%)';
  } else if (city.labelPos === 'right') {
    labelStyle.left = 'calc(100% + 12px)';
    labelStyle.top = '50%';
    labelStyle.transform = 'translateY(-50%)';
  } else {
    // bottom (default)
    labelStyle.top = 'calc(100% + 10px)';
    labelStyle.left = '50%';
    labelStyle.transform = 'translateX(-50%)';
  }

  return (
    <div
      className="absolute group cursor-pointer"
      style={{
        left: `${city.x}%`,
        top: `${city.y}%`,
        transform: 'translate(-50%, -50%)',
        animation: `pinDrop 0.5s ease forwards`,
        animationDelay: `${idx * 70}ms`,
        opacity: 0,
        zIndex: isMain ? 5 : isActive ? 4 : 3,
      }}
    >
      {/* Glow aura */}
      {(isMain || isActive) && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: isMain ? -16 : -12,
            background: isMain
              ? 'radial-gradient(circle, rgba(232,93,58,0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255,184,158,0.5) 0%, transparent 70%)',
            animation: `pinGlow 2s ease-in-out infinite`,
            animationDelay: `${idx * 0.2}s`,
          }}
        />
      )}

      {/* Dot */}
      <div
        className="rounded-full relative z-10"
        style={{
          width: isMain ? 14 : isActive ? 11 : 7,
          height: isMain ? 14 : isActive ? 11 : 7,
          background: isMain
            ? '#E85D3A'
            : isActive
            ? breatheOn
              ? '#FFB89E'
              : '#E85D3A'
            : 'rgba(255,255,255,0.4)',
          border: isWaiting ? '1.5px solid rgba(255,255,255,0.6)' : 'none',
          boxShadow: isMain
            ? '0 0 12px 2px rgba(232,93,58,0.8), 0 0 0 3px rgba(232,93,58,0.35)'
            : isActive
            ? '0 0 10px 2px rgba(232,93,58,0.6), 0 0 0 2px rgba(232,93,58,0.3)'
            : 'none',
          transition: 'all 0.6s ease',
        }}
      />

      {/* Pulse rings for Isparta */}
      {isMain && (
        <>
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -4,
              border: '2px solid #E85D3A',
              animation: 'pinPulse 2s ease-out infinite',
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: -4,
              border: '2px solid #E85D3A',
              animation: 'pinPulse 2s ease-out infinite',
              animationDelay: '1s',
            }}
          />
        </>
      )}

      {/* CITY LABEL — NET VE OKUNAKLI */}
      <div
        style={{
          ...labelStyle,
          fontSize: isMain ? 11 : isActive ? 10 : 9,
          fontWeight: isMain ? 700 : isActive ? 600 : 400,
          color: isMain
            ? '#FFFFFF'
            : isActive
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.55)',
          background: isMain
            ? 'rgba(232, 93, 58, 0.95)'
            : isActive
            ? 'rgba(26, 21, 16, 0.9)'
            : 'rgba(26, 21, 16, 0.75)',
          padding: isMain ? '5px 11px' : isActive ? '4px 10px' : '3px 8px',
          borderRadius: 999,
          border: isMain
            ? '1px solid rgba(255,255,255,0.3)'
            : isActive
            ? '1px solid rgba(232, 93, 58, 0.5)'
            : '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(6px)',
          boxShadow: isMain
            ? '0 4px 12px rgba(232, 93, 58, 0.4), 0 0 0 1px rgba(232, 93, 58, 0.3)'
            : isActive
            ? '0 2px 8px rgba(0, 0, 0, 0.4)'
            : '0 1px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        {city.name}
        {city.count && city.count > 0 && (
          <span
            style={{
              marginLeft: 4,
              fontWeight: 700,
              color: isMain ? '#FFD9CF' : '#FFB89E',
            }}
          >
            · {city.count}
          </span>
        )}
      </div>

      {/* Popover on hover */}
      <div
        className="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
        style={{
          bottom: 'calc(100% + 40px)',
          background: 'rgba(26, 21, 16, 0.97)',
          border: '1px solid rgba(232, 93, 58, 0.4)',
          backdropFilter: 'blur(10px)',
          borderRadius: 14,
          padding: '14px 16px',
          minWidth: 220,
          color: 'white',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.04em',
            marginBottom: 4,
            color: 'white',
          }}
        >
          {city.name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
          {city.msg ||
            (city.count && city.count > 0
              ? `${city.count} işletme Aleg kullanıyor`
              : 'Sen ilk ol — demo talep et')}
        </div>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            letterSpacing: '0.1em',
            color: isMain || isActive ? '#FFB89E' : 'rgba(255,255,255,0.4)',
          }}
        >
          {city.tag || 'Talep bekliyor'}
        </span>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  ring,
  border,
  text,
}: {
  color: string;
  ring?: string;
  border?: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{
          background: color,
          boxShadow: ring ? `0 0 8px 2px ${ring}` : 'none',
          border: border ? `1.5px solid ${border}` : 'none',
        }}
      />
      {text}
    </div>
  );
}
