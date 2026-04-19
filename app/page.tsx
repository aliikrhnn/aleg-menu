import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-ink flex items-center justify-center">
            <span className="text-paper font-display font-bold text-xl">A</span>
          </div>
          <div>
            <div className="font-display font-bold text-xl tracking-tight">Aleg</div>
            <div className="label-mono text-ink-3">Studio</div>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="#ozellikler" className="text-ink-2 hover:text-ink transition-colors">Özellikler</Link>
          <Link href="#fiyatlar" className="text-ink-2 hover:text-ink transition-colors">Fiyatlar</Link>
          <Link href="#iletisim" className="text-ink-2 hover:text-ink transition-colors">İletişim</Link>
          <a
            href="https://panel.alegstudio.com"
            className="h-10 px-5 rounded-[14px] bg-ink text-paper font-medium hover:opacity-90 transition-opacity inline-flex items-center"
          >
            İşletme girişi
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-8 py-20">
        <div className="max-w-4xl text-center">
          <div className="label-mono text-accent mb-6">İŞLETME YÖNETİM SİSTEMİ</div>
          <h1 className="font-serif-italic text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight text-ink mb-8">
            İşletmen,<br />nefes alıyor.
          </h1>
          <p className="text-lg text-ink-2 max-w-2xl mx-auto mb-12 leading-relaxed">
            QR menüden kasaya, mutfak ekranından sadakat programına — tek bir platformda.
            Kafe, restoran, bar, pastane — her tür yiyecek-içecek işletmesi için.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="#iletisim"
              className="h-12 px-8 rounded-[14px] bg-accent text-card font-medium hover:opacity-90 transition-opacity inline-flex items-center"
            >
              Demo talep et
            </a>
            <a
              href="#ozellikler"
              className="h-12 px-8 rounded-[14px] border border-line text-ink hover:bg-paper-2 transition-colors inline-flex items-center"
            >
              Özellikleri gör
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 border-t border-line/50 flex items-center justify-between text-sm text-ink-3">
        <div>© 2026 Aleg Studio. Tüm hakları saklıdır.</div>
        <div className="label-mono">v0.1 · MVP</div>
      </footer>
    </main>
  );
}
