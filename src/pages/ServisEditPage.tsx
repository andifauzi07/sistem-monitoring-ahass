import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ServisForm } from '../components/ServisForm'
import { ambilServis, ubahServis } from '../lib/servis'
import type { ServisInput, ServisPayload } from '../lib/servisValidation'
import { isAktif } from '../lib/statusServis'
import { useMuat } from '../lib/useMuat'

export function ServisEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const loader = useCallback(() => ambilServis(id), [id])
  const { data: servis, error, loading } = useMuat(loader)

  async function simpan(value: ServisPayload) {
    const hasil = await ubahServis(id, value)
    if (hasil.error) return hasil.error
    navigate(`/servis/${id}`, { replace: true })
    return null
  }

  if (loading) return <p className="py-10 text-center text-slate-500">Memuat…</p>

  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error.pesan}
      </p>
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

  if (!isAktif(servis.status)) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p className="text-slate-700">Servis ini sudah diambil dan tidak dapat diubah.</p>
        <Link to={`/servis/${servis.id}`} className="font-semibold text-brand-700 underline">
          Kembali ke detail servis
        </Link>
      </div>
    )
  }

  const awal: ServisInput = {
    nomor_polisi: servis.nomor_polisi,
    nama_pembawa: servis.nama_pembawa,
    nomor_wa: servis.nomor_wa,
    jenis_motor: servis.jenis_motor,
    kilometer: String(servis.kilometer),
    masalah: servis.masalah,
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Edit Servis</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ServisForm
          awal={awal}
          labelSimpan="Simpan Perubahan"
          onSubmit={simpan}
          onBatal={() => navigate(`/servis/${id}`)}
        />
      </div>
    </div>
  )
}
