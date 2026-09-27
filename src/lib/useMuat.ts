import { useCallback, useEffect, useState } from 'react'

type HasilGenerik<T, E> = { data: T; error: null } | { data: null; error: E }

type Keadaan<T, E> = { loader: () => Promise<HasilGenerik<T, E>>; hasil: HasilGenerik<T, E> }

/**
 * Memuat data async. `loader` harus stabil (useCallback); saat identitasnya berubah
 * (mis. id di URL berganti) data dianggap sedang dimuat. `muatUlang()` mengambil ulang
 * tanpa mengosongkan data lama, sehingga daftar tidak berkedip.
 */
export function useMuat<T, E>(loader: () => Promise<HasilGenerik<T, E>>) {
  const [tick, setTick] = useState(0)
  const [keadaan, setKeadaan] = useState<Keadaan<T, E> | null>(null)

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
    error: sesuai ? keadaan.hasil.error : null,
    muatUlang,
  }
}
