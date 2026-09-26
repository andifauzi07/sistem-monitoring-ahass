import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/authContext'
import { LoadingScreen } from './LoadingScreen'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
