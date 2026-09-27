import { supabase } from './supabase'
import { mapServisError, type Hasil } from './servisErrors'

export type RingkasanMekanik = { hadir: number; total: number }

export async function ambilRingkasanMekanik(): Promise<Hasil<RingkasanMekanik>> {
  const { data, error } = await supabase
    .from('mekanik')
    .select('id, status_hadir')
    .eq('is_active', true)
  if (error) return { data: null, error: mapServisError(error) }
  return { data: { hadir: data.filter((m) => m.status_hadir).length, total: data.length }, error: null }
}
