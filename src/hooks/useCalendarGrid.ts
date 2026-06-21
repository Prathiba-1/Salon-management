import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Appointment, Stylist } from '../mocks/db'
import { callRpc, USE_MOCKS } from '../lib/supabaseClient'

export interface CalendarColumn {
  stylist: Stylist
  appointments: (Appointment & { customer?: { id: string; name: string; isVIP: boolean } })[]
}

async function fetchCalendarGridMock(date: string): Promise<CalendarColumn[]> {
  const res = await fetch(`/api/appointments?date=${date}`)
  if (!res.ok) throw new Error('Failed to fetch calendar')
  const appointments: Appointment[] = await res.json()

  const stylistRes = await fetch('/api/stylists')
  if (!stylistRes.ok) throw new Error('Failed to fetch stylists')
  const stylists: Stylist[] = await stylistRes.json()

  // Group appointments by stylist
  return stylists.map((stylist) => ({
    stylist,
    appointments: appointments.filter((a) => a.stylistId === stylist.id),
  }))
}

// M10.3 — calls the M8.4 calendar_grid(date, stylistIds) Postgres function.
// The function already returns the grouped-by-stylist shape directly
// (stylist + nested appointments + nested customer on each appointment), so
// no client-side grouping is needed here, unlike the two-fetch mock path.
// This is the function whose nested `customer` object is what makes
// AppointmentBlock and DailyPulseBoard show real names — see the
// implementation plan's Rev 4.0 bug-fix note and M8.4's acceptance criterion.
async function fetchCalendarGridLive(date: string): Promise<CalendarColumn[]> {
  return callRpc<CalendarColumn[]>('calendar_grid', { p_date: date })
}

export function useCalendarGrid(date: string) {
  return useQuery<CalendarColumn[], Error>({
    queryKey: ['calendar-grid', date],
    queryFn: () => (USE_MOCKS ? fetchCalendarGridMock(date) : fetchCalendarGridLive(date)),
    staleTime: 30_000,
    retry: 2,
  })
}

/** Optimistic reschedule — patches local cache immediately */
export function useOptimisticReschedule() {
  const qc = useQueryClient()

  function reschedule(
    date: string,
    appointmentId: string,
    newStylistId: string,
    offsetMinutes: number,
  ) {
    qc.setQueryData<CalendarColumn[]>(['calendar-grid', date], (old) => {
      if (!old) return old
      return old.map((col) => ({
        ...col,
        appointments: col.appointments.map((apt) => {
          if (apt.id !== appointmentId) return apt
          // Shift all segment times by the delta — keep as local "YYYY-MM-DDTHH:mm" strings
          return {
            ...apt,
            stylistId: newStylistId,
            segments: apt.segments.map((seg) => ({
              ...seg,
              startTime: shiftLocalTs(seg.startTime, offsetMinutes),
              endTime:   shiftLocalTs(seg.endTime,   offsetMinutes),
            })),
          }
        }),
      }))
    })
  }

  function revert(date: string) {
    qc.invalidateQueries({ queryKey: ['calendar-grid', date] })
  }

  return { reschedule, revert }
}

/**
 * Shift a local timestamp string "YYYY-MM-DDTHH:mm" by `minutes`.
 * We parse the string directly (no Date() → UTC conversion) to avoid
 * timezone bugs when the browser's local offset differs from UTC.
 */
export function shiftLocalTs(localTs: string, minutes: number): string {
  // Split into date and time parts
  const [datePart, timePart] = localTs.split('T')
  const [hStr, mStr] = timePart.split(':')
  const totalMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + minutes

  // Handle day overflow/underflow
  const [yStr, moStr, dStr] = datePart.split('-')
  let dayOffset = 0
  let clampedMins = totalMins
  if (totalMins < 0) {
    dayOffset = -1
    clampedMins = totalMins + 24 * 60
  } else if (totalMins >= 24 * 60) {
    dayOffset = 1
    clampedMins = totalMins - 24 * 60
  }

  const h = Math.floor(clampedMins / 60)
  const m = clampedMins % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeStr = `${pad(h)}:${pad(m)}`

  if (dayOffset === 0) {
    return `${datePart}T${timeStr}`
  }

  // Adjust the date for day boundary crossings
  const d = new Date(`${yStr}-${moStr}-${dStr}T12:00`)
  d.setDate(d.getDate() + dayOffset)
  const newDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${newDate}T${timeStr}`
}
