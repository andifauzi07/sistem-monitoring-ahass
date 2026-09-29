import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { StatusActionButton } from '../components/StatusActionButton'
import { StatusBadge } from '../components/StatusBadge'
import { UndoToast } from '../components/UndoToast'
import { formatTanggalWaktu } from '../lib/format'
import { formatNopol, normalizeNopol } from '../lib/nopol'
import { ambilServisAktif } from '../lib/servis'
import { useMuat } from '../lib/useMuat'
import { useSinyalRealtime } from '../lib/useSinyalRealtime'
import { useStatusFeedback } from '../lib/useStatusFeedback'
import { STATUS_SERVIS, type StatusServis } from '../types/database'

type Filter = StatusServis | 'semua'

const STATUS_AKTIF = STATUS_SERVIS.filter((s) => s !== 'Sudah Diambil')

function pasangDaftarServis(channel: RealtimeChannel, picu: () => void) {
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'layanan_service' }, picu)
}

export function ServisListPage() {
  const loader = useCallback(() => ambilServisAktif(), [])
  const { data, error, loading, muatUlang } = useMuat(loader)
  const { toast, tutupToast, galat, handleBerhasil, handleGagal } = useStatusFeedback(muatUlang)

  useSinyalRealtime({ nama: 'sa-servis-list', pasang: pasangDaftarServis }, muatUlang)

  // Pencarian & filter adalah state lokal terpisah dari data, jadi tetap saat data dimuat ulang.
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('semua')

  const tampil = useMemo(() => {
    const q = normalizeNopol(query)
    return (data ?? []).filter(
      (s) => (filter === 'semua' || s.status === filter) && (!q || s.nomor_polisi.includes(q)),
    )
  }, [data, query, filter])

  const hitung = (status: StatusServis) => (data ?? []).filter((s) => s.status === status).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Servis Aktif{data ? <span className="text-slate-400"> ({data.length})</span> : null}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={muatUlang}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Muat ulang
          </button>
          <Link
            to="/servis/baru"
            className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Servis Baru
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="cari-nopol" className="sr-only">
          Cari nomor polisi
        </label>
        <input
          id="cari-nopol"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nomor polisi, mis. DC 1234"
          autoCapitalize="characters"
          autoComplete="off"
          className="block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base uppercase shadow-sm placeholder:normal-case focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status">
          {(['semua', ...STATUS_AKTIF] as Filter[]).map((f) => {
            const aktif = filter === f
            return (
              <button
                key={f}
                type="button"
                aria-pressed={aktif}
                onClick={() => setFilter(f)}
                className={`min-h-11 rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors ${
                  aktif
                    ? 'bg-slate-800 text-white ring-slate-800'
                    : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {f === 'semua' ? 'Semua' : f}
                {data && f !== 'semua' ? ` (${hitung(f)})` : ''}
              </button>
            )
          })}
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {galat.pesan}
        </p>
      )}

      {loading && <p className="py-10 text-center text-slate-500">Memuat…</p>}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error.pesan}{' '}
          <button type="button" onClick={muatUlang} className="font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">Belum ada servis aktif.</p>
          <Link
            to="/servis/baru"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Tambah servis pertama
          </Link>
        </div>
      )}

      {data && data.length > 0 && tampil.length === 0 && (
        <p className="py-8 text-center text-slate-500">Tidak ada servis yang cocok dengan pencarian atau filter.</p>
      )}

      {tampil.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          {tampil.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-6"
            >
              <div className="min-w-0 flex-1 space-y-1 lg:grid lg:flex-none lg:basis-2/3 lg:grid-cols-[9rem_1fr_1fr] lg:items-center lg:gap-4 lg:space-y-0">
                <Link
                  to={`/servis/${s.id}`}
                  className="block text-lg font-bold tracking-wide text-slate-900 hover:text-brand-700 hover:underline"
                >
                  {formatNopol(s.nomor_polisi)}
                </Link>
                <p className="truncate text-sm text-slate-700">
                  {s.jenis_motor}
                  <span className="text-slate-400"> · </span>
                  {s.nama_pembawa}
                </p>
                <p className="text-xs text-slate-500">Masuk {formatTanggalWaktu(s.tanggal_masuk)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 lg:flex-1 lg:justify-end">
                <StatusBadge status={s.status} />
                <StatusActionButton servis={s} onBerhasil={(dari, ke, arah) => handleBerhasil(s, dari, ke, arah)} onGagal={handleGagal} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <UndoToast toast={toast} onTutup={tutupToast} />
    </div>
  )
}
