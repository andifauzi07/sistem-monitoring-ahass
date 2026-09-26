// Memetakan error database/jaringan menjadi pesan Bahasa Indonesia (design D2).
// Kode mentah tidak pernah ditampilkan ke pengguna.

export type KodeServisError =
  | 'SERVIS_AKTIF_ADA'
  | 'TRANSISI_STATUS_TIDAK_VALID'
  | 'SERVIS_TERKUNCI'
  | 'HAPUS_TIDAK_DIIZINKAN'
  | 'DATA_TIDAK_VALID'
  | 'SERVIS_TIDAK_DITEMUKAN'
  | 'STATUS_SUDAH_BERUBAH'
  | 'MIGRASI_BELUM_DIJALANKAN'
  | 'JARINGAN'
  | 'UMUM'

export type PesanServis = {
  kode: KodeServisError
  pesan: string
  /** Id servis aktif yang bentrok (hanya untuk `SERVIS_AKTIF_ADA`). */
  servisAktifId: string | null
}

export type Hasil<T> = { data: T; error: null } | { data: null; error: PesanServis }

type ErrorSupabase = {
  code?: string
  message?: string
  details?: string | null
}

export const MSG_JARINGAN = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.'
export const MSG_UMUM = 'Terjadi kesalahan. Coba lagi.'

const PESAN_FIELD: Record<string, string> = {
  nomor_polisi: 'Nomor polisi tidak valid.',
  nama_pembawa: 'Nama pembawa tidak valid.',
  nomor_wa: 'Nomor WA tidak valid.',
  jenis_motor: 'Jenis motor tidak valid.',
  kilometer: 'Kilometer tidak valid.',
  masalah: 'Masalah tidak valid.',
}

function buat(kode: KodeServisError, pesan: string, servisAktifId: string | null = null): PesanServis {
  return { kode, pesan, servisAktifId }
}

export function pesanStatusSudahBerubah(): PesanServis {
  return buat('STATUS_SUDAH_BERUBAH', 'Status servis sudah berubah di perangkat lain. Data dimuat ulang.')
}

export function mapServisError(error: ErrorSupabase): PesanServis {
  const message = error.message ?? ''
  const details = error.details?.trim() || null

  switch (message) {
    case 'SERVIS_AKTIF_ADA':
      return buat('SERVIS_AKTIF_ADA', 'Kendaraan ini masih punya servis aktif.', details)
    case 'TRANSISI_STATUS_TIDAK_VALID':
      return buat('TRANSISI_STATUS_TIDAK_VALID', 'Perubahan status tidak valid.')
    case 'SERVIS_TERKUNCI':
      return buat('SERVIS_TERKUNCI', 'Servis sudah diambil dan tidak dapat diubah.')
    case 'HAPUS_TIDAK_DIIZINKAN':
      return buat(
        'HAPUS_TIDAK_DIIZINKAN',
        'Hanya servis berstatus Menunggu Antrian yang dapat dihapus.',
      )
    case 'DATA_TIDAK_VALID':
      return buat('DATA_TIDAK_VALID', (details && PESAN_FIELD[details]) || 'Data yang diisi tidak valid.')
    case 'SERVIS_TIDAK_DITEMUKAN':
      return buat('SERVIS_TIDAK_DITEMUKAN', 'Servis tidak ditemukan.')
  }

  // Balapan dengan tablet lain: index "satu servis aktif per kendaraan" terlanggar.
  if (error.code === '23505' && message.includes('layanan_service_satu_aktif_per_pelanggan')) {
    return buat('SERVIS_AKTIF_ADA', 'Kendaraan ini masih punya servis aktif.')
  }

  // Id pada URL bukan uuid yang valid.
  if (error.code === '22P02') return buat('SERVIS_TIDAK_DITEMUKAN', 'Servis tidak ditemukan.')

  // Fungsi RPC belum ada: migrasi 0002 belum dijalankan.
  if (error.code === 'PGRST202' || error.code === '42883') {
    return buat(
      'MIGRASI_BELUM_DIJALANKAN',
      'Database belum diperbarui. Jalankan migrasi 0002_kelola_service.sql di Supabase.',
    )
  }

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return buat('JARINGAN', MSG_JARINGAN)
  }

  return buat('UMUM', MSG_UMUM)
}
