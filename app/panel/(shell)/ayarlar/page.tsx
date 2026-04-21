import { getBusinessSettings } from '@/lib/actions/settings';
import { SettingsManager } from './settings-manager';

export const dynamic = 'force-dynamic';

export default async function AyarlarPage() {
  const result = await getBusinessSettings();

  if (!result.success || !result.settings) {
    return (
      <div className="px-8 py-10 max-w-[1200px] mx-auto">
        <div className="bg-card border border-line rounded-[var(--r)] p-8 text-center">
          <div className="text-accent text-3xl mb-3">⚠</div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'var(--f-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              fontWeight: 400,
            }}
          >
            Ayarlar yüklenemedi
          </h2>
          <p className="text-ink-2 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'alegstudio.com';

  return (
    <SettingsManager
      initialSettings={result.settings}
      rootDomain={rootDomain}
    />
  );
}
