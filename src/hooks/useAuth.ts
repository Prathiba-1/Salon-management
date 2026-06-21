import { useContext } from 'react'
import { AuthContext } from '../layouts/AuthContext'

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF'

export interface AuthUser {
  id: string
  name: string
  role: UserRole
  salonId: string
  avatarInitials: string
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** Returns true if the current user has at least the given role level */
export function useHasRole(...roles: UserRole[]): boolean {
  const { user } = useAuth()
  if (!user) return false
  return roles.includes(user.role)
}
