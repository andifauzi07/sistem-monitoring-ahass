import { useCallback, useState, type FormEvent, type ReactNode } from 'react'
import { ambilNamaAkun, ubahEmailAkun, ubahNamaAkun, ubahPasswordAkun } from '../lib/akun'
import { useAuth } from '../lib/authContext'
import { useMuat } from '../lib/useMuat'

const inputClass =
  'mt-1 block min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-slate-100'

const PASSWORD_MIN = 6

function CardForm({
  onSubmit,
  children,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </form>
  )
}

function FormNama({ userId, awal }: { userId: string; awal: string }) {
  const [nama, setNama] = useState(awal)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)
  const [tersimpan, setTersimpan] = useState(awal)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (menyimpan) return
    setMenyimpan(true)
    setGalat(null)
    setSukses(false)
    const error = await ubahNamaAkun(userId, nama)
    setMenyimpan(false)
    if (error) {
      setGalat(error)
      return
    }
    const namaBersih = nama.trim()
    setNama(namaBersih)
    setTersimpan(namaBersih)
    setSukses(true)
  }

  return (
    <CardForm onSubmit={handleSubmit}>
      <div>
        <label htmlFor="akun-nama" className="block text-sm font-medium text-slate-700">
          Nama
        </label>
        <input
          id="akun-nama"
          value={nama}
          onChange={(e) => {
            setNama(e.target.value)
            setSukses(false)
          }}
          disabled={menyimpan}
          autoComplete="off"
          className={inputClass}
        />
      </div>
      {galat && (
        <p role="alert" className="text-sm text-red-600">
          {galat}
        </p>
      )}
      {sukses && <p className="text-sm text-green-700">Nama berhasil diperbarui.</p>}
      <button
        type="submit"
        disabled={menyimpan || nama.trim() === tersimpan}
        className="min-h-11 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {menyimpan ? 'Menyimpan…' : 'Simpan Nama'}
      </button>
    </CardForm>
  )
}

function FormEmail({ userId, awal }: { userId: string; awal: string }) {
  const [email, setEmail] = useState(awal)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)
  const [tersimpan, setTersimpan] = useState(awal)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (menyimpan) return
    setMenyimpan(true)
    setGalat(null)
    setSukses(false)
    const error = await ubahEmailAkun(userId, email)
    setMenyimpan(false)
    if (error) {
      setGalat(error)
      return
    }
    const emailBersih = email.trim()
    setEmail(emailBersih)
    setTersimpan(emailBersih)
    setSukses(true)
  }

  return (
    <CardForm onSubmit={handleSubmit}>
      <div>
        <label htmlFor="akun-email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="akun-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setSukses(false)
          }}
          disabled={menyimpan}
          autoComplete="off"
          className={inputClass}
        />
      </div>
      {galat && (
        <p role="alert" className="text-sm text-red-600">
          {galat}
        </p>
      )}
      {sukses && <p className="text-sm text-green-700">Email berhasil diperbarui.</p>}
      <button
        type="submit"
        disabled={menyimpan || email.trim() === tersimpan}
        className="min-h-11 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {menyimpan ? 'Menyimpan…' : 'Simpan Email'}
      </button>
    </CardForm>
  )
}

function FormPassword() {
  const [passwordBaru, setPasswordBaru] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sukses, setSukses] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (menyimpan) return
    if (passwordBaru.length < PASSWORD_MIN) {
      setGalat(`Password minimal ${PASSWORD_MIN} karakter.`)
      return
    }
    setMenyimpan(true)
    setGalat(null)
    setSukses(false)
    const error = await ubahPasswordAkun(passwordBaru)
    setMenyimpan(false)
    if (error) {
      setGalat(error)
      return
    }
    setPasswordBaru('')
    setSukses(true)
  }

  return (
    <CardForm onSubmit={handleSubmit}>
      <div>
        <label htmlFor="akun-password" className="block text-sm font-medium text-slate-700">
          Password baru
        </label>
        <input
          id="akun-password"
          type="password"
          value={passwordBaru}
          onChange={(e) => {
            setPasswordBaru(e.target.value)
            setSukses(false)
          }}
          disabled={menyimpan}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {galat && (
        <p role="alert" className="text-sm text-red-600">
          {galat}
        </p>
      )}
      {sukses && <p className="text-sm text-green-700">Password berhasil diperbarui.</p>}
      <button
        type="submit"
        disabled={menyimpan || !passwordBaru}
        className="min-h-11 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {menyimpan ? 'Menyimpan…' : 'Simpan Password'}
      </button>
    </CardForm>
  )
}

export function AkunPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const loader = useCallback(() => ambilNamaAkun(userId), [userId])
  const { data: namaAwal, error: errorNama, loading: loadingNama } = useMuat(loader)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Kelola Akun</h1>

      {loadingNama && <p className="py-10 text-center text-slate-500">Memuat…</p>}

      {errorNama && (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {errorNama}
        </div>
      )}

      {namaAwal !== null && <FormNama userId={userId} awal={namaAwal} />}
      <FormEmail userId={userId} awal={user?.email ?? ''} />
      <FormPassword />
    </div>
  )
}
