import { createBrowserRouter } from 'react-router'
import { GuestOnly } from './components/GuestOnly'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicMonitoringPage } from './pages/PublicMonitoringPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <PublicMonitoringPage /> },
      {
        element: <GuestOnly />,
        children: [{ path: 'login', element: <LoginPage /> }],
      },
      {
        // Rute Service Advisor pada iterasi berikutnya ditambahkan sebagai child di sini.
        element: <RequireAuth />,
        children: [{ path: 'dashboard', element: <DashboardPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
