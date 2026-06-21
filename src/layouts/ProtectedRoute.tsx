import React from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '../hooks/useAuth'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  /** Roles that are allowed to access this route */
  allowedRoles: UserRole[]
  children: React.ReactNode
  /** Where to redirect disallowed roles. Defaults to /my-schedule for STAFF */
  redirectTo?: string
}

const ROLE_RANK: Record<UserRole, number> = { OWNER: 3, ADMIN: 2, STAFF: 1 }

export function ProtectedRoute({ allowedRoles, children, redirectTo }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  // Real-auth path: briefly null while the session is being resolved on
  // first load/refresh. Render nothing rather than flashing a redirect.
  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const allowed = allowedRoles.includes(user.role)

  if (!allowed) {
    // STAFF lands on their own schedule by default; other disallowed roles (e.g. ADMIN
    // hitting an OWNER-only route) see the access-denied panel unless a redirect is given.
    const target = redirectTo ?? (user.role === 'STAFF' ? '/my-schedule' : undefined)
    if (target) return <Navigate to={target} replace />
    return <AccessDenied role={user.role} />
  }

  return <>{children}</>
}

function AccessDenied({ role }: { role: UserRole }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center">
      <span className="text-4xl text-slate-200" aria-hidden="true">🔒</span>
      <h2 className="text-sm font-medium text-slate-800">Access restricted</h2>
      <p className="text-xs text-slate-500 max-w-[200px]">
        Your role ({role}) doesn't include access to this section. Contact the salon owner.
      </p>
    </div>
  )
}

export { ROLE_RANK }
