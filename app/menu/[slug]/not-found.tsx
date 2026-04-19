import Link from 'next/link';

export default function MenuNotFound() {
  return (
    <div data-theme="warm" className="min-h-screen bg-paper text-ink flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">○</div>
        <div
          className="text-ink-3 uppercase mb-3"
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          MENÜ BULUNAMADI
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
          className="mb-4"
        >
          Bu adres geçersiz
        </h1>
        <p className="text-ink-2 text-base mb-8 leading-relaxed">
          QR kodunuz hatalı olabilir veya işletme henüz aktif değil.
          <br />
          Lütfen sunucumuza danışın.
        </p>
        <Link
          href="https://alegstudio.com"
          className="inline-block text-accent text-sm hover:underline"
        >
          alegstudio.com →
        </Link>
      </div>
    </div>
  );
}
