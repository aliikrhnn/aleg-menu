import { LoginForm } from './login-form';

interface Props {
  searchParams: { error?: string };
}

export default function AdminLoginPage({ searchParams }: Props) {
  return (
    <div data-theme="swiss" className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-12 h-12 rounded-[12px] bg-ink flex items-center justify-center mb-4">
            <span className="text-paper font-display font-bold text-2xl">A</span>
          </div>
          <div className="font-display font-bold text-2xl tracking-tight">Aleg</div>
          <div className="label-mono text-ink-3 mt-1">SÜPER ADMİN</div>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-[14px] border border-line p-8 shadow-soft">
          <h1 className="font-serif-italic text-3xl mb-2">Tekrar hoşgeldin</h1>
          <p className="text-ink-3 text-sm mb-6">Platform yönetim paneline giriş yap</p>

          {searchParams.error === 'not_authorized' && (
            <div className="mb-4 p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-sm">
              Bu hesabın süper admin yetkisi yok.
            </div>
          )}

          {searchParams.error === 'invalid_credentials' && (
            <div className="mb-4 p-3 rounded-[10px] bg-danger/10 border border-danger/20 text-danger text-sm">
              E-posta veya şifre hatalı.
            </div>
          )}

          <LoginForm />
        </div>

        <div className="text-center mt-8 text-xs text-ink-3 font-mono">
          alegstudio.com · v0.1
        </div>
      </div>
    </div>
  );
}
