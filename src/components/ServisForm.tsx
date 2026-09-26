import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { formatNopol, normalizeNopol } from '../lib/nopol'
import type { HasilCariKendaraan } from '../lib/servis'
import type { PesanServis } from '../lib/servisErrors'
import {
  MASALAH_MAKS,
  validasiServis,
  type ServisFieldErrors,
  type ServisInput,
  type ServisPayload,
} from '../lib/servisValidation'

type Props = {
  awal: ServisInput
  labelSimpan: string
  /** Mengembalikan error bila gagal, atau `null` bila berhasil (induk yang berpindah halaman). */
  onSubmit: (value: ServisPayload) => Promise<PesanServis | null>
  /** Hanya untuk mode tambah: dipanggil setelah SA selesai mengetik nomor polisi. */
  onCariNopol?: (nopol: string) => Promise<HasilCariKendaraan | null>
  onBatal: () => void
}

const inputClass =
  'mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-slate-100 aria-[invalid=true]:border-red-500'

const DEBOUNCE_NOPOL_MS = 400

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function ServisForm({ awal, labelSimpan, onSubmit, onCariNopol, onBatal }: Props) {
  const [values, setValues] = useState<ServisInput>(awal)
  const [errors, setErrors] = useState<ServisFieldErrors>({})
  const [galat, setGalat] = useState<PesanServis | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [servisAktifId, setServisAktifId] = useState<string | null>(null)
  const [terisiOtomatis, setTerisiOtomatis] = useState(false)

  const timerCari = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nopolTerakhirDicari = useRef('')

  useEffect(
    () => () => {
      if (timerCari.current) clearTimeout(timerCari.current)
    },
    [],
  )

  function ubah(field: keyof ServisInput) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nilai = e.target.value
      setValues((v) => ({ ...v, [field]: nilai }))
      setErrors((err) => ({ ...err, [field]: undefined }))
    }
  }

  async function cariNopol(nopol: string) {
    if (!onCariNopol) return
    const normal = normalizeNopol(nopol)
    if (normal.length < 3) {
      nopolTerakhirDicari.current = ''
      setServisAktifId(null)
      return
    }
    if (normal === nopolTerakhirDicari.current) return
    nopolTerakhirDicari.current = normal

    const hasil = await onCariNopol(normal)
    // Abaikan jawaban basi bila SA sudah mengetik nopol lain.
    if (!hasil || nopolTerakhirDicari.current !== normal) return

    setServisAktifId(hasil.servisAktifId)
    if (!hasil.pelanggan) {
      setTerisiOtomatis(false)
      return
    }
    const { pelanggan, jenisMotorTerakhir } = hasil
    // Hanya mengisi field yang masih kosong; ketikan SA tidak pernah ditimpa.
    setValues((v) => ({
      ...v,
      nama_pembawa: v.nama_pembawa.trim() ? v.nama_pembawa : pelanggan.nama_pembawa,
      nomor_wa: v.nomor_wa.trim() ? v.nomor_wa : pelanggan.nomor_wa,
      jenis_motor: v.jenis_motor.trim() ? v.jenis_motor : (jenisMotorTerakhir ?? ''),
    }))
    setTerisiOtomatis(true)
  }

  function handleNopolChange(e: ChangeEvent<HTMLInputElement>) {
    ubah('nomor_polisi')(e)
    if (!onCariNopol) return
    const nilai = e.target.value
    if (timerCari.current) clearTimeout(timerCari.current)
    timerCari.current = setTimeout(() => void cariNopol(nilai), DEBOUNCE_NOPOL_MS)
  }

  function handleNopolBlur() {
    if (timerCari.current) clearTimeout(timerCari.current)
    void cariNopol(values.nomor_polisi)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return

    const hasil = validasiServis(values)
    if (hasil.errors) {
      setErrors(hasil.errors)
      setGalat(null)
      return
    }

    setSubmitting(true)
    setGalat(null)
    const error = await onSubmit(hasil.value)
    // Bila berhasil, induk berpindah halaman; form tidak diaktifkan lagi.
    if (error) {
      setGalat(error)
      setSubmitting(false)
    }
  }

  const pratinjauNopol = values.nomor_polisi.trim() ? formatNopol(values.nomor_polisi) : ''
  const sisaMasalah = MASALAH_MAKS - values.masalah.trim().length

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field
        id="nomor_polisi"
        label="Nomor polisi"
        error={errors.nomor_polisi}
        hint={pratinjauNopol ? `Tersimpan sebagai: ${pratinjauNopol}` : 'Contoh: DC 1234 AB'}
      >
        <input
          id="nomor_polisi"
          value={values.nomor_polisi}
          onChange={handleNopolChange}
          onBlur={handleNopolBlur}
          disabled={submitting}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.nomor_polisi)}
          aria-describedby={errors.nomor_polisi ? 'nomor_polisi-error' : undefined}
          className={`${inputClass} uppercase tracking-wide`}
        />
      </Field>

      {servisAktifId && (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Kendaraan ini masih punya servis aktif, sehingga belum bisa didaftarkan lagi.{' '}
          <Link to={`/servis/${servisAktifId}`} className="font-semibold underline">
            Buka servis aktif
          </Link>
        </div>
      )}
      {terisiOtomatis && !servisAktifId && (
        <p className="text-sm text-slate-500">Data kendaraan terisi otomatis dari kunjungan terakhir. Periksa kembali.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="nama_pembawa" label="Nama pembawa" error={errors.nama_pembawa}>
          <input
            id="nama_pembawa"
            value={values.nama_pembawa}
            onChange={ubah('nama_pembawa')}
            disabled={submitting}
            autoComplete="off"
            aria-invalid={Boolean(errors.nama_pembawa)}
            aria-describedby={errors.nama_pembawa ? 'nama_pembawa-error' : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="nomor_wa" label="Nomor WhatsApp" error={errors.nomor_wa} hint="Contoh: 0812 3456 7890">
          <input
            id="nomor_wa"
            type="tel"
            inputMode="tel"
            value={values.nomor_wa}
            onChange={ubah('nomor_wa')}
            disabled={submitting}
            autoComplete="off"
            aria-invalid={Boolean(errors.nomor_wa)}
            aria-describedby={errors.nomor_wa ? 'nomor_wa-error' : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="jenis_motor" label="Jenis motor" error={errors.jenis_motor} hint="Contoh: Vario 125">
          <input
            id="jenis_motor"
            value={values.jenis_motor}
            onChange={ubah('jenis_motor')}
            disabled={submitting}
            autoComplete="off"
            aria-invalid={Boolean(errors.jenis_motor)}
            aria-describedby={errors.jenis_motor ? 'jenis_motor-error' : undefined}
            className={inputClass}
          />
        </Field>
        <Field id="kilometer" label="Kilometer" error={errors.kilometer}>
          <input
            id="kilometer"
            inputMode="numeric"
            pattern="[0-9]*"
            value={values.kilometer}
            onChange={ubah('kilometer')}
            disabled={submitting}
            autoComplete="off"
            aria-invalid={Boolean(errors.kilometer)}
            aria-describedby={errors.kilometer ? 'kilometer-error' : undefined}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        id="masalah"
        label="Keluhan / masalah"
        error={errors.masalah}
        hint={`Sisa ${sisaMasalah} karakter`}
      >
        <textarea
          id="masalah"
          rows={4}
          value={values.masalah}
          onChange={ubah('masalah')}
          disabled={submitting}
          aria-invalid={Boolean(errors.masalah)}
          aria-describedby={errors.masalah ? 'masalah-error' : undefined}
          className={inputClass}
        />
      </Field>

      <div role="alert" className="text-sm text-red-600">
        {galat && (
          <>
            {galat.pesan}{' '}
            {galat.servisAktifId && (
              <Link to={`/servis/${galat.servisAktifId}`} className="font-semibold underline">
                Buka servis aktif
              </Link>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBatal}
          disabled={submitting}
          className="min-h-11 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Menyimpan…' : labelSimpan}
        </button>
      </div>
    </form>
  )
}
