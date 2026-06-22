import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export type AlertType = 'VIP_PENDING' | 'LOW_INVENTORY' | 'OUT_OF_STOCK' | 'CONFLICT'

export interface ActionAlert {
  id: string
  type: AlertType
  title: string
  subtitle: string
  resolved: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

async function fetchAlertsMock(): Promise<ActionAlert[]> {
  const res = await fetch('/api/action-alerts')
  if (!res.ok) throw new Error('Failed to fetch alerts')
  return res.json()
}

// M10.5 — ActionAlert has no dedicated M8.4 view (it's simple enough to read
// directly via PostgREST's auto-generated REST API, per M8.1's note that
// only genuinely custom logic needs a hand-written function). RLS already
// restricts this to Owner/Admin per 0004_rls_policies.sql.
async function fetchAlertsLive(): Promise<ActionAlert[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ActionAlert')
    .select('id, type, title, subtitle, resolved, createdAt, metadata')
    .eq('resolved', false)
    .order('createdAt', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as ActionAlert[]
}

async function resolveAlertMock(id: string): Promise<void> {
  const res = await fetch(`/api/action-alerts/${id}/resolve`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to resolve alert')
}

async function resolveAlertLive(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('ActionAlert').update({ resolved: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export function useActionAlerts() {
  const qc = useQueryClient()
  const { user } = useAuth()

  // M9.4 — live inventory alerts arrive via the Edge Function's
  // 'inventory.alert' broadcast (relayed from the ActionAlert INSERT
  // webhook) instead of the 60s poll the mock path uses. On receipt, we
  // simply invalidate so the next fetch picks up the new row — simpler and
  // more robust than trying to splice the broadcast payload directly into
  // the cache, since the broadcast doesn't carry every field the table
  // query selects.
  useEffect(() => {
    if (USE_MOCKS || !user?.salonId) return

    const channel = supabase
      .channel(`salon:${user.salonId}`)
      .on('broadcast', { event: 'inventory.alert' }, () => {
        qc.invalidateQueries({ queryKey: ['action-alerts'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc, user?.salonId])

  return useQuery<ActionAlert[], Error>({
    queryKey: ['action-alerts'],
    queryFn: () => (USE_MOCKS ? fetchAlertsMock() : fetchAlertsLive()),
    refetchInterval: USE_MOCKS ? 60_000 : false,
    staleTime: 30_000,
  })
}

export function useResolveAlert() {
  const qc = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => (USE_MOCKS ? resolveAlertMock(id) : resolveAlertLive(id)),
    // Optimistic update — remove the card immediately
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['action-alerts'] })
      const previous = qc.getQueryData<ActionAlert[]>(['action-alerts'])
      qc.setQueryData<ActionAlert[]>(['action-alerts'], (old) =>
        old ? old.filter((a) => a.id !== id) : [],
      )
      return { previous }
    },
    // Revert on error
    onError: (_err, _id, context: unknown) => {
      const ctx = context as { previous?: ActionAlert[] }
      if (ctx?.previous) qc.setQueryData(['action-alerts'], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['action-alerts'] }),
  })
}
