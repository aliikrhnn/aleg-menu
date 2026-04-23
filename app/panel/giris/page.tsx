import { LoginForm } from './login-form';
import { BrandSide } from './brand-side';

interface Props {
  searchParams: { error?: string };
}

export default function PanelLoginPage({ searchParams }: Props) {
  return (
    <div
      data-theme="warm"
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'var(--paper)' }}
    >
      {/* Sol: Marka paneli — mobile'da kompakt üst bölüm */}
      <div
        className="w-full lg:w-1/2 lg:min-h-screen"
        style={{
          borderRight: '1px solid var(--line)',
        }}
      >
        <BrandSide />
      </div>

      {/* Sağ: Form paneli */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 lg:py-16 lg:min-h-screen"
        style={{ background: 'var(--card-2)' }}
      >
        <div className="w-full max-w-md">
          {/* Üst etiket */}
          <div className="flex items-center gap-2 mb-6">
            <span
              style={{
                color: 'var(--accent)',
                fontSize: 10,
              }}
              aria-hidden="true"
            >
              ◆
            </span>
            <span
              className="uppercase"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
              }}
            >
              İŞLETME GİRİŞİ
            </span>
          </div>

          {/* Başlık */}
          <h1
            className="mb-3"
            style={{
              fontFamily: 'var(--f-serif)',
              fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 0.98,
              color: 'var(--ink)',
            }}
          >
            Tekrar{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--accent)',
              }}
            >
              hoşgeldin.
            </span>
          </h1>

          {/* Alt açıklama */}
          <p
            className="mb-7"
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--ink-2)',
            }}
          >
            E-posta ve şifrenle işletme paneline gir. Oturumun güvenli,
            bağlantın şifreli.
          </p>

          {/* Hata mesajları (URL query'den) */}
          {searchParams.error === 'no_business' && (
            <div
              className="mb-4 p-3 rounded-[10px] text-sm flex items-start gap-2"
              style={{
                background:
                  'color-mix(in srgb, var(--warn) 8%, var(--card))',
                border:
                  '1px solid color-mix(in srgb, var(--warn) 25%, var(--line))',
                color: 'var(--warn)',
              }}
            >
              <span className="flex-shrink-0">⚠</span>
              <span>
                Bu hesabın bir işletme üyeliği yok. Süper adminle iletişime geç.
              </span>
            </div>
          )}

          {searchParams.error === 'invalid_credentials' && (
            <div
              className="mb-4 p-3 rounded-[10px] text-sm flex items-start gap-2"
              style={{
                background:
                  'color-mix(in srgb, var(--danger) 8%, var(--card))',
                border:
                  '1px solid color-mix(in srgb, var(--danger) 25%, var(--line))',
                color: 'var(--danger)',
              }}
            >
              <span className="flex-shrink-0">⚠</span>
              <span>E-posta veya şifre hatalı.</span>
            </div>
          )}

          {/* Form */}
          <LoginForm />

          {/* Alt: Demo link + footer */}
          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Hesabın yok mu?{' '}
              <a
                href="/iletisim"
                className="font-semibold hover:underline"
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  textDecorationColor:
                    'color-mix(in srgb, var(--accent) 40%, transparent)',
                  textUnderlineOffset: 3,
                }}
              >
                Demo talep et →
              </a>
            </div>
            <div
              className="mt-4 flex items-center justify-center gap-3 flex-wrap"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
                letterSpacing: '0.08em',
              }}
            >
              <a href="/" className="hover:underline">
                alegstudio.com
              </a>
              <span>·</span>
              <a href="/gizlilik" className="hover:underline">
                Gizlilik
              </a>
              <a href="/sartlar" className="hover:underline">
                Şartlar
              </a>
              <a href="/cerezler" className="hover:underline">
                Çerezler
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
