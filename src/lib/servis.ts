import { supabase } from './supabase'
import { normalizeNopol } from './nopol'
import { mapServisError, pesanStatusSudahBerubah, type Hasil } from './servisErrors'
import type { ServisPayload } from './servisValidation'
import type { StatusServis, Tables } from '../types/database'

export type Servis = Tables<'layanan_service'>

export type RiwayatStatusItem = {
  id: string
  status_baru: StatusServis
  waktu: string
  service_advisors: { nama: string } | null
}

export type ServisDetail = Servis & { riwayat_status: RiwayatStatusItem[] }

export type HasilCariKendaraan = {
  /** Kontak terakhir yang diketahui; `null` bila kendaraan belum pernah terdaftar. */
  pelanggan: Pick<Tables<'pelanggan'>, 'nama_pembawa' | 'nomor_wa'> | null
  jenisMotorTerakhir: string | null
  /** Id servis aktif kendaraan ini, bila ada. */
  servisAktifId: string | null
}

function ok<T>(data: T): Hasil<T> {
  return { data, error: null }
}

function gagal<T>(error: Parameters<typeof mapServisError>[0]): Hasil<T> {
  return { data: null, error: mapServisError(error) }
}

export async function ambilServisAktif(): Promise<Hasil<Servis[]>> {
  const { data, error } = await supabase
    .from('layanan_service')
    .select('*')
    .neq('status', 'Sudah Diambil')
    .order('tanggal_masuk', { ascending: true })
  if (error) return gagal(error)
  return ok(data)
}

/** `data` bernilai `null` bila servis tidak ada. */
export async function ambilServis(id: string): Promise<Hasil<ServisDetail | null>> {
  const { data, error } = await supabase
    .from('layanan_service')
    .select('*, riwayat_status(id, status_baru, waktu, service_advisors(nama))')
    .eq('id', id)
    .maybeSingle()
  if (error) return gagal(error)
  return ok(data as ServisDetail | null)
}

export async function cariKendaraan(nopol: string): Promise<Hasil<HasilCariKendaraan>> {
  const kosong: HasilCariKendaraan = { pelanggan: null, jenisMotorTerakhir: null, servisAktifId: null }
  const normal = normalizeNopol(nopol)
  if (normal.length < 3) return ok(kosong)

  const { data: pelanggan, error } = await supabase
    .from('pelanggan')
    .select('id, nama_pembawa, nomor_wa')
    .eq('nomor_polisi', normal)
    .maybeSingle()
  if (error) return gagal(error)
  if (!pelanggan) return ok(kosong)

  // Kunjungan terakhir; bila belum diambil, itulah servis aktif kendaraan ini.
  const { data: terakhir, error: errorLayanan } = await supabase
    .from('layanan_service')
    .select('id, jenis_motor, status')
    .eq('pelanggan_id', pelanggan.id)
    .order('tanggal_masuk', { ascending: false })
    .limit(1)
  if (errorLayanan) return gagal(errorLayanan)

  const layanan = terakhir[0]
  return ok({
    pelanggan: { nama_pembawa: pelanggan.nama_pembawa, nomor_wa: pelanggan.nomor_wa },
    jenisMotorTerakhir: layanan?.jenis_motor ?? null,
    servisAktifId: layanan && layanan.status !== 'Sudah Diambil' ? layanan.id : null,
  })
}

export async function daftarServis(value: ServisPayload): Promise<Hasil<string>> {
  const { data, error } = await supabase.rpc('daftar_servis', {
    p_nomor_polisi: value.nomor_polisi,
    p_nama_pembawa: value.nama_pembawa,
    p_nomor_wa: value.nomor_wa,
    p_jenis_motor: value.jenis_motor,
    p_kilometer: value.kilometer,
    p_masalah: value.masalah,
  })
  if (error) return gagal(error)
  return ok(data)
}

export async function ubahServis(id: string, value: ServisPayload): Promise<Hasil<null>> {
  const { error } = await supabase.rpc('ubah_servis', {
    p_id: id,
    p_nomor_polisi: value.nomor_polisi,
    p_nama_pembawa: value.nama_pembawa,
    p_nomor_wa: value.nomor_wa,
    p_jenis_motor: value.jenis_motor,
    p_kilometer: value.kilometer,
    p_masalah: value.masalah,
  })
  if (error) return gagal(error)
  return ok(null)
}

export async function hapusServis(id: string): Promise<Hasil<null>> {
  const { error } = await supabase.rpc('hapus_servis', { p_id: id })
  if (error) return gagal(error)
  return ok(null)
}

/**
 * Ubah status dengan syarat status saat ini masih `dari` (design D5).
 * Bila 0 baris terpengaruh, status sudah diubah di perangkat lain.
 */
export async function ubahStatus(
  id: string,
  dari: StatusServis,
  ke: StatusServis,
): Promise<Hasil<null>> {
  const { data, error } = await supabase
    .from('layanan_service')
    .update({ status: ke })
    .eq('id', id)
    .eq('status', dari)
    .select('id')
  if (error) return gagal(error)
  if (data.length === 0) return { data: null, error: pesanStatusSudahBerubah() }
  return ok(null)
}
