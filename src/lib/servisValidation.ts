import { normalizeNopol } from './nopol'

// Padanan validasi di RPC `bersihkan_input_servis` (supabase/migrations/0002_kelola_service.sql).
// Database adalah sumber kebenaran; validasi di sini hanya untuk umpan balik cepat.

export type ServisInput = {
  nomor_polisi: string
  nama_pembawa: string
  nomor_wa: string
  jenis_motor: string
  kilometer: string
  masalah: string
}

export type ServisPayload = {
  nomor_polisi: string
  nama_pembawa: string
  nomor_wa: string
  jenis_motor: string
  kilometer: number
  masalah: string
}

export type ServisFieldErrors = Partial<Record<keyof ServisInput, string>>

export const MASALAH_MAKS = 1000

export const SERVIS_INPUT_KOSONG: ServisInput = {
  nomor_polisi: '',
  nama_pembawa: '',
  nomor_wa: '',
  jenis_motor: '',
  kilometer: '',
  masalah: '',
}

/** Membuang spasi, tanda hubung, dan titik dari nomor WA. */
export function bersihkanNomorWa(input: string): string {
  return input.replace(/[\s.-]/g, '')
}

export function validasiServis(
  input: ServisInput,
): { errors: ServisFieldErrors; value: null } | { errors: null; value: ServisPayload } {
  const errors: ServisFieldErrors = {}

  const nopol = normalizeNopol(input.nomor_polisi)
  if (!nopol) errors.nomor_polisi = 'Nomor polisi wajib diisi.'
  else if (nopol.length < 3 || nopol.length > 10) {
    errors.nomor_polisi = 'Nomor polisi harus 3–10 huruf/angka.'
  }

  const nama = input.nama_pembawa.trim()
  if (!nama) errors.nama_pembawa = 'Nama pembawa wajib diisi.'

  const wa = bersihkanNomorWa(input.nomor_wa)
  if (!wa) errors.nomor_wa = 'Nomor WA wajib diisi.'
  else if (!/^\+?[0-9]{9,15}$/.test(wa)) {
    errors.nomor_wa = 'Nomor WA harus 9–15 digit (boleh diawali +).'
  }

  const jenis = input.jenis_motor.trim()
  if (!jenis) errors.jenis_motor = 'Jenis motor wajib diisi.'

  const kmTeks = input.kilometer.trim()
  const km = Number(kmTeks)
  if (!kmTeks) errors.kilometer = 'Kilometer wajib diisi.'
  else if (!/^\d+$/.test(kmTeks) || !Number.isSafeInteger(km) || km > 2147483647) {
    errors.kilometer = 'Kilometer harus bilangan bulat 0 atau lebih.'
  }

  const masalah = input.masalah.trim()
  if (!masalah) errors.masalah = 'Masalah wajib diisi.'
  else if (masalah.length > MASALAH_MAKS) {
    errors.masalah = `Masalah maksimal ${MASALAH_MAKS} karakter.`
  }

  if (Object.keys(errors).length > 0) return { errors, value: null }

  return {
    errors: null,
    value: {
      nomor_polisi: nopol,
      nama_pembawa: nama,
      nomor_wa: wa,
      jenis_motor: jenis,
      kilometer: km,
      masalah,
    },
  }
}
