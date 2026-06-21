import { useQuery } from '@tanstack/react-query'
import { callRpc, USE_MOCKS } from '../lib/supabaseClient'

/**
 * M4 (minimal) — per-stylist occupancy snapshot for a single day.
 * This intentionally is NOT the full <UtilisationHeatmap /> from the original plan
 * (no 7-day grid, no hover tooltips, no CSV export, no stylist filter) — that's
 * deferred to a post-MVP backlog item. This is just enough for an owner to see
 * who's busy today.
 */
export interface StylistUtilisation {
  stylistId: string
  stylistName: string
  avatarInitials: string
  bookingCount: number
  bookedMin: number
  shiftMin: number
  occupancyRate: number   // 0–1
  hasShiftData: boolean
}

async function fetchUtilisationSnapshotMock(date: string): Promise<StylistUtilisation[]> {
  const res = await fetch(`/api/utilisation-snapshot?date=${date}`)
  if (!res.ok) throw new Error(`Failed to fetch utilisation snapshot: ${res.status}`)
  return res.json()
}

// Bug fix: this previously always hit the mock endpoint regardless of
// VITE_USE_MOCKS, so the Utilisation section always showed the retry/error
// state once mocks were off. Calls the M8.4 utilisation_snapshot(date) RPC.
async function fetchUtilisationSnapshotLive(date: string): Promise<StylistUtilisation[]> {
  return callRpc<StylistUtilisation[]>('utilisation_snapshot', { p_date: date })
}

export function useUtilisationSnapshot(date: string) {
  return useQuery<StylistUtilisation[], Error>({
    queryKey: ['utilisation-snapshot', date],
    queryFn: () => (USE_MOCKS ? fetchUtilisationSnapshotMock(date) : fetchUtilisationSnapshotLive(date)),
    staleTime: 30_000,
    retry: 2,
  })
}
