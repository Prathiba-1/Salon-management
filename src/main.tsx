import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './layouts/AppShell'
import { AuthProvider } from './layouts/AuthContext'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { ToastProvider } from './components/ui/Toast'
import { SettingsProvider } from './contexts/SettingsContext'
import { DailyPulseBoard } from './pages/DailyPulseBoard'
import { CalendarPage } from './pages/CalendarPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerProfilePage } from './pages/CustomerProfilePage'
import { MySchedulePage } from './pages/MySchedulePage'
import './index.css'
import { SettingsPage } from './pages/SettingsPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { InventoryPage } from './pages/InventoryPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LoginPage } from './pages/LoginPage'
import { USE_MOCKS } from './lib/supabaseClient'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
})

// Placeholder pages — replace with real pages in later milestones
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
      {name} — coming soon
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/daily-pulse" replace /> },
      {
        path: 'daily-pulse',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <DailyPulseBoard />
          </ProtectedRoute>
        ),
      },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'my-schedule', element: <MySchedulePage /> },
      {
        path: 'customers',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <CustomersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'customers/:id',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <CustomerProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <Placeholder name="Staff" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'invoices',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <InvoicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'inventory',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <InventoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={['OWNER', 'ADMIN']}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'webhooks',
        element: (
          <ProtectedRoute allowedRoles={['OWNER']}>
            <WebhooksPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

async function prepare() {
  // M10.1: MSW only intercepts requests when mocks are explicitly enabled.
  // With VITE_USE_MOCKS=false, fetch() calls pass through untouched and
  // hooks that have been migrated to supabase-js (see src/lib, src/hooks)
  // talk to the real Supabase backend instead.
  if (import.meta.env.DEV && USE_MOCKS) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
})
