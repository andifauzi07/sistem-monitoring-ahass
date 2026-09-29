import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { CircleCheck, LoaderCircle, SearchX } from 'lucide-react'
import { IndikatorLive } from '../components/IndikatorLive'
import { StatusBadge } from '../components/StatusBadge'
import { StatusStepper } from '../components/StatusStepper'
import { cekStatus, PANJANG_MIN_NOPOL, pisahkanHasil, type Hasil } from '../lib/cekStatus'
import { formatTanggalWaktu } from '../lib/format'
import { formatNopol, normalizeNopol } from '../lib/nopol'
import { isAktif } from '../lib/statusServis'
import { useMuat } from '../lib/useMuat'
import { useSinyalRealtime } from '../lib/useSinyalRealtime'
import type { HasilCekStatus } from '../types/database'

const PESAN_TERLALU_PENDEK = `Masukkan nomor polisi minimal ${PANJANG_MIN_NOPOL} huruf/angka.`

/** Nopol ternormalisasi bila cukup panjang untuk dicari, selain itu null (design D3). */
function nopolValid(mentah: string | null): string | null {
  const normal = normalizeNopol(mentah ?? '')
  return normal.length >= PANJANG_MIN_NOPOL ? normal : null
}

/** Isi input dari URL: format tampilan bila valid, apa adanya bila tidak. */
function nilaiInputDariUrl(mentah: string | null): string {
  const valid = nopolValid(mentah)
  return valid ? formatNopol(valid) : (mentah ?? '')
}

function pesanValidasiDariUrl(mentah: string | null): string | null {
  return mentah !== null && !nopolValid(mentah) ? PESAN_TERLALU_PENDEK : null
}

/** Hasil `cek_status` beserta waktu berhasil dimuat (dicatat di loader, bukan saat render). */
type Muatan = { daftar: HasilCekStatus[]; waktu: Date }

const TANPA_PENCARIAN: Hasil<Muatan | null> = { data: null, error: null }

const LAMA_SOROT_MS = 2500

// Payload broadcast sengaja diabaikan: data selalu diambil ulang lewat cek_status (design D1).
function pasangPublik(channel: RealtimeChannel, picu: () => void) {
  channel.on('broadcast', { event: 'berubah' }, () => picu())
}

/**
 * Teks pengumuman bila status kunjungan terbaru berubah, selain itu null.
 * Kunjungan terbaru = servis aktif bila ada (selalu yang paling baru masuk).
 * Kunjungan yang hilang (servis dihapus) tidak diumumkan.
 */
function teksPerubahan(sebelum: HasilCekStatus[], sesudah: HasilCekStatus[]): string | null {
  const lama = sebelum[0]
  const baru = sesudah[0]
  if (!baru) return null
  const kunjunganSama = lama?.tanggal_masuk === baru.tanggal_masuk
  if (kunjunganSama ? lama.status === baru.status : !isAktif(baru.status)) return null
  return `Status berubah menjadi ${baru.status}`
}

export function PublicMonitoringPage() {
  // URL adalah sumber kebenaran pencarian (design D2).
  const [searchParams, setSearchParams] = useSearchParams()
  const paramNopol = searchParams.get('nopol')
  const nopol = nopolValid(paramNopol)

  const [input, setInput] = useState(() => nilaiInputDariUrl(paramNopol))
  const [pesanValidasi, setPesanValidasi] = useState(() => pesanValidasiDariUrl(paramNopol))

  // Sinkronkan input saat param berubah (Back/Forward, tautan) tanpa efek.
  const [paramSebelumnya, setParamSebelumnya] = useState(paramNopol)
  if (paramNopol !== paramSebelumnya) {
    setParamSebelumnya(paramNopol)
    setInput(nilaiInputDariUrl(paramNopol))
    setPesanValidasi(pesanValidasiDariUrl(paramNopol))
  }

  const loader = useCallback(async (): Promise<Hasil<Muatan | null>> => {
    if (!nopol) return TANPA_PENCARIAN
    const hasil = await cekStatus(nopol)
    return hasil.error ? hasil : { data: { daftar: hasil.data, waktu: new Date() }, error: null }
  }, [nopol])
  const { data, error, loading, muatUlang } = useMuat(loader)
  // `loading` hanya true saat nopol berganti; muat ulang karena sinyal mempertahankan data lama,
  // sehingga tombol "Cek Status" tidak ikut berputar (design D6).
  const memuat = nopol !== null && loading

  const { terhubung } = useSinyalRealtime(
    { nama: `servis:${nopol ?? ''}`, pasang: pasangPublik, aktif: nopol !== null },
    muatUlang,
  )

  // Muatan terakhir yang berhasil: tetap ditampilkan bila penyegaran berikutnya gagal,
  // dan menjadi pembanding untuk pengumuman perubahan status.
  const [terakhir, setTerakhir] = useState<{ nopol: string; muatan: Muatan } | null>(null)
  const [pengumuman, setPengumuman] = useState<{ nopol: string; teks: string } | null>(null)
  const [sorot, setSorot] = useState(false)
  if (nopol && data && data !== terakhir?.muatan) {
    const sebelum = terakhir?.nopol === nopol ? terakhir.muatan.daftar : null
    setTerakhir({ nopol, muatan: data })
    const teks = sebelum ? teksPerubahan(sebelum, data.daftar) : null
    if (teks) {
      setPengumuman({ nopol, teks })
      setSorot(true)
    }
  }

  useEffect(() => {
    if (!sorot) return
    const timer = setTimeout(() => setSorot(false), LAMA_SOROT_MS)
    return () => clearTimeout(timer)
  }, [sorot, pengumuman])

  const muatanTampil = data ?? (error && terakhir?.nopol === nopol ? terakhir.muatan : null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const valid = nopolValid(input)
    if (!valid) {
      setPesanValidasi(PESAN_TERLALU_PENDEK)
      return
    }
    setPesanValidasi(null)
    setInput(formatNopol(valid))
    // Nopol sama → URL tidak berubah, jadi ambil ulang secara eksplisit.
    if (valid === nopol) muatUlang()
    else setSearchParams({ nopol: valid })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Cek Status Servis Motor Anda</h1>
        <p className="text-slate-600">
          Masukkan nomor polisi kendaraan untuk melihat progres servis di AHASS Kota Mamuju.
        </p>
      </section>

      <form noValidate onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="nopol" className="sr-only">
            Nomor polisi
          </label>
          <input
            id="nopol"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setPesanValidasi(null)
            }}
            placeholder="Contoh: DC 1234 AB"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-invalid={pesanValidasi !== null}
            aria-describedby={pesanValidasi ? 'nopol-galat' : undefined}
            className="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-lg uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 aria-invalid:border-red-500"
          />
          <button
            type="submit"
            disabled={memuat}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {memuat && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
            Cek Status
          </button>
        </div>
        {pesanValidasi && (
          <p id="nopol-galat" role="alert" className="text-sm text-red-600">
            {pesanValidasi}
          </p>
        )}
      </form>

      {nopol === null ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Tahapan servis</h2>
          <StatusStepper status={null} />
        </section>
      ) : memuat ? (
        <div role="status" className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Mencari data servis…
        </div>
      ) : muatanTampil ? (
        <div className="space-y-4">
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <p>Gagal memperbarui data. Menampilkan data terakhir.</p>
              <button type="button" onClick={muatUlang} className="min-h-11 font-semibold underline">
                Coba lagi
              </button>
            </div>
          )}
          {muatanTampil.daftar.length === 0 ? (
            <TidakDitemukan nopol={nopol} />
          ) : (
            <HasilPencarian key={nopol} nopol={nopol} hasil={muatanTampil.daftar} sorot={sorot} />
          )}
          <IndikatorLive terhubung={terhubung} diperbarui={muatanTampil.waktu} />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl bg-red-50 p-5 text-sm text-red-700">
          <p>{error.pesan}</p>
          <button
            type="button"
            onClick={muatUlang}
            className="min-h-11 rounded-md border border-red-300 bg-white px-4 font-semibold text-red-700 hover:bg-red-100"
          >
            Coba lagi
          </button>
        </div>
      ) : null}

      {/* Selalu ada di DOM agar pembaca layar mengumumkan perubahannya. */}
      <p aria-live="polite" className="sr-only">
        {pengumuman && pengumuman.nopol === nopol ? pengumuman.teks : ''}
      </p>
    </div>
  )
}

function TidakDitemukan({ nopol }: { nopol: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <SearchX className="mx-auto size-10 text-slate-400" aria-hidden="true" />
      <p className="mt-3 font-semibold text-slate-800">
        Nomor polisi {formatNopol(nopol)} tidak ditemukan
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Kendaraan ini belum terdaftar untuk servis. Periksa kembali penulisan nomor polisi Anda.
      </p>
    </div>
  )
}

function HasilPencarian({ nopol, hasil, sorot }: { nopol: string; hasil: HasilCekStatus[]; sorot: boolean }) {
  const { aktif, riwayat } = pisahkanHasil(hasil)

  return (
    <div className="space-y-4">
      {aktif ? (
        <KartuServisAktif servis={aktif} sorot={sorot} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
          <p className="font-semibold text-slate-800">{formatNopol(nopol)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Tidak ada servis yang sedang berjalan untuk kendaraan ini.
          </p>
        </div>
      )}

      {riwayat.length > 0 && (
        <details open={!aktif} className="group rounded-xl border border-slate-200 bg-white">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between px-5 text-sm font-semibold text-slate-700 marker:content-none">
            Kunjungan sebelumnya ({riwayat.length})
            <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold sm:px-5">No</th>
                  <th scope="col" className="px-2 py-2 font-semibold">No Polisi</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Status Unit</th>
                  <th scope="col" className="px-3 py-2 font-semibold sm:px-5">Tanggal Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayat.map((r, i) => (
                  <tr key={r.tanggal_masuk}>
                    <td className="px-3 py-3 text-slate-500 sm:px-5">{i + 1}</td>
                    <td className="whitespace-nowrap px-2 py-3 font-medium text-slate-900">
                      {formatNopol(r.nomor_polisi)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-700 sm:px-5">{formatTanggalWaktu(r.tanggal_masuk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}

function KartuServisAktif({ servis, sorot }: { servis: HasilCekStatus; sorot: boolean }) {
  const siapDiambil = servis.status === 'Selesai Dikerjakan'

  return (
    <section
      aria-label="Servis yang sedang berjalan"
      className={`space-y-5 rounded-xl border p-5 shadow-sm transition-colors duration-700 ${
        sorot ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold tracking-wide text-slate-900">{formatNopol(servis.nomor_polisi)}</p>
          <p className="text-sm text-slate-600">{servis.jenis_motor}</p>
        </div>
        <StatusBadge status={servis.status} />
      </div>

      {siapDiambil && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>Servis sudah selesai. Kendaraan Anda siap diambil di bengkel.</p>
        </div>
      )}

      <StatusStepper status={servis.status} />

      <dl className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Tanggal masuk</dt>
          <dd className="font-medium text-slate-800">{formatTanggalWaktu(servis.tanggal_masuk)}</dd>
        </div>
        {servis.tanggal_selesai && (
          <div>
            <dt className="text-slate-500">Tanggal selesai</dt>
            <dd className="font-medium text-slate-800">{formatTanggalWaktu(servis.tanggal_selesai)}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
