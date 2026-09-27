import { createBrowserRouter } from 'react-router'
import { GuestOnly } from './components/GuestOnly'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { AkunPage } from './pages/AkunPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MekanikPage } from './pages/MekanikPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicMonitoringPage } from './pages/PublicMonitoringPage'
import { RiwayatPage } from './pages/RiwayatPage'
import { ServisBaruPage } from './pages/ServisBaruPage'
import { ServisDetailPage } from './pages/ServisDetailPage'
import { ServisEditPage } from './pages/ServisEditPage'
import { ServisListPage } from './pages/ServisListPage'

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
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'servis', element: <ServisListPage /> },
          { path: 'servis/baru', element: <ServisBaruPage /> },
          { path: 'servis/:id', element: <ServisDetailPage /> },
          { path: 'servis/:id/edit', element: <ServisEditPage /> },
          { path: 'riwayat', element: <RiwayatPage /> },
          { path: 'mekanik', element: <MekanikPage /> },
          { path: 'akun', element: <AkunPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
