'use client';

import { useState, useEffect } from 'react';

interface NavProps {
  onDemo: () => void;
}

export function Nav({ onDemo }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Özellikler' },
    { href: '#modules', label: 'Modüller' },
    { href: '#pricing', label: 'Fiyatlar' },
    { href: '#map', label: 'Harita' },
    { href: '#faq', label: 'SSS' },
    { href: '#contact', label: 'İletişim' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          scrolled ? 'border-b border-line' : 'border-b border-transparent'
        }`}
        style={{
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'color-mix(in srgb, var(--paper) 78%, transparent)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5">
            <div
              className="w-[34px] h-[34px] rounded-[10px] bg-ink text-paper grid place-items-center"
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              A
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[20px] font-medium tracking-[-0.02em]">Aleg</span>
              <span
                className="text-[9px] text-ink-3 mt-0.5"
                style={{
                  fontFamily: 'var(--f-mono)',
                  letterSpacing: '0.18em',
                }}
              >
                STUDIO
              </span>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden lg:flex gap-7 items-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14.5px] text-ink-2 hover:text-ink transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://panel.alegstudio.com"
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-line text-ink hover:bg-paper-2 transition-all"
            >
              Giriş
            </a>
            <button
              onClick={onDemo}
              className="px-4 py-2.5 rounded-full bg-accent text-[#FDF8EC] text-sm font-medium hover:opacity-95 transition-all"
              style={{
                boxShadow: '0 2px 6px rgba(42,31,24,0.08), 0 18px 40px -20px rgba(42,31,24,0.2)',
              }}
            >
              Demo Talep Et
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-ink"
              aria-label="menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <path d="M3 6h18" />
                    <path d="M3 12h18" />
                    <path d="M3 18h18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed top-[72px] left-0 right-0 bottom-0 z-[99] bg-paper px-8 py-10 flex flex-col gap-4 lg:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-2xl text-ink py-2.5 border-b border-line"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              onDemo();
            }}
            className="mt-4 px-6 py-4 rounded-full bg-accent text-[#FDF8EC] font-medium text-base"
          >
            Demo Talep Et
          </button>
        </div>
      )}
    </>
  );
}
