import { useCallback, useState, type FormEvent } from 'react'
import { formatTanggalWaktu } from '../lib/format'
import { formatNopol } from '../lib/nopol'
import { ambilRiwayat, type FilterRiwayat } from '../lib/riwayat'
import { useMuat } from '../lib/useMuat'

const FILTER_KOSONG: FilterRiwayat = {}

export function RiwayatPage() {
  const [form, setForm] = useState<FilterRiwayat>(FILTER_KOSONG)
  const [filter, setFilter] = useState<FilterRiwayat>(FILTER_KOSONG)

  const loader = useCallback(() => ambilRiwayat(filter), [filter])
  const { data, error, loading, muatUlang } = useMuat(loader)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFilter(form)
  }

  function handleReset() {
    setForm(FILTER_KOSONG)
    setFilter(FILTER_KOSONG)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Riwayat Servis</h1>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:items-end"
      >
        <div>
          <label htmlFor="dari-tanggal" className="block text-sm font-medium text-slate-700">
            Dari tanggal
          </label>
          <input
            id="dari-tanggal"
            type="date"
            value={form.dariTanggal ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, dariTanggal: e.target.value || undefined }))}
            className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <label htmlFor="sampai-tanggal" className="block text-sm font-medium text-slate-700">
            Sampai tanggal
          </label>
          <input
            id="sampai-tanggal"
            type="date"
            value={form.sampaiTanggal ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, sampaiTanggal: e.target.value || undefined }))}
            className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-base focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div>
          <label htmlFor="cari-nopol" className="block text-sm font-medium text-slate-700">
            Nomor polisi
          </label>
          <input
            id="cari-nopol"
            type="search"
            value={form.nomorPolisi ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, nomorPolisi: e.target.value || undefined }))}
            placeholder="mis. DC 1234"
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-base uppercase shadow-sm placeholder:normal-case focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Cari
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </form>

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
          <p className="text-slate-600">Belum ada riwayat servis yang sesuai.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nomor Polisi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nama Pembawa</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipe Motor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tanggal Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatNopol(r.nomor_polisi)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.nama_pembawa}</td>
                  <td className="px-4 py-3 text-slate-700">{r.jenis_motor}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.tanggal_selesai ? formatTanggalWaktu(r.tanggal_selesai) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
