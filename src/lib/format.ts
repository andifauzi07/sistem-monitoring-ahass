// Bengkel berada di Mamuju (WITA), sehingga semua waktu ditampilkan pada zona ini.
const ZONA_WAKTU = 'Asia/Makassar'

const formatTanggalWaktuId = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: ZONA_WAKTU,
})

const formatJamId = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA_WAKTU,
})

const formatAngkaId = new Intl.NumberFormat('id-ID')

export function formatTanggalWaktu(iso: string): string {
  return `${formatTanggalWaktuId.format(new Date(iso))} WITA`
}

/** Jam saja, mis. `14:05 WITA` (locale id-ID memakai titik, diganti titik dua). */
export function formatJam(waktu: Date): string {
  return `${formatJamId.format(waktu).replace('.', ':')} WITA`
}

export function formatKilometer(km: number): string {
  return `${formatAngkaId.format(km)} km`
}
