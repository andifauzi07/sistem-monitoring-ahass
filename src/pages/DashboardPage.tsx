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
    </div>
  )
}
