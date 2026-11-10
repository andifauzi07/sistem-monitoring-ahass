import { supabase } from './supabase'
import type { Tables } from '../types/database'
import type { Hasil, PesanServis } from './servisErrors'

export type RiwayatNotifikasi = Tables<'riwayat_notifikasi'>

export type HasilKirimWa = {
  success: boolean
  status: 'berhasil' | 'gagal'
  nomor_tujuan?: string
  id_pesan_gateway?: string | null
  error?: string
  respons?: string
}

function gagal<T>(pesan: string, kode: PesanServis['kode'] = 'UMUM'): Hasil<T> {
  return {
    data: null,
    error: {
      kode,
      pesan,
      servisAktifId: null,
    },
  }
}

function ok<T>(data: T): Hasil<T> {
  return { data, error: null }
}

/**
 * Memanggil Supabase Edge Function `kirim-wa` untuk mengirimkan notifikasi WhatsApp ke pelanggan.
 */
export async function kirimNotifikasiWa(layananServiceId: string): Promise<Hasil<HasilKirimWa>> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return gagal('Sesi login Service Advisor belum aktif atau telah berakhir. Silakan login kembali.')
    }

    const { data, error } = await supabase.functions.invoke<HasilKirimWa>('kirim-wa', {
      body: { layanan_service_id: layananServiceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      return gagal(error.message || 'Gagal memanggil fungsi pengiriman WhatsApp.', 'JARINGAN')
    }

    if (!data) {
      return gagal('Tidak ada data respons yang diterima dari server notifikasi.')
    }

    return ok(data)
  } catch (err: unknown) {
    const error = err as Error
    return gagal(error.message || 'Terjadi kesalahan saat memproses pengiriman WhatsApp.', 'UMUM')
  }
}

/**
 * Mengambil seluruh riwayat notifikasi untuk layanan servis tertentu, diurutkan dari yang terbaru.
 */
export async function ambilRiwayatNotifikasi(
  layananServiceId: string,
): Promise<Hasil<RiwayatNotifikasi[]>> {
  const { data, error } = await supabase
    .from('riwayat_notifikasi')
    .select('*')
    .eq('layanan_service_id', layananServiceId)
    .order('dibuat_pada', { ascending: false })

  if (error) {
    return gagal(error.message || 'Gagal memuat riwayat notifikasi.')
  }

  return ok((data as RiwayatNotifikasi[]) ?? [])
}

/**
 * Mengambil entri riwayat notifikasi WhatsApp paling baru untuk layanan servis tertentu.
 */
export async function ambilNotifikasiTerakhir(
  layananServiceId: string,
): Promise<Hasil<RiwayatNotifikasi | null>> {
  const { data, error } = await supabase
    .from('riwayat_notifikasi')
    .select('*')
    .eq('layanan_service_id', layananServiceId)
    .order('dibuat_pada', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return gagal(error.message || 'Gagal memuat status notifikasi terakhir.')
  }

  return ok(data as RiwayatNotifikasi | null)
}
