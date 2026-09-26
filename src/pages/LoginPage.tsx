import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/authContext'
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'

const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 disabled:bg-slate-100'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting || !isSupabaseConfigured) return
    if (!email.trim() || !password) return

    setSubmitting(true)
    setError(null)
    // Jika berhasil, GuestOnly mengarahkan pengguna begitu status menjadi `authenticated`.
    const message = await signIn(email.trim(), password)
    if (message) {
      setError(message)
      setPassword('')
    }
    setSubmitting(false)
  }

  const disabled = submitting || !isSupabaseConfigured

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Masuk Service Advisor</h1>

      {!isSupabaseConfigured && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {supabaseConfigError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        </label>

        <div role="alert" className="min-h-0 text-sm text-red-600">
          {error}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
