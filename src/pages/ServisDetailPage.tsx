import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusActionButton } from '../components/StatusActionButton'
import { StatusBadge } from '../components/StatusBadge'
import { UndoToast } from '../components/UndoToast'
import { formatKilometer, formatTanggalWaktu } from '../lib/format'
import { formatNopol } from '../lib/nopol'
import { ambilServis, hapusServis } from '../lib/servis'
import type { PesanServis } from '../lib/servisErrors'
import { isAktif, statusSebelumnya } from '../lib/statusServis'
import { useMuat } from '../lib/useMuat'
import { useStatusFeedback } from '../lib/useStatusFeedback'

function Baris({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-slate-900">{children}</dd>
    </div>
  )
}

export function ServisDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const loader = useCallback(() => ambilServis(id), [id])
  const { data: servis, error, loading, muatUlang } = useMuat(loader)
  const { toast, tutupToast, galat, setGalat, handleBerhasil, handleGagal } = useStatusFeedback(muatUlang)

  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)
  const [menghapus, setMenghapus] = useState(false)
  const [galatHapus, setGalatHapus] = useState<PesanServis | null>(null)

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') muatUlang()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [muatUlang])

  async function hapus() {
    if (menghapus) return
    setMenghapus(true)
    const hasil = await hapusServis(id)
    setMenghapus(false)
    setKonfirmasiHapus(false)
    if (hasil.error) {
      setGalatHapus(hasil.error)
      muatUlang()
      return
    }
    navigate('/servis', { replace: true })
  }

  if (loading) return <p className="py-10 text-center text-slate-500">Memuat…</p>

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error.pesan}{' '}
        <Link to="/servis" className="font-semibold underline">
          Kembali ke daftar servis
        </Link>
      </div>
    )
  }

  if (!servis) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-slate-700">Servis tidak ditemukan.</p>
        <Link to="/servis" className="font-semibold text-brand-700 underline">
          Kembali ke daftar servis
        </Link>
      </div>
    )
  }

  const aktif = isAktif(servis.status)
  const riwayat = [...servis.riwayat_status].sort(
    (a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime(),
  )
  const pesanGalat = galat ?? galatHapus

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/servis" className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 hover:underline">
        ← Daftar servis
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-wide text-slate-900">{formatNopol(servis.nomor_polisi)}</h1>
          <StatusBadge status={servis.status} />
        </div>
        {aktif && (
          <StatusActionButton
            servis={servis}
            onBerhasil={(dari, ke, arah) => {
              setGalatHapus(null)
              handleBerhasil(servis, dari, ke, arah)
            }}
            onGagal={handleGagal}
          />
        )}
      </div>

      {!aktif && (
        <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">
          Servis ini sudah diambil dan terkunci (hanya dapat dilihat).
        </p>
      )}

      {pesanGalat && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {pesanGalat.pesan}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white px-5 shadow-sm">
        <dl className="divide-y divide-slate-100">
          <Baris label="Jenis motor">{servis.jenis_motor}</Baris>
          <Baris label="Kilometer">{formatKilometer(servis.kilometer)}</Baris>
          <Baris label="Nama pembawa">{servis.nama_pembawa}</Baris>
          <Baris label="Nomor WhatsApp">{servis.nomor_wa}</Baris>
          <Baris label="Masalah">{servis.masalah}</Baris>
          <Baris label="Tanggal masuk">{formatTanggalWaktu(servis.tanggal_masuk)}</Baris>
          {servis.tanggal_selesai && (
            <Baris label="Tanggal selesai">{formatTanggalWaktu(servis.tanggal_selesai)}</Baris>
          )}
        </dl>
      </section>

      {aktif && (
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/servis/${servis.id}/edit`}
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          {statusSebelumnya(servis.status) && (
            <StatusActionButton
              servis={servis}
              arah="mundur"
              onBerhasil={(dari, ke, arah) => {
                setGalatHapus(null)
                handleBerhasil(servis, dari, ke, arah)
              }}
              onGagal={handleGagal}
            />
          )}
          {servis.status === 'Menunggu Antrian' && (
            <button
              type="button"
              onClick={() => {
                setGalat(null)
                setGalatHapus(null)
                setKonfirmasiHapus(true)
              }}
              className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Hapus
            </button>
          )}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Riwayat status</h2>
        <ol className="space-y-4 border-l-2 border-slate-200 pl-5">
          {riwayat.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[1.6rem] top-1.5 size-3 rounded-full bg-brand-600 ring-4 ring-white" />
              <p className="font-medium text-slate-900">{r.status_baru}</p>
              <p className="text-xs text-slate-500">
                {formatTanggalWaktu(r.waktu)}
                {r.service_advisors?.nama ? ` · oleh ${r.service_advisors.nama}` : ''}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          Waktu adalah saat Service Advisor mengubah status, bukan waktu kejadian di bengkel.
        </p>
      </section>

      <ConfirmDialog
        open={konfirmasiHapus}
        judul="Hapus servis ini?"
        labelKonfirmasi="Ya, hapus"
        bahaya
        memproses={menghapus}
        onKonfirmasi={() => void hapus()}
        onBatal={() => setKonfirmasiHapus(false)}
      >
        Servis untuk <span className="font-semibold">{formatNopol(servis.nomor_polisi)}</span> akan dihapus
        permanen beserta riwayatnya.
      </ConfirmDialog>

      <UndoToast toast={toast} onTutup={tutupToast} />
    </div>
  )
}
