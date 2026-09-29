import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

const JEDA_DEBOUNCE_MS = 300

/**
 * `supabase.channel(nama)` mengembalikan channel lama bertopik sama selama proses leave
 * (async) belum selesai; channel itu sudah pernah subscribe sehingga tidak bisa dipasangi
 * listener baru. Simpan janji pelepasan per nama agar channel berikutnya menunggu dulu
 * (mis. remount StrictMode, atau nopol A → B → A dengan cepat).
 */
const pelepasan = new Map<string, Promise<unknown>>()

type OpsiSinyal = {
  /** Nama channel, unik per halaman (mis. `sa-dashboard`, `servis:<NOPOL>`). */
  nama: string
  /**
   * Mendaftarkan listener pada channel; setiap listener memanggil `picu()` untuk menandai
   * perlunya muat ulang. Payload event tidak dibaca (design D1). Harus stabil (useCallback).
   */
  pasang: (channel: RealtimeChannel, picu: () => void) => void
  /** false → tidak ada channel maupun listener tab aktif. */
  aktif?: boolean
}

/**
 * Event realtime sebagai sinyal: setiap event (didebounce ±300 ms), setiap kali tersambung
 * kembali setelah putus, dan setiap tab kembali terlihat memanggil `muatUlang()` (design D4).
 * Sambungan pertama tidak memicu muat ulang karena pemuatan awal sudah ditangani `useMuat`.
 * Channel selalu publik (`private: false`); halaman SA tetap dibatasi RLS untuk postgres_changes.
 */
export function useSinyalRealtime(
  { nama, pasang, aktif = true }: OpsiSinyal,
  muatUlang: () => void,
): { terhubung: boolean } {
  // Dikunci per nama channel agar pergantian channel otomatis dianggap belum terhubung.
  const [status, setStatus] = useState<{ nama: string; terhubung: boolean } | null>(null)

  useEffect(() => {
    if (!aktif) return

    let dilepas = false
    let channel: RealtimeChannel | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let pernahTerhubung = false
    let sempatPutus = false

    function picu() {
      clearTimeout(timer)
      timer = setTimeout(muatUlang, JEDA_DEBOUNCE_MS)
    }

    void (pelepasan.get(nama) ?? Promise.resolve()).then(() => {
      if (dilepas) return
      channel = supabase.channel(nama, { config: { private: false } })
      pasang(channel, picu)
      // realtime-js mengirim ulang join push (beserta callback-nya) saat rejoin otomatis,
      // sehingga callback ini menerima SUBSCRIBED lagi setelah CHANNEL_ERROR/TIMED_OUT/CLOSED.
      channel.subscribe((s) => {
        if (dilepas) return
        if (s === 'SUBSCRIBED') {
          if (pernahTerhubung && sempatPutus) picu()
          pernahTerhubung = true
          sempatPutus = false
          setStatus({ nama, terhubung: true })
        } else {
          sempatPutus = true
          setStatus({ nama, terhubung: false })
        }
      })
    })

    function onVisible() {
      if (document.visibilityState === 'visible') muatUlang()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      dilepas = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) {
        const janji: Promise<unknown> = supabase.removeChannel(channel).finally(() => {
          if (pelepasan.get(nama) === janji) pelepasan.delete(nama)
        })
        pelepasan.set(nama, janji)
      }
    }
  }, [nama, pasang, aktif, muatUlang])

  return { terhubung: aktif && status?.nama === nama && status.terhubung }
}
