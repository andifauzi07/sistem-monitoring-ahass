import { STATUS_SERVIS, type StatusServis } from '../types/database'

export function statusBerikutnya(status: StatusServis): StatusServis | null {
  return STATUS_SERVIS[STATUS_SERVIS.indexOf(status) + 1] ?? null
}

export function statusSebelumnya(status: StatusServis): StatusServis | null {
  const i = STATUS_SERVIS.indexOf(status)
  return i > 0 ? STATUS_SERVIS[i - 1] : null
}

/** Servis aktif = belum diambil. Servis yang sudah diambil terkunci (read-only). */
export function isAktif(status: StatusServis): boolean {
  return status !== 'Sudah Diambil'
}

/** Langkah berdampak besar (tanggal selesai / servis keluar dari daftar aktif) wajib dikonfirmasi. */
export function perluKonfirmasi(tujuan: StatusServis): boolean {
  return tujuan === 'Selesai Dikerjakan' || tujuan === 'Sudah Diambil'
}

/** `Sudah Diambil` bersifat final sehingga tidak ada tombol "Batalkan". */
export function bisaDibatalkan(tujuan: StatusServis): boolean {
  return tujuan !== 'Sudah Diambil'
}

export const warnaStatus: Record<StatusServis, string> = {
  'Menunggu Antrian': 'bg-slate-100 text-slate-700 ring-slate-300',
  Diperiksa: 'bg-amber-50 text-amber-800 ring-amber-300',
  Dikerjakan: 'bg-blue-50 text-blue-800 ring-blue-300',
  'Selesai Dikerjakan': 'bg-green-50 text-green-800 ring-green-300',
  'Sudah Diambil': 'bg-slate-200 text-slate-600 ring-slate-300',
}
