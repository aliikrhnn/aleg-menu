'use client';

import { useState } from 'react';

const QUESTIONS = [
  {
    q: "Mevcut POS'umdan veri aktarabilir miyim?",
    a: 'Evet. Menü, müşteri listesi ve geçmiş satış verilerinin çoğunu Excel veya doğrudan API üzerinden aktarıyoruz. Kurulum ekibi senin için yapıyor.',
  },
  {
    q: 'İnternet kesilirse ne olur?',
    a: 'POS ve mutfak ekranı offline-first çalışır. Siparişler lokal olarak kaydedilir, internet döndüğünde otomatik senkronize edilir. Müşterin hiçbir şey fark etmez.',
  },
  {
    q: 'Yazıcı ve terminal uyumu nasıl?',
    a: 'ESC/POS standardındaki tüm termal fiş yazıcılar, Epson TM serisi, Star Micronics çalışır. Ingenico ve Verifone POS cihazları entegredir.',
  },
  {
    q: 'İptal edebilir miyim?',
    a: 'Her zaman. Taahhüt yok, ceza yok. İstediğin zaman panelden tek tıkla iptal edebilirsin. Verilerini de her zaman export edebilirsin.',
  },
  {
    q: 'Ekibime nasıl kullanmayı öğretirim?',
    a: 'Aleg tasarımı kasiyer-dostu. Yeni başlayan biri 15 dakikada öğrenir. Ayrıca video eğitimler, canlı onboarding ve WhatsApp destek hattı dahil.',
  },
  {
    q: 'Yurtdışında kullanılabilir mi?',
    a: "2027'den itibaren Avrupa ve Orta Doğu pazarlarında aktif olacağız. Çoklu para birimi, çoklu dil, yerel ödeme sağlayıcıları dahil.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="relative z-10" style={{ padding: '100px 0' }}>
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-15">
          {/* Left - Head */}
          <div>
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
                SSS
              </span>
            </div>
            <h2
              className="text-ink"
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                fontWeight: 500,
              }}
            >
              Merak{' '}
              <span
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                ettiklerin.
              </span>
            </h2>
            <p className="text-ink-2 mt-4 leading-relaxed" style={{ fontSize: 15 }}>
              Burada cevabını bulamadıklarını{' '}
              <a
                href="https://wa.me/905462311434"
                target="_blank"
                rel="noopener noreferrer"
                className="text-olive hover:underline"
              >
                WhatsApp
              </a>
              &apos;tan sorabilirsin.
            </p>
          </div>

          {/* Right - Items */}
          <div>
            {QUESTIONS.map((item, i) => (
              <div
                key={i}
                onClick={() => setOpen(open === i ? -1 : i)}
                className="cursor-pointer"
                style={{
                  borderTop: '1px solid var(--line)',
                  padding: '22px 0',
                  borderBottom: i === QUESTIONS.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <div className="flex justify-between items-center gap-5">
                  <h4
                    className="text-ink"
                    style={{
                      fontSize: 19,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.q}
                  </h4>
                  <div
                    className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0 transition-all"
                    style={{
                      border: `1px solid ${open === i ? 'var(--accent)' : 'var(--line)'}`,
                      color: open === i ? 'var(--accent)' : 'var(--ink-2)',
                      transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </div>
                <div
                  className="overflow-hidden transition-all text-ink-2"
                  style={{
                    fontSize: 15,
                    lineHeight: 1.55,
                    maxHeight: open === i ? 200 : 0,
                    marginTop: open === i ? 14 : 0,
                  }}
                >
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
