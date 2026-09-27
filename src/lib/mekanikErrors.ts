// Memetakan error database/jaringan menjadi pesan Bahasa Indonesia (pola sama dengan servisErrors.ts).

export type KodeMekanikError = 'DATA_TIDAK_VALID' | 'MEKANIK_MASIH_BERTUGAS' | 'JARINGAN' | 'UMUM'

export type PesanMekanik = {
  kode: KodeMekanikError
  pesan: string
}

export type Hasil<T> = { data: T; error: null } | { data: null; error: PesanMekanik }

type ErrorSupabase = {
  code?: string
  message?: string
}

export const MSG_JARINGAN = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.'
export const MSG_UMUM = 'Terjadi kesalahan. Coba lagi.'

export function pesanNamaKosong(): PesanMekanik {
  return { kode: 'DATA_TIDAK_VALID', pesan: 'Nama mekanik tidak boleh kosong.' }
}

export function mapMekanikError(error: ErrorSupabase): PesanMekanik {
  const message = error.message ?? ''

  // Pelanggaran check constraint mekanik.nama (lihat 0001_init_schema.sql).
  if (error.code === '23514') return pesanNamaKosong()

  if (message === 'MEKANIK_MASIH_BERTUGAS') {
    return {
      kode: 'MEKANIK_MASIH_BERTUGAS',
      pesan: 'Mekanik ini masih menangani kendaraan aktif. Pindahkan penugasannya dulu.',
    }
  }

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return { kode: 'JARINGAN', pesan: MSG_JARINGAN }
  }

  return { kode: 'UMUM', pesan: MSG_UMUM }
}
