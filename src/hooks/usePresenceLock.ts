import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface LockState {
  slotId: string
  lockedBy: string
}

/**
 * M9.2 / M10.4 — Presence-based optimistic lock for calendar drag-and-drop,
 * replacing the originally-planned Redis lock. ADVISORY ONLY: the M7.2
 * EXCLUDE constraint (enforced server-side via create_appointment /
 * reschedule_appointment) remains the sole authority that can actually
 * reject a conflicting write. This hook only gives other clients an early
 * visual signal so two people aren't fighting over the same slot in the UI
 * before either commits.
 *
 * No-ops entirely when USE_MOCKS is true — the M3.6 mock socket timer
 * already simulates enough live-update behaviour for mock-mode development.
 */
export function usePresenceLock(salonId: string) {
  const { user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})

  useEffect(() => {
    if (USE_MOCKS || !salonId) return

    const channel = supabase.channel(`salon:${salonId}`, {
      config: { presence: { key: user?.id ?? 'anonymous' } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<LockState>()
        const next: Record<string, string> = {}
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            if (p.slotId) next[p.slotId] = p.lockedBy
          }
        }
        setLockedSlots(next)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [salonId, user?.id])

  const lockSlot = useCallback(
    async (slotId: string) => {
      if (USE_MOCKS || !channelRef.current) return
      await channelRef.current.track({ slotId, lockedBy: user?.name ?? 'Someone' } satisfies LockState)
    },
    [user?.name],
  )

  const unlockSlot = useCallback(async () => {
    if (USE_MOCKS || !channelRef.current) return
    await channelRef.current.untrack()
  }, [])

  /** Returns the name of whoever has this slot locked, or null if it's free. */
  const isLocked = useCallback(
    (slotId: string): string | null => lockedSlots[slotId] ?? null,
    [lockedSlots],
  )

  return { lockSlot, unlockSlot, isLocked }
}
