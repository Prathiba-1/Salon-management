import React from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../contexts/SettingsContext'
import type { UserRole } from '../hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: string
  allowedRoles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  // Overview [0–1]
  { to: '/daily-pulse', label: 'Daily pulse',   icon: '📊', allowedRoles: ['OWNER', 'ADMIN'] },
  { to: '/calendar',    label: 'Calendar',       icon: '📅', allowedRoles: ['OWNER', 'ADMIN', 'STAFF'] },
  // Clients [2–3]
  { to: '/customers',   label: 'Customers',      icon: '👥', allowedRoles: ['OWNER', 'ADMIN'] },
  { to: '/invoices',    label: 'Invoices',        icon: '🧾', allowedRoles: ['OWNER', 'ADMIN'] },
  // Team & Operations [4–5]
  { to: '/analytics',   label: 'Staff details',  icon: '👤', allowedRoles: ['OWNER', 'ADMIN'] },
  { to: '/inventory',   label: 'Inventory',      icon: '📦', allowedRoles: ['OWNER', 'ADMIN'] },
  // System [6–7]
  { to: '/settings',    label: 'Settings',       icon: '⚙️',  allowedRoles: ['OWNER', 'ADMIN'] },
  { to: '/webhooks',    label: 'Webhooks',       icon: '🔗', allowedRoles: ['OWNER'] },
]

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function AppShell() {
  const { user, loading, signOut } = useAuth()
  const { settings } = useSettings()

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-400 text-sm">Loading…</div>
  }

  if (!user) {
    // No active session — send to /login instead of getting stuck here.
    // (Every child route is also wrapped in <ProtectedRoute>, which has the
    // same redirect, but AppShell wraps the index route's plain <Navigate
    // to="/daily-pulse"> too, which has no auth check of its own — so this
    // guard has to live here as well, not just on the protected children.)
    return <Navigate to="/login" replace />
  }

  const visibleNav = NAV_ITEMS.filter((n) => n.allowedRoles.includes(user.role))

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top nav */}
      <header className="h-[52px] bg-white border-b border-slate-100 flex items-center px-4 gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-2 text-brand-blue font-semibold text-[15px] tracking-tight">
          <span className="text-base leading-none" aria-hidden="true">✦</span>
          {settings.businessName}
        </div>
        <span className="text-xs text-slate-400">{formatDate(new Date())}</span>
        <div className="flex-1" />
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-blue-light text-brand-blue">
          {user.role}
        </span>
        <div
          className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-[11px] font-medium"
          aria-label={`Logged in as ${user.name}`}
        >
          {user.avatarInitials}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav
          aria-label="Main navigation"
          className="w-[200px] flex-shrink-0 bg-white border-r border-slate-100 flex flex-col py-3 overflow-y-auto"
        >
          <div className="flex flex-col gap-0.5 px-2">
            {visibleNav.map((item) => <SidebarLink key={item.to} item={item} />)}
          </div>
          <div className="mt-auto px-3 pb-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <span aria-hidden="true">↩</span> Log out
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 mx-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
          isActive
            ? 'bg-brand-blue-light text-brand-blue font-medium'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
        ].join(' ')
      }
    >
      <span aria-hidden="true" className="text-sm">{item.icon}</span>
      {item.label}
    </NavLink>
  )
}
