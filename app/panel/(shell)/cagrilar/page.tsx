import { getCallButtons } from '@/lib/actions/call-buttons';
import { CallButtonsManager } from './call-buttons-manager';

export const dynamic = 'force-dynamic';

export default async function CallButtonsPage() {
  const result = await getCallButtons();

  return (
    <div className="px-6 md:px-8 py-6 md:py-8 max-w-[900px] mx-auto">
      <CallButtonsManager
        initialButtons={result.success ? result.buttons || [] : []}
        error={result.success ? null : result.error || null}
      />
    </div>
  );
}
