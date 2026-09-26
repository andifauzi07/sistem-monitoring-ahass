import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-12 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="text-xl font-semibold text-slate-900">Halaman tidak ditemukan</h1>
      <Link
        to="/"
        className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Kembali ke beranda
      </Link>
    </div>
  )
}
