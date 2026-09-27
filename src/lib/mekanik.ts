import { supabase } from './supabase'
import { mapMekanikError, pesanNamaKosong, type Hasil } from './mekanikErrors'
import { ambilServisAktif } from './servis'
import type { Tables } from '../types/database'

export type MekanikRingkasan = Pick<Tables<'mekanik'>, 'id' | 'nama' | 'status_hadir'> & {
  bebanKerja: number
}

function ok<T>(data: T): Hasil<T> {
  return { data, error: null }
}

function gagal<T>(error: Parameters<typeof mapMekanikError>[0]): Hasil<T> {
  return { data: null, error: mapMekanikError(error) }
}

/** Daftar mekanik aktif beserta jumlah kendaraan yang sedang ditanganinya (FR-5.5). */
export async function ambilDaftarMekanik(): Promise<Hasil<MekanikRingkasan[]>> {
  const [mekanikRes, servisHasil] = await Promise.all([
    supabase.from('mekanik').select('id, nama, status_hadir').eq('is_active', true).order('nama'),
    ambilServisAktif(),
  ])
  if (mekanikRes.error) return gagal(mekanikRes.error)
  if (servisHasil.error) return { data: null, error: { kode: 'UMUM', pesan: servisHasil.error.pesan } }

  const bebanPerMekanik = new Map<string, number>()
  for (const s of servisHasil.data) {
    if (!s.mekanik_id) continue
    bebanPerMekanik.set(s.mekanik_id, (bebanPerMekanik.get(s.mekanik_id) ?? 0) + 1)
  }

  return ok(mekanikRes.data.map((m) => ({ ...m, bebanKerja: bebanPerMekanik.get(m.id) ?? 0 })))
}

export async function tambahMekanik(nama: string): Promise<Hasil<null>> {
  const namaBersih = nama.trim()
  if (!namaBersih) return { data: null, error: pesanNamaKosong() }
  const { error } = await supabase.from('mekanik').insert({ nama: namaBersih })
  if (error) return gagal(error)
  return ok(null)
}

export async function ubahNamaMekanik(id: string, nama: string): Promise<Hasil<null>> {
  const namaBersih = nama.trim()
  if (!namaBersih) return { data: null, error: pesanNamaKosong() }
  const { error } = await supabase.from('mekanik').update({ nama: namaBersih }).eq('id', id)
  if (error) return gagal(error)
  return ok(null)
}

export async function ubahStatusHadir(id: string, statusHadir: boolean): Promise<Hasil<null>> {
  const { error } = await supabase.from('mekanik').update({ status_hadir: statusHadir }).eq('id', id)
  if (error) return gagal(error)
  return ok(null)
}

export async function nonaktifkanMekanik(id: string): Promise<Hasil<null>> {
  const { error } = await supabase.from('mekanik').update({ is_active: false }).eq('id', id)
  if (error) return gagal(error)
  return ok(null)
}
