interface Props {
  params: { slug: string };
}

export default function MenuPage({ params }: Props) {
  return (
    <main className="min-h-screen flex items-center justify-center px-8">
      <div className="max-w-lg text-center">
        <div className="label-mono text-accent mb-4">MÜŞTERİ MENÜSÜ</div>
        <h1 className="font-serif-italic text-5xl leading-tight mb-6">
          {params.slug}
        </h1>
        <p className="text-ink-2 mb-8">
          Bu sayfa QR okutulduğunda açılacak menü sayfası.
          <br />
          Kafe kodu: <code className="font-mono text-sm bg-paper-2 px-2 py-1 rounded">{params.slug}</code>
        </p>
        <div className="inline-block px-4 py-2 rounded-[10px] bg-paper-2 border border-line text-sm text-ink-3">
          🚧 Menü tasarımı aktarılacak
        </div>
      </div>
    </main>
  );
}
