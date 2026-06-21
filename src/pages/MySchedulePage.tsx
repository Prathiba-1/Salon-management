import React from 'react'
import { useAuth } from '../hooks/useAuth'

/**
 * Landing page for the STAFF role — the redirect target used by <ProtectedRoute />
 * whenever a STAFF user hits an Owner/Admin-only route. Intentionally a stub for now;
 * a real "my schedule" view (today's bookings for the logged-in stylist) is a
 * candidate for a future milestone, not part of M4's minimal scope.
 */
export function MySchedulePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <span className="text-4xl" aria-hidden="true">📅</span>
      <h1 className="text-[18px] font-medium text-slate-800">Welcome, {user.name}</h1>
      <p className="text-xs text-slate-400 max-w-[260px]">
        Your personal schedule view is coming soon. For now, check the Calendar tab for today's bookings.
      </p>
    </div>
  )
}
