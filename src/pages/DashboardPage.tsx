import { Link } from 'react-router'
import { useAuth } from '../lib/authContext'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-600">
        Halo, <span className="font-medium">{user?.email}</span>. Dashboard operasional dikerjakan
        pada Iterasi 3.
      </p>
      <Link
        to="/servis"
        className="inline-flex min-h-11 items-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Kelola Servis
      </Link>
    </div>
  )
}
