import { useCallback, useEffect, useRef, useState } from 'react'

export const DURASI_TOAST_MS = 5000

export type ToastState = {
  id: number
  pesan: string
  /** Bila ada, toast menampilkan tombol "Batalkan". */
  onBatal?: () => void
}

export function useUndoToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const urutan = useRef(0)

  const tampilkan = useCallback((pesan: string, onBatal?: () => void) => {
    urutan.current += 1
    setToast({ id: urutan.current, pesan, onBatal })
  }, [])

  const tutup = useCallback(() => setToast(null), [])

  // Toast baru selalu mengganti yang lama dan mengulang timer-nya.
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), DURASI_TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  return { toast, tampilkan, tutup }
}
