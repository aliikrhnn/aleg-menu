import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Brutalist Spice font sistemi
        display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Iowan Old Style', 'serif'],
        mono: ['Space Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        // CSS değişkenlerine bağlı renkler — tema değiştikçe otomatik güncellenir
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        'paper-3': 'var(--paper-3)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-soft': 'var(--accent-soft)',
        olive: 'var(--olive)',
        gold: 'var(--gold)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        card: 'var(--card)',
        'card-2': 'var(--card-2)',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '14px',
        lg: '22px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(42,31,24,.06), 0 8px 24px rgba(42,31,24,.06)',
        lift: '0 4px 10px rgba(42,31,24,.08), 0 24px 60px rgba(42,31,24,.14)',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
