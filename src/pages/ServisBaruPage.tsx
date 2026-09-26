import { useNavigate } from 'react-router'
import { ServisForm } from '../components/ServisForm'
import { cariKendaraan, daftarServis } from '../lib/servis'
import { SERVIS_INPUT_KOSONG, type ServisPayload } from '../lib/servisValidation'

export function ServisBaruPage() {
  const navigate = useNavigate()

  async function simpan(value: ServisPayload) {
    const hasil = await daftarServis(value)
    if (hasil.error) return hasil.error
    navigate(`/servis/${hasil.data}`, { replace: true })
    return null
  }

  async function cariNopol(nopol: string) {
    const hasil = await cariKendaraan(nopol)
    // Gagal mencari tidak menghalangi input manual.
    return hasil.error ? null : hasil.data
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Servis Baru</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ServisForm
          awal={SERVIS_INPUT_KOSONG}
          labelSimpan="Simpan Servis"
          onSubmit={simpan}
          onCariNopol={cariNopol}
          onBatal={() => navigate('/servis')}
        />
      </div>
    </div>
  )
}
