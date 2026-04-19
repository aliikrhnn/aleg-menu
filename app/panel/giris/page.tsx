import { LoginForm } from './login-form';

interface Props {
  searchParams: { error?: string };
}

export default function PanelLoginPage({ searchParams }: Props) {
  return (
    <div data-theme="warm" className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-[12px] bg-accent flex items-center justify-center mb-4"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 28,
              fontWeight: 500,
              color: '#FAF5EA',
              letterSpacing: '-0.04em',
            }}
          >
            a
          </div>
          <div
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            Aleg
          </div>
          <div
            className="text-ink-3 uppercase mt-1"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
            }}
          >
            İŞLETME PANELİ
          </div>
        </div>

        {/* Form Card */}
        <div
          className="bg-card rounded-[14px] border border-line p-8"
          style={{
            boxShadow: '0 1px 0 rgba(42,31,24,0.04), 0 12px 32px -18px rgba(42,31,24,0.18)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
            className="mb-2"
          >
            İşletmene gir
          </h1>
          <p className="text-ink-3 text-sm mb-6">
            E-postanı ve şifreni gir, panel açılsın.
          </p>

          {searchParams.error === 'no_business' && (
            <div className="mb-4 p-3 rounded-[10px] bg-warn/10 border border-warn/20 text-warn text-sm">
              Bu hesabın bir işletme üyeliği yok. Süper adminle iletişime geç.
            </div>
          )}

          {searchParams.error === 'invalid_credentials' && (
            <div className="mb-4 p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-sm">
              E-posta veya şifre hatalı.
            </div>
          )}

          <LoginForm />
        </div>

        {/* Yardım linki */}
        <div className="text-center mt-8 text-xs text-ink-3">
          <span style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.04em' }}>
            Yardıma mı ihtiyacın var?
          </span>{' '}
          <a href="https://alegstudio.com" className="text-accent hover:underline">
            Bize yaz
          </a>
        </div>

        <div
          className="text-center mt-2 text-xs text-ink-3"
          style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
        >
          alegstudio.com · v0.1
        </div>
      </div>
    </div>
  );
}
