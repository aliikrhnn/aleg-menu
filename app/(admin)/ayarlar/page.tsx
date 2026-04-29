import { SettingsClient } from '@/components/admin/settings-client'
import { listPlatformSettings } from '@/lib/actions/admin-settings'

export const dynamic = 'force-dynamic'

export default async function AyarlarPage() {
  const settings = await listPlatformSettings()

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <SettingsClient settings={settings} />
    </div>
  )
}
