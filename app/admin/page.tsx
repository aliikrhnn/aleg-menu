export default function AdminHomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-8">
      <div className="max-w-lg text-center">
        <div className="label-mono text-accent mb-4">SÜPER ADMİN PANELİ</div>
        <h1 className="font-serif-italic text-5xl leading-tight mb-6">
          admin.alegstudio.com
        </h1>
        <p className="text-ink-2 mb-8">
          Bu alan süper admin paneli için. Tasarım sürecin tamamlandığında
          buraya Claude Design çıktısı aktarılacak.
        </p>
        <div className="inline-block px-4 py-2 rounded-[10px] bg-paper-2 border border-line text-sm text-ink-3">
          🚧 Geliştirme aşamasında
        </div>
      </div>
    </main>
  );
}
