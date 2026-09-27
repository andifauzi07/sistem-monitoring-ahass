import { supabase } from './supabase'
import { normalizeNopol } from './nopol'
import { mapServisError, type Hasil } from './servisErrors'
import type { Tables } from '../types/database'

export type RiwayatItem = Pick<
  Tables<'layanan_service'>,
  'id' | 'nomor_polisi' | 'nama_pembawa' | 'jenis_motor' | 'tanggal_selesai'
>

export type FilterRiwayat = {
  dariTanggal?: string
  sampaiTanggal?: string
  nomorPolisi?: string
}

export async function ambilRiwayat(filter: FilterRiwayat = {}): Promise<Hasil<RiwayatItem[]>> {
  let query = supabase
    .from('layanan_service')
    .select('id, nomor_polisi, nama_pembawa, jenis_motor, tanggal_selesai')
    .eq('status', 'Sudah Diambil')
    .order('tanggal_selesai', { ascending: false })

  if (filter.dariTanggal) query = query.gte('tanggal_selesai', filter.dariTanggal)
  if (filter.sampaiTanggal) query = query.lte('tanggal_selesai', `${filter.sampaiTanggal}T23:59:59.999`)

  const normal = filter.nomorPolisi ? normalizeNopol(filter.nomorPolisi) : ''
  if (normal) query = query.ilike('nomor_polisi', `%${normal}%`)

  const { data, error } = await query
  if (error) return { data: null, error: mapServisError(error) }
  return { data, error: null }
}
