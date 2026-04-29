import { createClient } from '@/lib/supabase/server'
import { CommandPalette } from './command-palette'

/**
 * CommandPaletteMount
 *
 * Server component'ı: işletme listesini Supabase'den çeker ve
 * client tarafındaki <CommandPalette /> bileşenini hidrate eder.
 *
 * Kullanım: admin layout'unun sonuna ekle:
 *
 *   import { CommandPaletteMount } from '@/components/admin/command-palette-mount'
 *   ...
 *   <CommandPaletteMount />
 */
export async function CommandPaletteMount() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .order('name', { ascending: true })

  type BusinessRow = { id: string; name: string; slug: string }
  const businesses = (data ?? []) as unknown as BusinessRow[]
  return <CommandPalette businesses={businesses} />
}
