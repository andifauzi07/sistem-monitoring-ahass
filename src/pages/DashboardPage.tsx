import { useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { StatusBadge } from '../components/StatusBadge'
import { ambilRingkasanMekanik, type RingkasanMekanik } from '../lib/dashboard'
import { ambilServisAktif, type Servis } from '../lib/servis'
import type { Hasil } from '../lib/servisErrors'
import { useMuat } from '../lib/useMuat'
import { useSinyalRealtime } from '../lib/useSinyalRealtime'

// Mekanik ikut didengarkan untuk kartu "Mekanik yang Hadir".
function pasangDashboard(channel: RealtimeChannel, picu: () => void) {
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'layanan_service' }, picu)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mekanik' }, picu)
}

type DataDashboard = { servisAktif: Servis[]; mekanik: RingkasanMekanik }

async function muatDashboard(): Promise<Hasil<DataDashboard>> {
  const [servisHasil, mekanikHasil] = await Promise.all([ambilServisAktif(), ambilRingkasanMekanik()])
  if (servisHasil.error) return { data: null, error: servisHasil.error }
  if (mekanikHasil.error) return { data: null, error: mekanikHasil.error }
  return { data: { servisAktif: servisHasil.data, mekanik: mekanikHasil.data }, error: null }
}

export function DashboardPage() {
  const loader = useCallback(() => muatDashboard(), [])
  const { data, error, loading, muatUlang } = useMuat(loader)
  useSinyalRealtime({ nama: 'sa-dashboard', pasang: pasangDashboard }, muatUlang)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {loading && <p className="py-10 text-center text-slate-500">Memuat…</p>}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error.pesan}{' '}
          <button type="button" onClick={muatUlang} className="font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Unit Entry di Pit</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.servisAktif.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Mekanik yang Hadir</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {data.mekanik.hadir} dari {data.mekanik.total}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Aktifitas Hari Ini</h2>

            {data.servisAktif.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-slate-600">Belum ada servis aktif saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Mekanik</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipe Motor</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Keterangan</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.servisAktif.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-slate-700">{s.mekanik?.nama ?? '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{s.jenis_motor}</td>
                        <td className="px-4 py-3 text-slate-700">{s.masalah}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
