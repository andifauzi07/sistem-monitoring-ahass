import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'

type State =
  | { kind: 'loading' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string }

const styles = {
  loading: 'bg-slate-100 text-slate-600 ring-slate-200',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  error: 'bg-brand-50 text-brand-700 ring-brand-100',
} as const

const dots = {
  loading: 'bg-slate-400 animate-pulse',
  ok: 'bg-emerald-500',
  error: 'bg-brand-600',
} as const

/**
 * Indikator koneksi Supabase. Memanggil RPC publik `cek_status` dengan nopol uji:
 * sukses berarti URL/key valid dan migrasi sudah terpasang.
 */
export function ConnectionStatus() {
  const [state, setState] = useState<State>(
    isSupabaseConfigured
      ? { kind: 'loading' }
      : { kind: 'error', message: supabaseConfigError ?? 'Konfigurasi tidak lengkap.' },
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false

    supabase
      .rpc('cek_status', { nopol: 'TEST' })
      .then(({ error }) => {
        if (cancelled) return
        setState(error ? { kind: 'error', message: error.message } : { kind: 'ok' })
      }, (err: unknown) => {
        if (cancelled) return
        setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const label =
    state.kind === 'loading'
      ? 'Menghubungkan ke database…'
      : state.kind === 'ok'
        ? 'Terhubung ke database'
        : 'Gagal terhubung ke database'

  return (
    <div
      role="status"
      className={`inline-flex max-w-full items-start gap-2 rounded-lg px-3 py-2 text-xs ring-1 ${styles[state.kind]}`}
    >
      <span className={`mt-1 size-2 shrink-0 rounded-full ${dots[state.kind]}`} aria-hidden />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        {state.kind === 'error' && (
          <span className="block break-words opacity-80">{state.message}</span>
        )}
      </span>
    </div>
  )
}
