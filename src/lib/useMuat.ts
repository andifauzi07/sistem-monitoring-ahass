import { useCallback, useEffect, useState } from 'react'
import type { Hasil, PesanServis } from './servisErrors'

type Keadaan<T> = { loader: () => Promise<Hasil<T>>; hasil: Hasil<T> }

/**
 * Memuat data async. `loader` harus stabil (useCallback); saat identitasnya berubah
 * (mis. id di URL berganti) data dianggap sedang dimuat. `muatUlang()` mengambil ulang
 * tanpa mengosongkan data lama, sehingga daftar tidak berkedip.
 */
export function useMuat<T>(loader: () => Promise<Hasil<T>>) {
  const [tick, setTick] = useState(0)
  const [keadaan, setKeadaan] = useState<Keadaan<T> | null>(null)

  useEffect(() => {
    let dibatalkan = false
    void loader().then((hasil) => {
      if (!dibatalkan) setKeadaan({ loader, hasil })
    })
    return () => {
      dibatalkan = true
    }
  }, [loader, tick])

  const muatUlang = useCallback(() => setTick((n) => n + 1), [])

  const sesuai = keadaan !== null && keadaan.loader === loader
  return {
    loading: !sesuai,
    data: sesuai ? keadaan.hasil.data : null,
    error: (sesuai ? keadaan.hasil.error : null) as PesanServis | null,
    muatUlang,
  }
}
