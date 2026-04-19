'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const SHOTS = [
  {
    label: 'Dashboard',
    src: '/showcase/dashboard.webp',
    title: 'Gösterge Paneli',
    caption:
      'Günün özeti — ciro, sipariş, aktif masalar ve garson çağrıları tek ekranda. Kurulum adımları görülür, yapay zeka önizleme yanınızda.',
    w: 1600,
    h: 772,
  },
  {
    label: 'Kasa',
    src: '/showcase/kasa.webp',
    title: 'Kasa & Adisyon',
    caption:
      'Masalar, servisler, müşteri sadakati, indirimler — hepsi tek ekranda. Hesap bölme, birleştirme, fiş yazdırma tek tıkla.',
    w: 1600,
    h: 763,
  },
  {
    label: 'Sipariş Akışı',
    src: '/showcase/siparisler.webp',
    title: 'Canlı Siparişler',
    caption:
      'QR\'dan gelen siparişler kanban üstünde akar. Sipariş alındı → Hazırlanıyor → Hazır → Teslim edildi, aşamalar arasında sürükle-bırak.',
    w: 1159,
    h: 822,
  },
  {
    label: 'Sadakat',
    src: '/showcase/sadakat.webp',
    title: 'Sadakat Programı',
    caption:
      'Üye segmentasyonu — VIP, büyük harcayan, uyuyan, yeni — her biri için ayrı kampanya. Ömürlük değer ve puan havuzu takibi.',
    w: 1598,
    h: 841,
  },
  {
    label: 'Stok',
    src: '/showcase/stok.webp',
    title: 'Stok & Envanter',
    caption:
      'Kritik seviyede ne var? Yeniden sipariş noktalarını hücreden düzenle, raporu PDF olarak al, anlık uyarı kur.',
    w: 1123,
    h: 833,
  },
  {
    label: 'Vardiya',
    src: '/showcase/vardiya.webp',
    title: 'Haftalık Vardiya Planı',
    caption:
      'Sabah/öğle/akşam şablonlarını bir kez tanımla, haftalarca kullan. Personel saatleri otomatik hesaplanır, PDF olarak çıktı al.',
    w: 1127,
    h: 839,
  },
  {
    label: 'Kampanya',
    src: '/showcase/kampanyalar.webp',
    title: 'Kampanya Editörü',
    caption:
      'Popup, banner, zamanlı kampanya — menüde ne zaman ne gösterilecek sen belirle. Saat aralıkları, vurgu rengi, CTA yazısı dahil.',
    w: 1171,
    h: 829,
  },
  {
    label: 'Paket Servis',
    src: '/showcase/paket-servis.webp',
    title: 'Telefonla Sipariş',
    caption:
      'Gelen aramayı yakala, müşterinin geçmişini anında gör. Favori siparişleri, adresi, notları — arayan VIP ise uyarı düşer.',
    w: 1597,
    h: 847,
  },
  {
    label: 'Değerlendirme',
    src: '/showcase/degerlendirmeler.webp',
    title: 'Müşteri Değerlendirmeleri',
    caption:
      'QR fişinden gelen yorumlar — ortalama puan, dağılım, bekleyenler ve işaretliler. Sorunlu yorumları işaretle, anında cevap ver.',
    w: 1127,
    h: 835,
  },
  {
    label: 'Fiş',
    src: '/showcase/fis.webp',
    title: 'Fiş Tasarımcısı',
    caption:
      'Logo, alt başlık, servis bedeli, değerlendirme QR\'ı — müşterinin eline giden kâğıdı sen tasarla. Test yazdır, çık gitsin.',
    w: 1196,
    h: 833,
  },
  {
    label: 'Garson Çağrı',
    src: '/showcase/garson-cagri.webp',
    title: 'Garson Çağrı',
    caption:
      'Masadan gelen her çağrı sesli uyarıyla sana düşer. 5 farklı zil sesi, aktif çağrıları tek tek çözüldü işaretle.',
    w: 1158,
    h: 837,
  },
  {
    label: 'Ekip',
    src: '/showcase/ekip.webp',
    title: 'Ekip & Roller',
    caption:
      'Sahip, yönetici, müdür, operatör — her role gereken kadar erişim. Şube bazlı yetkilendirme, davet sistemi dahil.',
    w: 1600,
    h: 828,
  },
  {
    label: 'Gün Sonu',
    src: '/showcase/z-rapor.webp',
    title: 'Z Raporu',
    caption:
      'Kasa sayımı, ödeme dağılımı, saatlik trend, kategori cirosu — gün sonunda tek raporda. Yazdır ya da PDF olarak indir.',
    w: 1157,
    h: 821,
  },
];

export function Showcase() {
  const [tab, setTab] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTab((i) => (i + 1) % SHOTS.length), 4500);
    return () => clearInterval(t);
  }, [paused]);

  const selectTab = (i: number) => {
    setTab(i);
    setPaused(true);
    setTimeout(() => setPaused(false), 12000);
  };

  const current = SHOTS[tab];

  return (
    <section
      id="showcase"
      className="relative z-10"
      style={{ padding: '100px 0', background: 'var(--paper-2)' }}
    >
      <div className="max-w-[1280px] mx-auto px-8 reveal">
        {/* Center head */}
        <div className="text-center mb-12">
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
              Platform · 13 Ekran
            </span>
            <span className="w-6 h-px bg-ink-3" />
          </div>
          <h2
            className="text-ink"
            style={{
              fontSize: 'clamp(48px, 6vw, 84px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              fontWeight: 500,
            }}
          >
            İşte böyle{' '}
            <span
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              görünüyor.
            </span>
          </h2>
          <p
            className="text-ink-2 max-w-[560px] mx-auto mt-4 leading-relaxed"
            style={{ fontSize: 16 }}
          >
            Her bir modül, tek başına bir üründen daha derin düşünülmüş.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10 px-4">
          <div
            className="inline-flex bg-card border border-line rounded-full p-1.5 max-w-full overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {SHOTS.map((s, i) => (
              <button
                key={i}
                onClick={() => selectTab(i)}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  tab === i ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
                }`}
                style={{ fontSize: 12.5 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screen frame */}
        <div
          className="bg-card rounded-[14px] border border-line overflow-hidden max-w-[1200px] mx-auto"
          style={{
            boxShadow: '0 4px 10px rgba(42,31,24,0.1), 0 30px 60px -20px rgba(42,31,24,0.25)',
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: 'var(--paper-2)', borderColor: 'var(--line)' }}
          >
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ED6A5E' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5BF4F' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#61C554' }} />
            </div>
            <div
              className="flex-1 max-w-[420px] text-center mx-auto px-3.5 py-1 bg-paper rounded border border-line text-ink-3"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
            >
              panel.alegstudio.com /{' '}
              {current.label.toLowerCase().replace(/\s+/g, '-').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c] || c))}
            </div>
          </div>

          {/* Progress bar */}
          {!paused && (
            <div className="h-0.5 bg-paper-2 relative overflow-hidden">
              <div
                key={tab}
                className="absolute inset-y-0 left-0 bg-accent"
                style={{ animation: 'shotProg 4.5s linear forwards' }}
              />
            </div>
          )}

          {/* Screen image */}
          <div
            key={tab}
            className="relative bg-paper"
            style={{ animation: 'shotFade 0.5s ease' }}
          >
            <Image
              src={current.src}
              alt={current.title}
              width={current.w}
              height={current.h}
              priority={tab === 0}
              className="w-full h-auto block"
            />
          </div>

          {/* Caption */}
          <div
            className="px-7 py-5 border-t"
            style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
          >
            <div
              className="text-accent uppercase"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.14em' }}
            >
              {current.label.toUpperCase()}
            </div>
            <div
              className="my-1"
              style={{
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {current.title}
            </div>
            <p className="text-ink-2 leading-relaxed max-w-[760px]" style={{ fontSize: 14 }}>
              {current.caption}
            </p>
          </div>
        </div>

        {/* Counter hint */}
        <div
          className="text-center mt-6 text-ink-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 10,
            letterSpacing: '0.14em',
          }}
        >
          {String(tab + 1).padStart(2, '0')} / {String(SHOTS.length).padStart(2, '0')} · {paused ? 'DURAKLADI' : 'OTOMATİK'}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shotProg {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @keyframes shotFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
