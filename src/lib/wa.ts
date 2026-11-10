import { formatNopol } from './nopol'

export type DataPesanServis = {
  nama_pembawa: string
  nomor_polisi: string
  jenis_motor: string
  masalah: string
  nama_mekanik?: string | null
  tanggal_selesai?: string | null
  url_monitoring: string
}

/**
 * Normalisasi nomor telepon ke format internasional tanpa tanda tambah (628xxxxxxxxxx).
 * Karakter non-digit dibuang.
 * Awalan '0' diubah menjadi '62' (mis. 0812 -> 62812).
 * Awalan '+62' atau '62' dipertahankan menjadi '62...'.
 */
export function normalisasiNomorWa(input: string): string {
  if (!input) return ''
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  }
  return digits
}

/**
 * Memeriksa apakah nomor ternormalisasi memiliki panjang yang valid (10-15 digit)
 * dan diawali kode negara 62.
 */
export function isValidNomorWa(nomor: string): boolean {
  return /^62[0-9]{8,13}$/.test(nomor)
}

/**
 * Menyusun pesan notifikasi WhatsApp resmi servis selesai AHASS Kota Mamuju.
 */
export function susunTemplatePesan(data: DataPesanServis): string {
  const nopol = formatNopol(data.nomor_polisi)
  const mekanik = data.nama_mekanik?.trim() ? data.nama_mekanik.trim() : '-'
  const waktu = data.tanggal_selesai?.trim() ? data.tanggal_selesai.trim() : '-'

  return `AHASS KOTA MAMUJU

Yth. Bpk/Ibu ${data.nama_pembawa},

Sepeda motor Anda Honda ${data.jenis_motor} (No. Pol: ${nopol}) telah SELESAI DIKERJAKAN di bengkel kami.

📋 Rincian Servis:
• Keluhan: ${data.masalah}
• Mekanik: ${mekanik}
• Waktu Selesai: ${waktu}

Kendaraan Anda sudah siap untuk diambil. Silakan menuju bagian kasir/front desk untuk penyelesaian administrasi dan pengambilan unit kendaraan.

Tautan Monitoring Publik:
${data.url_monitoring}

Terima kasih atas kepercayaan Anda merawat sepeda motor Honda di AHASS Kota Mamuju.`
}
