import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/authContext'
import { LoadingScreen } from './LoadingScreen'

/** Hanya path internal (diawali `/`, bukan `//`) yang diterima sebagai tujuan redirect. */
function resolveTarget(state: unknown): string {
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } } | null)
    ?.from
  const pathname = from?.pathname
  if (typeof pathname === 'string' && pathname.startsWith('/') && !pathname.startsWith('//')) {
    return `${pathname}${from?.search ?? ''}${from?.hash ?? ''}`
  }
  return '/dashboard'
}

export function GuestOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to={resolveTarget(location.state)} replace />
  return <Outlet />
}
