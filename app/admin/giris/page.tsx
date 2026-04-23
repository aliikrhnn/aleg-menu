import { LoginForm } from './login-form';
import { AdminBrandSide } from './brand-side';

interface Props {
  searchParams: { error?: string };
}

export default function AdminLoginPage({ searchParams }: Props) {
  return (
    <div
      data-theme="warm"
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'var(--paper)' }}
    >
      {/* Sol: Marka paneli */}
      <div
        className="w-full lg:w-1/2 lg:min-h-screen"
        style={{ borderRight: '1px solid var(--line)' }}
      >
        <AdminBrandSide />
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
                color: 'var(--super)',
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
                color: 'var(--super)',
              }}
            >
              SÜPER ADMİN GİRİŞİ
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
            Platform{' '}
            <span
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--super)',
              }}
            >
              yönetimi.
            </span>
          </h1>

          <p
            className="mb-7"
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--ink-2)',
            }}
          >
            Bu sayfa sadece Aleg ekip üyeleri içindir. Yetkili değilsen{' '}
            <a
              href="/panel/giris"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              işletme girişine
            </a>{' '}
            geç.
          </p>

          {searchParams.error === 'not_authorized' && (
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
              <span>Bu hesabın süper admin yetkisi yok.</span>
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

          <LoginForm />

          {/* Alt footer */}
          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div
              className="flex items-center justify-center gap-3 flex-wrap"
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
              <span>ADMIN v0.1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
