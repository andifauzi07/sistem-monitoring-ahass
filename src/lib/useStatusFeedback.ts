import { useCallback, useState } from 'react'
import { formatNopol } from './nopol'
import { bisaDibatalkan } from './statusServis'
import { ubahStatus } from './servis'
import type { PesanServis } from './servisErrors'
import { useUndoToast } from './useUndoToast'
import type { StatusServis } from '../types/database'

export type ServisRingkas = { id: string; nomor_polisi: string }

/**
 * Umpan balik setelah ubah status (daftar & detail memakai logika yang sama):
 * toast "Batalkan" untuk langkah maju, pesan error, dan muat ulang data.
 */
export function useStatusFeedback(muatUlang: () => void) {
  const { toast, tampilkan, tutup } = useUndoToast()
  const [galat, setGalat] = useState<PesanServis | null>(null)

  const handleGagal = useCallback(
    (error: PesanServis) => {
      setGalat(error)
      // Status di layar sudah basi (mis. diubah di tablet lain): ambil data terbaru.
      muatUlang()
    },
    [muatUlang],
  )

  const handleBerhasil = useCallback(
    (servis: ServisRingkas, dari: StatusServis, ke: StatusServis, arah: 'maju' | 'mundur') => {
      setGalat(null)
      muatUlang()
      const nopol = formatNopol(servis.nomor_polisi)

      if (arah === 'maju' && bisaDibatalkan(ke)) {
        tampilkan(`${nopol} → ${ke}`, () => {
          tutup()
          void ubahStatus(servis.id, ke, dari).then((hasil) => {
            if (hasil.error) handleGagal(hasil.error)
            else muatUlang()
          })
        })
      } else if (arah === 'maju') {
        tampilkan(`${nopol} sudah diambil`)
      } else {
        tampilkan(`${nopol} dikembalikan ke ${ke}`)
      }
    },
    [handleGagal, muatUlang, tampilkan, tutup],
  )

  return { toast, tutupToast: tutup, galat, setGalat, handleBerhasil, handleGagal }
}
