import { useState } from 'react'
import { formatNopol } from '../lib/nopol'
import { ubahStatus } from '../lib/servis'
import type { PesanServis } from '../lib/servisErrors'
import { perluKonfirmasi, statusBerikutnya, statusSebelumnya } from '../lib/statusServis'
import type { StatusServis } from '../types/database'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  servis: { id: string; nomor_polisi: string; status: StatusServis; mekanik_id?: string | null }
  /** `maju` = "→ status berikutnya"; `mundur` = "Kembalikan ke status sebelumnya" (selalu dikonfirmasi). */
  arah?: 'maju' | 'mundur'
  className?: string
  onBerhasil: (dari: StatusServis, ke: StatusServis, arah: 'maju' | 'mundur') => void
  onGagal: (error: PesanServis) => void
}

export function StatusActionButton({ servis, arah = 'maju', className = '', onBerhasil, onGagal }: Props) {
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [memproses, setMemproses] = useState(false)

  const tujuan = arah === 'maju' ? statusBerikutnya(servis.status) : statusSebelumnya(servis.status)
  if (!tujuan) return null

  const perlu = arah === 'mundur' || perluKonfirmasi(tujuan)
  const final = arah === 'maju' && tujuan === 'Sudah Diambil'
  const butuhMekanik =
    arah === 'maju' && servis.status === 'Menunggu Antrian' && tujuan === 'Diperiksa' && !servis.mekanik_id

  async function jalankan(ke: StatusServis) {
    if (memproses) return
    setMemproses(true)
    const hasil = await ubahStatus(servis.id, servis.status, ke)
    setMemproses(false)
    setKonfirmasi(false)
    if (hasil.error) onGagal(hasil.error)
    else onBerhasil(servis.status, ke, arah)
  }

  const label = arah === 'maju' ? `→ ${tujuan}` : `Kembalikan ke ${tujuan}`
  const gaya =
    arah === 'maju'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'

  return (
    <>
      <button
        type="button"
        disabled={memproses || butuhMekanik}
        title={butuhMekanik ? 'Tugaskan mekanik terlebih dahulu sebelum memindahkan status ke Diperiksa' : undefined}
        onClick={() => (perlu ? setKonfirmasi(true) : void jalankan(tujuan))}
        className={`min-h-11 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${gaya} ${className}`}
      >
        {memproses && !konfirmasi ? 'Memproses…' : label}
      </button>

      <ConfirmDialog
        open={konfirmasi}
        judul={arah === 'maju' ? `Ubah status ke "${tujuan}"?` : `Kembalikan ke "${tujuan}"?`}
        labelKonfirmasi={arah === 'maju' ? `Ya, ${tujuan}` : 'Ya, kembalikan'}
        bahaya={final}
        memproses={memproses}
        onKonfirmasi={() => void jalankan(tujuan)}
        onBatal={() => setKonfirmasi(false)}
      >
        <p>
          Kendaraan <span className="font-semibold">{formatNopol(servis.nomor_polisi)}</span> akan
          berubah dari <span className="font-semibold">{servis.status}</span> menjadi{' '}
          <span className="font-semibold">{tujuan}</span>.
        </p>
        {final && (
          <p className="mt-2 font-medium text-red-700">
            Aksi ini final: servis akan terkunci dan tidak dapat diubah lagi.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
