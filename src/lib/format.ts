// Bengkel berada di Mamuju (WITA), sehingga semua waktu ditampilkan pada zona ini.
const ZONA_WAKTU = 'Asia/Makassar'

const formatTanggalWaktuId = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: ZONA_WAKTU,
})

const formatAngkaId = new Intl.NumberFormat('id-ID')

export function formatTanggalWaktu(iso: string): string {
  return `${formatTanggalWaktuId.format(new Date(iso))} WITA`
}

export function formatKilometer(km: number): string {
  return `${formatAngkaId.format(km)} km`
}
