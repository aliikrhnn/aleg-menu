'use client';

import { useState, useEffect } from 'react';

export function ModuleDeepDive() {
  return (
    <section
      id="modules-deep"
      className="relative z-10"
      style={{ padding: '140px 0' }}
    >
      <div className="max-w-[1280px] mx-auto px-8">
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
            Derinlik · Panel&apos;den Doğrudan
          </span>
        </div>

        <h2
          className="text-ink mb-6 max-w-[900px]"
          style={{
            fontSize: 'clamp(44px, 6vw, 80px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            fontWeight: 500,
            paddingBottom: 6,
          }}
        >
          Her modül, tek başına bir{' '}
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--accent)',
            }}
          >
            ürün gibi.
          </span>
        </h2>

        <p
          className="text-ink-2 max-w-[620px]"
          style={{ fontSize: 17, lineHeight: 1.55, marginBottom: 80 }}
        >
          Aleg&apos;in iç modelinden doğrudan çıkan 14 çekirdek modül. Hiçbiri &quot;eklenti&quot;
          değil — çekirdek ürünle beraber geliyor, birlikte konuşuyor.
        </p>

        <div className="flex flex-col gap-24 mb-24">
          {/* AI MODÜLÜ — ALEG'İN EN GÜÇLÜ FARKLILAŞTIRICISI */}
          <AIModule />

          <ModuleDetail
            num="02"
            title="QR Menü & İmzalı Masa Oturumları"
            lead="Her masa için imzalı, versiyonlu QR. Kopya veya uzaktan taranmış QR'lara karşı dört farklı doğrulama politikası: open, table_code, staff_unlock, hybrid."
            bullets={[
              'İmzalı TableQr — iptal edilebilir, versiyonlanmış',
              "Kısa ömürlü oturum token'ları · hız limiti",
              'Politikaya göre sipariş yetkilendirmesi',
              "İnternet'e yüklenen QR fotoğrafı sonsuz sipariş yetkisi vermez",
            ]}
            visual={<VisQR />}
          />

          <ModuleDetail
            reverse
            num="03"
            title="İstasyon Bazlı Yönlendirme"
            lead="Her OrderLine, ilgili istasyona otomatik düşer. Bar, mutfak, soğuk prep, pastane — herkes sadece kendi işini görür. Yazıcılar lokasyon ve doküman tipine göre yönlendirilir."
            bullets={[
              'OrderTicket · istasyon bazlı execution view',
              'Yazıcı yönlendirme: lokasyon, istasyon, doküman',
              "Modifier ve notların istasyon metadata'sı",
              'Gerçek zamanlı ekran güncellemesi',
            ]}
            visual={<VisStations />}
          />

          <ModuleDetail
            num="04"
            title="Offline-Safe Kasiyer"
            lead="İnternet kesilirse kasiyer durmaz. Siparişler ve ödemeler CashSession sınırı içinde yerel olarak yazılır; bağlantı dönünce sessizce senkronize olur. Hiçbir sipariş kaybolmaz."
            bullets={[
              'CashSession · terminal + operator + vardiya',
              'PaymentIntent idempotent · her retry izlenebilir',
              'Lokal kuyruk — bağlantı sonrası sync',
              'UI varsayımları yerine durable ledger',
            ]}
            visual={<VisOffline />}
          />

          <ModuleDetail
            reverse
            num="05"
            title="Sadakat · LoyaltyAccount"
            lead="Tenant-scoped puan ledger'ı. Kampanyalar menü indirimi, sadakat tetikleyicisi veya misafir teşviki verebilir. Damga kart yerine imzalı dijital hesap."
            bullets={[
              'Kazanma kuralları · kampanyaya bağlanır',
              'Otomatik seviye sistemi · Bronz/Gümüş/Altın',
              'Doğum günü, ilk ziyaret, referans tetikleri',
              'QR menüden ve kasadan ortak bakiye',
            ]}
            visual={<VisLoyalty />}
          />

          <ModuleDetail
            num="06"
            title="PaymentIntent → PaymentRecord"
            lead="Beklenen ödemenin idempotent kaydı, gerçekleşen ödemenin dayanıklı finansal kaydı. UI varsayımları finansal gerçek değildir."
            bullets={[
              'Idempotent payment intent · retry-safe',
              'Ingenico & Verifone terminal entegrasyonu',
              'Onaylı · Reddedilen · Voidlenmiş · İade durumları',
              'Denetim izi · her işleme traceable',
            ]}
            visual={<VisPayment />}
          />
        </div>

        {/* 8 Ek Modül Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { t: 'Kampanyalar', d: 'Menü indirimi, loyalty tetikleyici, misafir teşviki.', num: '07' },
            { t: 'Stok Hareketleri', d: 'Satış, fire, transfer, teslim — immutable hareket kaydı.', num: '08' },
            { t: 'Paket Servis', d: 'CourierJob · atama, teslim alma, transit, tamamlama.', num: '09' },
            { t: 'Telefon Siparişi', d: 'Çağrı merkezi operatörleri için ayrı akış.', num: '10' },
            { t: 'Vardiya Planı', d: 'ShiftPlan · ShiftInstance · clock-in sınırları.', num: '11' },
            { t: 'Yorum & Şikayet', d: 'ReviewCase · sipariş veya teslimat bağlamı.', num: '12' },
            { t: 'Cihaz & Yazıcı', d: 'Her aksiyon tenant/location bağlamına izlenebilir.', num: '13' },
            { t: 'Çoklu Lokasyon', d: 'BusinessTenant altında birden fazla Location.', num: '14' },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-card border border-line rounded-[14px] px-5 py-6 hover:-translate-y-1 transition-all"
              style={{ boxShadow: '0 1px 2px rgba(42,31,24,0.06)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(42,31,24,0.06)';
              }}
            >
              <span
                className="text-accent"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                }}
              >
                MODÜL {m.num}
              </span>
              <h4
                className="mt-2.5 mb-1.5"
                style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em' }}
              >
                {m.t}
              </h4>
              <p className="text-ink-2 leading-relaxed" style={{ fontSize: 13 }}>
                {m.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ModuleDetail Kart
// ============================================================
function ModuleDetail({
  num,
  title,
  lead,
  bullets,
  visual,
  reverse,
  highlight,
}: {
  num: string;
  title: string;
  lead: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center ${
        reverse ? 'lg:[direction:rtl]' : ''
      }`}
    >
      <div className="lg:[direction:ltr]">
        <span
          className="text-accent block mb-4"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 500,
          }}
        >
          MODÜL {num}
        </span>
        <h3
          className="text-ink mb-4"
          style={{
            fontSize: 'clamp(28px, 3.6vw, 44px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontWeight: 500,
          }}
        >
          {title}
        </h3>
        <p
          className="text-ink-2 mb-5 max-w-[460px] leading-relaxed"
          style={{ fontSize: 16.5 }}
        >
          {lead}
        </p>
        <ul className="list-none p-0">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 py-2.5 text-ink"
              style={{
                fontSize: 14.5,
                borderBottom: i < bullets.length - 1 ? '1px dashed var(--line)' : 'none',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.4"
                className="flex-shrink-0 mt-1.5"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:[direction:ltr] flex justify-center">
        <div
          className="bg-card border border-line rounded-[22px] p-5 md:p-7 relative overflow-hidden w-full max-w-[460px] h-[480px] md:h-auto md:aspect-square"
          style={{
            boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
            ...(highlight && {
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--accent) 4%, var(--card)), var(--card))',
            }),
          }}
        >
          <div className="w-full h-full flex flex-col">{visual}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIS 1 — QR
// ============================================================
function VisQR() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1800);
    return () => clearInterval(t);
  }, []);

  const labels = ['QR TARANDI', 'İMZA DOĞRULANDI', 'POLİTİKA: table_code', 'OTURUM AKTİF'];

  return (
    <div className="flex flex-col items-center text-center gap-4 w-full h-full">
      <span
        className="self-start px-2.5 py-1 rounded-full"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          color: 'var(--ink)',
          letterSpacing: '0.1em',
        }}
      >
        OTURUM DOĞRULAMASI
      </span>

      <div className="relative p-4 rounded-xl" style={{ background: 'var(--ink)' }}>
        <svg width="130" height="130" viewBox="0 0 130 130">
          {Array.from({ length: 13 }).map((_, i) =>
            Array.from({ length: 13 }).map((_, j) => {
              const v = (i * 7 + j * 3 + i * j + step) % 4;
              return (
                v === 0 && (
                  <rect
                    key={`${i}-${j}`}
                    x={i * 10}
                    y={j * 10}
                    width="8"
                    height="8"
                    fill="var(--paper)"
                  />
                )
              );
            })
          )}
        </svg>
        <div
          className="absolute left-4 right-4 h-0.5"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 0 10px 2px var(--accent)',
            top: 16,
            animation: 'qrScan 2.4s ease-in-out infinite alternate',
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full mt-1">
        {labels.map((l, i) => {
          const isDone = i <= step;
          const isActive = i === step;
          return (
            <div
              key={i}
              className="flex items-center gap-2.5 transition-opacity"
              style={{ opacity: isDone ? 1 : 0.35 }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: isActive ? 'var(--accent)' : 'var(--olive)',
                  boxShadow: isActive
                    ? '0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent)'
                    : 'none',
                }}
              />
              <span
                className="text-ink-2"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                {l}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes qrScan {
          to {
            top: calc(100% - 18px);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// VIS 2 — İstasyon Routing
// ============================================================
function VisStations() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1600);
    return () => clearInterval(t);
  }, []);

  const orders = [
    { n: '#1284', lines: [{ st: 'Bar', i: 'Flat White' }, { st: 'Pastane', i: 'Croissant' }] },
    { n: '#1285', lines: [{ st: 'Mutfak', i: 'Sourdough' }, { st: 'Bar', i: 'Cortado' }] },
  ];
  const active = orders[tick % orders.length];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <span
        className="self-start px-2.5 py-1 rounded-full"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          color: 'var(--ink)',
          letterSpacing: '0.1em',
        }}
      >
        İSTASYON YÖNLENDİRME
      </span>

      <div
        className="rounded-[10px] p-3.5"
        style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }}
      >
        <div
          className="text-accent mb-2"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600 }}
        >
          {active.n}
        </div>
        <div className="flex flex-col gap-2">
          {active.lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5"
              style={{ fontSize: 13 }}
            >
              <span className="text-ink">{l.i}</span>
              <svg width="28" height="8" viewBox="0 0 28 8" fill="none" className="text-ink-3">
                <path d="M0 4h26M22 1l4 3-4 3" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span
                className="text-ink-2 px-2 py-0.5 rounded"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                }}
              >
                {l.st}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        {['Bar', 'Mutfak', 'Pastane', 'Soğuk'].map((s) => {
          const isActive = active.lines.some((l) => l.st === s);
          return (
            <div
              key={s}
              className="rounded-lg p-3.5 relative transition-all duration-500"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--paper)',
                color: isActive ? 'var(--paper)' : 'var(--ink)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--line)'}`,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                {s.toUpperCase()}
              </span>
              {isActive && (
                <span
                  className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--paper)',
                    animation: 'pulseDot 1.2s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes pulseDot {
          50% {
            opacity: 0.3;
            transform: scale(1.6);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// VIS 3 — Offline
// ============================================================
function VisOffline() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 2200);
    return () => clearInterval(t);
  }, []);

  const status = ['ONLINE · SYNC', 'OFFLINE · LOCAL WRITE', 'RECONNECTED · SYNCED'];
  const colors = ['var(--olive)', 'var(--gold)', 'var(--olive)'];

  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 w-full h-full">
      <span
        className="self-start px-2.5 py-1 rounded-full"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          color: 'var(--ink)',
          letterSpacing: '0.1em',
        }}
      >
        OFFLINE-SAFE KASİYER
      </span>

      <div className="flex gap-1.5 items-end my-3" style={{ height: 44 }}>
        {[40, 70, 100].map((h, i) => (
          <span
            key={i}
            className="w-1.5 rounded-[3px]"
            style={{
              height: `${h}%`,
              background: phase === 1 ? 'var(--ink-3)' : colors[phase],
              opacity: phase === 1 ? 0.4 : 1,
              animation: phase !== 1 ? `barPulse 1.6s ${i * 0.2}s ease-in-out infinite` : 'none',
            }}
          />
        ))}
      </div>

      <div
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: colors[phase],
          fontWeight: 600,
        }}
      >
        {status[phase]}
      </div>

      <div className="w-full flex flex-col gap-1 mt-2">
        {['Ödeme · ₺342', 'Ödeme · ₺185', 'Ödeme · ₺94'].map((l, i) => {
          const isPending = phase === 1 && i === 2;
          return (
            <div
              key={i}
              className="flex justify-between px-3 py-2.5 rounded-md"
              style={{
                background: 'var(--paper)',
                border: `1px solid ${isPending ? 'var(--gold)' : 'var(--line)'}`,
                fontSize: 12,
              }}
            >
              <span className="text-ink">{l}</span>
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  fontWeight: 600,
                  color: isPending ? 'var(--gold)' : 'var(--olive)',
                  letterSpacing: '0.08em',
                }}
              >
                {isPending ? 'QUEUED' : 'SYNCED'}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes barPulse {
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// AI MODULE — GENİŞLETİLMİŞ (full-width, 3 akış)
// ============================================================

const AI_SCENARIOS = [
  {
    id: 'recommend',
    label: 'MÜŞTERİ · KİŞİSELLEŞTİRİLMİŞ ÖNERİ',
    customer: 'recommendation',
    panel: 'analyze',
    panelTitle: 'AI müşteri profilini analiz ediyor',
    panelSub: 'Geçmiş · tercihler · saat · stok',
  },
  {
    id: 'describe',
    label: 'PANEL · AI ÜRÜN AÇIKLAMASI',
    customer: 'menu-item',
    panel: 'writing',
    panelTitle: 'AI editöryal açıklama yazıyor',
    panelSub: 'Tonun senin · kelimeler AI · 1.2s',
  },
  {
    id: 'translate',
    label: 'PANEL · ANINDA ÇOKLU DİL ÇEVİRİSİ',
    customer: 'menu-en',
    panel: 'translating',
    panelTitle: 'AI çevirmen · 84 ürün',
    panelSub: 'TR → EN / DE · yaklaşık 3 dakika',
  },
];

function AIModule() {
  const [scenario, setScenario] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScenario((s) => (s + 1) % AI_SCENARIOS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = AI_SCENARIOS[scenario];

  return (
    <div className="lg:-mx-8">
      {/* Copy */}
      <div className="lg:mx-8 mb-8">
        <span
          className="text-accent block mb-4"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 500,
          }}
        >
          MODÜL 01 · ✦ YAPAY ZEKA
        </span>
        <h3
          className="text-ink mb-4 max-w-[860px]"
          style={{
            fontSize: 'clamp(28px, 3.6vw, 44px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontWeight: 500,
          }}
        >
          Müşteriye{' '}
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--accent)',
            }}
          >
            yardımcı
          </span>
          , sana{' '}
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--accent)',
            }}
          >
            asistan
          </span>
          .
        </h3>
        <p
          className="text-ink-2 max-w-[640px] leading-relaxed"
          style={{ fontSize: 16.5 }}
        >
          Her ürüne editöryal açıklama, allergen önerisi, otomatik kategori, fotoğraftan içerik, QR
          menüden müşteriye öneri. Claude AI ile çalışır — tonun senin, kelimeler AI.
        </p>
      </div>

      {/* Stage - warm themed AI showcase */}
      <div
        data-theme="warm"
        className="lg:mx-8 rounded-[22px] p-6 md:p-10 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #F4EEE2 0%, #EDE4D3 100%)',
          border: '1px solid #D6C9B2',
          boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 30px 80px -30px rgba(42,31,24,0.3)',
        }}
      >
        {/* Paper texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(139, 110, 80, 0.06) 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(139, 110, 80, 0.04) 0%, transparent 40%)
            `,
          }}
        />

        {/* Scenario label */}
        <div className="relative z-10 flex justify-between items-center mb-6 flex-wrap gap-3">
          <div
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full"
            style={{ background: '#FAF5EA', border: '1px solid #D6C9B2' }}
          >
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1,
                color: '#C4553A',
              }}
            >
              ✦
            </span>
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                color: '#C4553A',
                fontWeight: 600,
              }}
            >
              {current.label}
            </span>
          </div>

          <div className="flex gap-2">
            {AI_SCENARIOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setScenario(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === scenario ? 24 : 8,
                  height: 8,
                  background: i === scenario ? '#C4553A' : '#E5D9C1',
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 items-start lg:items-center">
          {/* Phone */}
          <div className="flex flex-col items-center gap-3 mx-auto">
            <div
              className="relative rounded-[36px] p-[6px]"
              style={{
                width: 220,
                height: 440,
                background: 'linear-gradient(145deg, #2A1F18 0%, #1A1108 100%)',
                boxShadow: '0 4px 10px rgba(42,31,24,0.15), 0 30px 60px -20px rgba(42,31,24,0.4)',
              }}
            >
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full z-20"
                style={{ background: '#2A1F18' }}
              />
              <div
                className="rounded-[30px] w-full h-full overflow-hidden relative"
                style={{ background: '#F4EEE2' }}
              >
                <AICustomerScreen scene={current.customer} />
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                color: '#8C7A69',
                textTransform: 'uppercase',
              }}
            >
              Müşteri · Masa 14
            </div>
          </div>

          {/* Panel */}
          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              background: '#FAF5EA',
              border: '1px solid #D6C9B2',
              boxShadow: '0 4px 10px rgba(42,31,24,0.1)',
            }}
          >
            <AIPanelScreen
              scene={current.panel}
              title={current.panelTitle}
              subtitle={current.panelSub}
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes aiFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes aiType {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        @keyframes aiPulseBtn {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(196, 85, 58, 0.5);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(196, 85, 58, 0);
          }
        }
        @keyframes aiBlink {
          50% {
            opacity: 0;
          }
        }
        @keyframes aiSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

// Customer screens
function AICustomerScreen({ scene }: { scene: string }) {
  if (scene === 'recommendation') return <AIRecommendation />;
  if (scene === 'menu-item') return <AIMenuItem />;
  if (scene === 'menu-en') return <AIMenuEN />;
  return null;
}

function AIRecommendation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="text-center pb-2.5 mb-3"
        style={{ borderBottom: '1px solid #D6C9B2' }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            letterSpacing: '0.16em',
            color: '#8C7A69',
          }}
        >
          EST. 2026 · KARAKÖY
        </div>
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: '#C4553A',
            lineHeight: 1,
            marginTop: 3,
          }}
        >
          Aleg
        </div>
      </div>

      <div className="mb-3">
        <button
          className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-[11px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, #C4553A 0%, #D66A50 100%)',
            color: '#F4EEE2',
            boxShadow: '0 4px 12px rgba(196,85,58,0.3)',
            animation: phase === 0 ? 'aiPulseBtn 1.4s ease infinite' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          Ne içsem? AI&apos;ya sor
        </button>
      </div>

      {phase === 1 && (
        <div
          className="flex items-center justify-center gap-1.5 py-3 text-[10px]"
          style={{
            color: '#C4553A',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.12em',
            animation: 'aiFade 0.3s ease',
          }}
        >
          AI DÜŞÜNÜYOR
          <span className="inline-flex gap-0.5" style={{ animation: 'aiBlink 1s infinite' }}>
            <span>•</span>
            <span>•</span>
            <span>•</span>
          </span>
        </div>
      )}

      {phase >= 2 && (
        <div className="space-y-2" style={{ animation: 'aiFade 0.5s ease' }}>
          <div
            className="text-[9px] mb-2"
            style={{
              color: '#8C7A69',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            SENİN İÇİN ÖZEL · 3 ÖNERİ
          </div>
          {[
            { n: 'Flat White', d: 'Her zamanki', p: '₺95', badge: 'GEÇMİŞ', hl: true, bg: '#6B4F33' },
            { n: 'V60 · Geyşa', d: 'Daha hafif bir şey', p: '₺130', badge: 'YENİ DENE', bg: '#3E2A1B' },
            { n: 'Cortado', d: 'Kısa bir mola', p: '₺85', badge: 'HIZLI', bg: '#8A6B4F' },
          ].map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background: m.hl ? '#E8BFAF' : '#EDE4D3',
                border: `1px solid ${m.hl ? '#C4553A' : '#D6C9B2'}`,
                animation: `aiSlideIn 0.4s ease ${i * 0.12}s backwards`,
              }}
            >
              <div
                className="w-7 h-7 rounded-md flex-shrink-0 grid place-items-center"
                style={{
                  background: m.bg,
                  fontSize: 9,
                  color: '#F4EEE2',
                }}
              >
                ✦
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{ fontSize: 10, fontWeight: 500, color: '#2A1F18' }}
                >
                  {m.n}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 8, color: '#5A4A3D', fontStyle: 'italic' }}
                >
                  &ldquo;{m.d}&rdquo;
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: m.hl ? '#C4553A' : '#8C7A69',
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.1em',
                    marginTop: 1,
                    fontWeight: 600,
                  }}
                >
                  {m.badge}
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#2A1F18',
                  fontFamily: 'var(--f-mono)',
                }}
              >
                {m.p}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIMenuItem() {
  const [typed, setTyped] = useState(0);
  const fullText =
    'Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük. Sabahlarına dengeli bir başlangıç.';

  useEffect(() => {
    setTyped(0);
    const t = setInterval(() => {
      setTyped((i) => (i < fullText.length ? i + 2 : i));
    }, 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="h-24 rounded-lg mb-2 grid place-items-center"
        style={{
          background: 'linear-gradient(135deg, #6B4F33 0%, #3E2A1B 100%)',
          color: '#F4EEE2',
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
        }}
      >
        Flat White
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="px-1.5 py-0.5 rounded-full text-[7px] font-semibold flex items-center gap-1"
          style={{
            background: '#C4553A',
            color: '#F4EEE2',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.1em',
          }}
        >
          ✦ AI
        </span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 7,
            color: '#8C7A69',
            letterSpacing: '0.1em',
          }}
        >
          EDİTORYAL · TR
        </span>
      </div>

      <div
        className="mb-1"
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          color: '#2A1F18',
        }}
      >
        Flat White
      </div>

      <p
        style={{
          fontSize: 10,
          color: '#5A4A3D',
          lineHeight: 1.55,
          minHeight: 60,
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
        }}
      >
        {fullText.slice(0, typed)}
        {typed < fullText.length && (
          <span
            className="inline-block ml-0.5"
            style={{
              width: 2,
              height: 11,
              background: '#C4553A',
              verticalAlign: 'text-bottom',
              animation: 'aiBlink 0.8s step-start infinite',
            }}
          />
        )}
      </p>

      <div className="flex gap-1.5 mt-2 flex-wrap">
        {['Vegan seçeneği', 'Gluten-free', '120 kcal'].map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[7px]"
            style={{
              background: '#EDE4D3',
              border: '1px solid #D6C9B2',
              color: '#5A4A3D',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex justify-between items-center pt-3">
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 14,
            fontWeight: 600,
            color: '#2A1F18',
          }}
        >
          ₺85
        </div>
        <button
          className="px-4 py-2 rounded-full font-semibold text-[10px]"
          style={{ background: '#C4553A', color: '#F4EEE2' }}
        >
          Sepete +
        </button>
      </div>
    </div>
  );
}

function AIMenuEN() {
  return (
    <div className="h-full flex flex-col p-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="text-center pb-2.5 mb-2.5"
        style={{ borderBottom: '1px solid #D6C9B2' }}
      >
        <div
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 22,
            color: '#C4553A',
            lineHeight: 1,
          }}
        >
          Aleg
        </div>
        <div
          className="mt-1"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            color: '#8C7A69',
            letterSpacing: '0.12em',
          }}
        >
          TABLE 14 · ENGLISH MENU
        </div>
      </div>

      <div
        className="flex gap-1 mb-2 p-0.5 rounded-full w-fit"
        style={{ background: '#EDE4D3', border: '1px solid #D6C9B2' }}
      >
        {['TR', 'EN', 'DE'].map((lang) => (
          <span
            key={lang}
            className="px-2 py-0.5 rounded-full"
            style={{
              background: lang === 'EN' ? '#2A1F18' : 'transparent',
              color: lang === 'EN' ? '#F4EEE2' : '#8C7A69',
              fontFamily: 'var(--f-mono)',
              fontSize: 7,
              fontWeight: 600,
              letterSpacing: '0.1em',
            }}
          >
            {lang}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {[
          { n: 'Flat White', d: 'Double espresso shot with steamed velvet milk', p: '₺95' },
          { n: 'Sourdough Toast', d: 'House-baked sourdough with smashed avocado', p: '₺165' },
          { n: 'Cold Brew', d: 'Slow-steeped for 12 hours · naturally sweet', p: '₺95' },
        ].map((m, i) => (
          <div
            key={i}
            className="p-2 rounded"
            style={{
              background: '#EDE4D3',
              border: '1px solid #D6C9B2',
              animation: `aiSlideIn 0.3s ease ${i * 0.1}s backwards`,
            }}
          >
            <div className="flex justify-between items-start gap-2">
              <div style={{ fontSize: 10, fontWeight: 500, color: '#2A1F18' }}>{m.n}</div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 600,
                  color: '#2A1F18',
                }}
              >
                {m.p}
              </div>
            </div>
            <div
              className="mt-0.5"
              style={{
                fontSize: 8,
                color: '#5A4A3D',
                lineHeight: 1.4,
                fontStyle: 'italic',
              }}
            >
              {m.d}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-auto pt-3 flex items-center justify-center gap-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 7,
          color: '#8C7A69',
          letterSpacing: '0.12em',
        }}
      >
        <span style={{ color: '#C4553A', fontSize: 9 }}>✦</span>
        AI ILE ANLIK ÇEVİRİ
      </div>
    </div>
  );
}

// Panel screens
function AIPanelScreen({
  scene,
  title,
  subtitle,
}: {
  scene: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[400px] md:min-h-[440px] flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: '#EDE4D3', borderColor: '#D6C9B2' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md grid place-items-center"
            style={{
              background: '#2A1F18',
              color: '#F4EEE2',
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 13,
            }}
          >
            A
          </div>
          <div>
            <div
              className="text-[11px] font-semibold"
              style={{ color: '#2A1F18', lineHeight: 1 }}
            >
              Aleg Panel
            </div>
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: '#8C7A69',
                letterSpacing: '0.12em',
                marginTop: 2,
              }}
            >
              KARAKÖY · MENÜ EDİTÖRÜ
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #C4553A 0%, #D66A50 100%)',
            color: '#F4EEE2',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              letterSpacing: '0.14em',
              fontWeight: 600,
            }}
          >
            AI AKTİF
          </span>
        </div>
      </div>

      <div
        className="px-6 py-4 border-b"
        style={{ background: '#FAF5EA', borderColor: '#D6C9B2' }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              lineHeight: 1,
              color: '#C4553A',
            }}
          >
            ✦
          </span>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: '#2A1F18',
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 11, color: '#8C7A69', marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5">
        {scene === 'analyze' && <AIAnalyze />}
        {scene === 'writing' && <AIWriting />}
        {scene === 'translating' && <AITranslating />}
      </div>
    </div>
  );
}

function AIAnalyze() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 4)), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="rounded-lg p-3 mb-3"
        style={{ background: '#EDE4D3', border: '1px solid #D6C9B2' }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 9,
            color: '#8C7A69',
            letterSpacing: '0.12em',
          }}
        >
          MÜŞTERİ PROFİLİ · CEM U.
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
          {[
            ['Ziyaret', '18 kez'],
            ['Favorisi', 'Flat White'],
            ['Son', '3 gün önce'],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{ color: '#8C7A69' }}>{l}</div>
              <div className="font-semibold" style={{ color: '#2A1F18' }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { l: 'Müşteri geçmişi yükleniyor', done: step >= 1 },
          { l: 'Mevsim · hava · saat analizi', done: step >= 2 },
          { l: 'Stok & özel teklif kontrolü', done: step >= 3 },
          { l: '3 kişiselleştirilmiş öneri oluşturuldu', done: step >= 4, hl: true },
        ].map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded"
            style={{
              background: s.hl && s.done ? '#E8BFAF' : 'transparent',
              opacity: s.done ? 1 : 0.4,
              transition: 'all 0.3s',
            }}
          >
            <div
              className="w-4 h-4 rounded-full grid place-items-center flex-shrink-0"
              style={{
                background: s.done ? (s.hl ? '#C4553A' : '#6B7A4B') : '#EDE4D3',
                border: s.done ? 'none' : '1px solid #D6C9B2',
              }}
            >
              {s.done && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F4EEE2"
                  strokeWidth="4"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                color: s.hl && s.done ? '#2A1F18' : '#5A4A3D',
                fontWeight: s.hl && s.done ? 600 : 400,
              }}
            >
              {s.l}
            </span>
            {s.done && !s.hl && (
              <span
                className="ml-auto"
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 9,
                  color: '#6B7A4B',
                  letterSpacing: '0.08em',
                }}
              >
                ✓ {Math.floor(Math.random() * 120 + 30)}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AIWriting() {
  const [typed, setTyped] = useState(0);
  const fullText =
    'Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük. Sabahlarına dengeli bir başlangıç.';

  useEffect(() => {
    setTyped(0);
    const t = setInterval(() => {
      setTyped((i) => (i < fullText.length ? i + 2 : i));
    }, 45);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="flex items-center gap-2 p-2.5 rounded-lg"
        style={{ background: '#EDE4D3', border: '1px solid #D6C9B2' }}
      >
        <div
          className="px-2 py-1 rounded text-[9px] font-semibold"
          style={{
            background: '#F4EEE2',
            color: '#8C7A69',
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.1em',
          }}
        >
          GİRDİ
        </div>
        <div style={{ fontSize: 12, color: '#2A1F18' }}>
          Flat White · ₺85 · Espresso bazlı
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ['TON', 'Editöryal'],
          ['DİL', 'Türkçe'],
          ['UZUNLUK', '~20 kelime'],
        ].map(([l, v]) => (
          <div
            key={l}
            className="p-2 rounded"
            style={{ background: '#F4EEE2', border: '1px solid #D6C9B2' }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: '#8C7A69',
                letterSpacing: '0.1em',
              }}
            >
              {l}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#2A1F18',
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C4553A"
          strokeWidth="1.8"
          className="mx-auto"
        >
          <path d="M12 4v16M5 13l7 7 7-7" />
        </svg>
      </div>

      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(196,85,58,0.08) 0%, transparent 100%)',
          border: '1px solid #C4553A',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div
            className="px-2 py-0.5 rounded-full text-[8px] font-semibold flex items-center gap-1"
            style={{
              background: '#C4553A',
              color: '#F4EEE2',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            ✦ AI ÇIKTISI
          </div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              color: '#6B7A4B',
              letterSpacing: '0.08em',
            }}
          >
            ✓ 1.2s
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            lineHeight: 1.55,
            color: '#2A1F18',
            minHeight: 50,
          }}
        >
          {fullText.slice(0, typed)}
          {typed < fullText.length && (
            <span
              className="inline-block ml-0.5"
              style={{
                width: 2,
                height: 14,
                background: '#C4553A',
                verticalAlign: 'text-bottom',
                animation: 'aiBlink 0.8s step-start infinite',
              }}
            />
          )}
        </p>
      </div>

      {typed >= fullText.length - 5 && (
        <div className="flex gap-2" style={{ animation: 'aiFade 0.3s ease' }}>
          <button
            className="flex-1 py-2 rounded font-semibold text-[11px]"
            style={{ background: '#C4553A', color: '#F4EEE2' }}
          >
            ✓ Onayla & Yayınla
          </button>
          <button
            className="py-2 px-3 rounded text-[11px]"
            style={{
              background: '#F4EEE2',
              color: '#5A4A3D',
              border: '1px solid #D6C9B2',
            }}
          >
            Yeniden üret
          </button>
        </div>
      )}
    </div>
  );
}

function AITranslating() {
  const [lang, setLang] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLang((l) => (l + 1) % 2), 1800);
    return () => clearInterval(t);
  }, []);

  const langs = [
    { code: 'EN', name: 'English', txt: 'Double espresso shot with steamed velvet milk.' },
    { code: 'DE', name: 'Deutsch', txt: 'Doppelter Espresso mit gedämpfter Samtmilch.' },
  ];
  const current = langs[lang];

  return (
    <div className="space-y-3" style={{ animation: 'aiFade 0.4s ease' }}>
      <div
        className="p-3 rounded-lg"
        style={{ background: '#EDE4D3', border: '1px solid #D6C9B2' }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
            style={{
              background: '#2A1F18',
              color: '#F4EEE2',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.1em',
            }}
          >
            TR
          </span>
          <span
            style={{
              fontSize: 9,
              color: '#8C7A69',
              fontFamily: 'var(--f-mono)',
              letterSpacing: '0.08em',
            }}
          >
            KAYNAK
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#2A1F18',
          }}
        >
          Çift shot espresso, buharla ısıtılmış süt ve kadifemsi mikro-köpük.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 py-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4553A" strokeWidth="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </svg>
        <div
          className="flex-1 h-0.5 rounded-full overflow-hidden"
          style={{ background: '#E5D9C1', maxWidth: 120 }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #C4553A 0%, #B08A3E 100%)',
              width: '100%',
              animation: 'aiType 1s ease infinite',
            }}
          />
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4553A" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>

      <div
        key={lang}
        className="p-3 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(196,85,58,0.08) 0%, transparent 100%)',
          border: '1px solid #C4553A',
          animation: 'aiFade 0.4s ease',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
              style={{
                background: '#C4553A',
                color: '#F4EEE2',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.1em',
              }}
            >
              {current.code}
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#8C7A69',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.08em',
              }}
            >
              {current.name.toUpperCase()}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 8,
              color: '#6B7A4B',
              letterSpacing: '0.08em',
            }}
          >
            ✓ 0.8s
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: '#2A1F18',
          }}
        >
          {current.txt}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ['ÜRÜN', '84'],
          ['DİL', 'TR → 2'],
          ['SÜRE', '~3 dk'],
        ].map(([l, v]) => (
          <div
            key={l}
            className="p-2 rounded text-center"
            style={{ background: '#F4EEE2', border: '1px solid #D6C9B2' }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 8,
                color: '#8C7A69',
                letterSpacing: '0.1em',
              }}
            >
              {l}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#2A1F18',
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// VIS 5 — Sadakat
// ============================================================
function VisLoyalty() {
  const [count, setCount] = useState(1240);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => c + 5), 120);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 w-full h-full">
      <span
        className="self-start px-2.5 py-1 rounded-full"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          color: 'var(--ink)',
          letterSpacing: '0.1em',
        }}
      >
        SADAKAT · LOYALTYACCOUNT
      </span>

      <div className="flex flex-col items-center gap-1 mt-3">
        <span
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 72,
            color: 'var(--accent)',
            lineHeight: 1,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          {count.toLocaleString('tr-TR')}
        </span>
        <span
          className="text-ink-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
          }}
        >
          PUAN
        </span>
      </div>

      <div
        className="w-full h-1 rounded-full overflow-hidden mt-2"
        style={{ background: 'var(--paper-2)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: 'var(--accent)',
            width: `${(count % 2000) / 20}%`,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      <div
        className="flex justify-between w-full mt-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.1em',
        }}
      >
        {['BRONZ', 'GÜMÜŞ', 'ALTIN'].map((t, i) => (
          <span
            key={t}
            style={{
              color: i === 1 ? 'var(--accent)' : 'var(--ink-3)',
              fontWeight: i === 1 ? 700 : 400,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// VIS 6 — Payment
// ============================================================
function VisPayment() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 3), 1400);
    return () => clearInterval(t);
  }, []);

  const states = [
    { l: 'PAYMENT_INTENT', d: 'Idempotency: 8f2-a9c', c: 'pending' },
    { l: 'PROCESSING', d: 'Ingenico terminali ·', c: 'pending' },
    { l: 'PAYMENT_RECORD', d: 'APPROVED · ₺342', c: 'ok' },
  ];

  return (
    <div className="flex flex-col justify-center gap-3 w-full h-full">
      <span
        className="self-start px-2.5 py-1 rounded-full mb-2"
        style={{
          background: 'var(--paper-2)',
          border: '1px solid var(--line)',
          fontFamily: 'var(--f-mono)',
          fontSize: 9.5,
          color: 'var(--ink)',
          letterSpacing: '0.1em',
        }}
      >
        ÖDEME AKIŞI
      </span>

      {states.map((s, i) => {
        const isOn = i <= phase;
        const isCurrent = i === phase;
        return (
          <div
            key={i}
            className="flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] transition-all"
            style={{
              background: 'var(--paper)',
              border: `${isCurrent ? '2px' : '1px'} solid ${isCurrent ? 'var(--accent)' : 'var(--line)'}`,
              opacity: isOn ? 1 : 0.4,
              boxShadow: isCurrent
                ? '0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)'
                : 'none',
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background:
                  s.c === 'ok' && isOn
                    ? 'var(--olive)'
                    : isCurrent
                    ? 'var(--gold)'
                    : 'var(--ink-3)',
                animation:
                  isCurrent && s.c === 'pending' ? 'payPulse 1s ease-in-out infinite' : 'none',
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {s.l}
              </div>
              <div className="text-ink-2 mt-0.5" style={{ fontSize: 12 }}>
                {s.d}
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes payPulse {
          50% {
            opacity: 0.3;
            transform: scale(1.6);
          }
        }
      `}</style>
    </div>
  );
}
