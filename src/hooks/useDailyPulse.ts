import { useQuery } from '@tanstack/react-query'
import { callRpc } from '../lib/supabaseClient'
import { USE_MOCKS } from '../lib/supabaseClient'

export interface DailyPulseRevenue {
  services: number
  retail: number
  tips: number
  total: number
}

export interface DailyPulseOccupancy {
  rate: number          // 0–1
  bookedMin: number
  shiftMin: number
}

export interface DailyPulseAppointments {
  total: number
  confirmed: number
  pending: number
  inProgress: number
  complete: number
}

export interface DailyPulse {
  date: string
  revenue: DailyPulseRevenue
  occupancy: DailyPulseOccupancy
  appointments: DailyPulseAppointments
}

async function fetchDailyPulseMock(date: string): Promise<DailyPulse> {
  const res = await fetch(`/api/daily-pulse?date=${date}`)
  if (!res.ok) throw new Error(`Failed to fetch daily pulse: ${res.status}`)
  return res.json()
}

// M10.3 — calls the M8.4 daily_pulse(date) Postgres function via RPC. Single
// round trip, same as the mock. Note: live revenue.retail/.tips are 0 with a
// revenueNote explaining why (see 0008_dashboard_views.sql) — there's no
// backing ledger table for those yet, flagged to product rather than faked.
async function fetchDailyPulseLive(date: string): Promise<DailyPulse> {
  return callRpc<DailyPulse>('daily_pulse', { p_date: date })
}

export function useDailyPulse(date: string) {
  return useQuery<DailyPulse, Error>({
    queryKey: ['daily-pulse', date],
    queryFn: () => (USE_MOCKS ? fetchDailyPulseMock(date) : fetchDailyPulseLive(date)),
    refetchInterval: USE_MOCKS ? 60_000 : false,  // live data updates via Realtime instead of polling — see useCalendarSocket
    staleTime: 30_000,
    retry: 2,
  })
}
