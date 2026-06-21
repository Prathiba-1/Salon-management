import React, { createContext, useEffect, useState } from 'react'
import type { AuthUser, UserRole } from '../hooks/useAuth'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  /** dev-only: switch role without real auth — only functional when USE_MOCKS is true */
  setRole: (role: UserRole) => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Mock users keyed by role — used only when VITE_USE_MOCKS=true (unchanged from M1–M6) */
const MOCK_USERS: Record<UserRole, AuthUser> = {
  OWNER: { id: 'usr_01', name: 'Elena L.', role: 'OWNER', salonId: 'sal_01', avatarInitials: 'EL' },
  ADMIN: { id: 'usr_02', name: 'Arun M.', role: 'ADMIN', salonId: 'sal_01', avatarInitials: 'AM' },
  STAFF: { id: 'usr_03', name: 'Sunita R.', role: 'STAFF', salonId: 'sal_01', avatarInitials: 'SR' },
}

/**
 * Maps a Supabase auth session into the AuthUser shape the rest of the app
 * already expects (unchanged since M1). Role + salonId come from
 * app_metadata, stamped by the M7.5 handle_new_user trigger — NOT from
 * user_metadata, which is client-settable and must never be trusted for
 * authorization.
 */
function userFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null
  const appMeta = session.user.app_metadata as { role?: string; salonId?: string }
  const role = (appMeta.role?.toUpperCase() as UserRole) ?? 'STAFF'
  const name =
    (session.user.user_metadata as { name?: string })?.name ?? session.user.email ?? 'Unknown'
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return {
    id: session.user.id,
    name,
    role,
    salonId: appMeta.salonId ?? '',
    avatarInitials: initials || 'U',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ── Mock path (USE_MOCKS=true) — identical behaviour to M1–M6 ───────────
  const [mockRole, setMockRole] = useState<UserRole>('OWNER')

  // ── Real path (USE_MOCKS=false) ──────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!USE_MOCKS)

  useEffect(() => {
    if (USE_MOCKS) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (USE_MOCKS) return { error: 'signIn is not available while VITE_USE_MOCKS=true' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (USE_MOCKS) return
    await supabase.auth.signOut()
  }

  const value: AuthContextValue = USE_MOCKS
    ? { user: MOCK_USERS[mockRole], loading: false, setRole: setMockRole, signIn, signOut }
    : { user: userFromSession(session), loading, setRole: () => {}, signIn, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
