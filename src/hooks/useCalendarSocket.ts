import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CalendarColumn } from './useCalendarGrid'
import type { AppointmentStatus } from '../mocks/db'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'

const STATUS_CYCLE: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETE']

/**
 * M3.6 mock path: simulates a WebSocket firing `appointment.updated` every 30s.
 * M9.1/M10.4 live path: a real Supabase Realtime `postgres_changes`
 * subscription on the Appointment table, scoped by RLS exactly as
 * documented in 0010_realtime_replication.sql — a given client only
 * receives events for rows it could SELECT under its own role's policy.
 */
export function useCalendarSocket(date: string, onFlash: (appointmentId: string) => void) {
  const qc = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!USE_MOCKS) return  // real path is the separate effect below

    timerRef.current = setInterval(() => {
      const cols = qc.getQueryData<CalendarColumn[]>(['calendar-grid', date])
      if (!cols) return

      const allApts = cols.flatMap((c) => c.appointments)
      if (!allApts.length) return

      const apt = allApts[Math.floor(Math.random() * allApts.length)]
      const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(apt.status) + 1) % STATUS_CYCLE.length]

      console.log('[WS Mock] appointment.updated', apt.id, '->', nextStatus)

      qc.setQueryData<CalendarColumn[]>(['calendar-grid', date], (old) => {
        if (!old) return old
        return old.map((col) => ({
          ...col,
          appointments: col.appointments.map((a) =>
            a.id === apt.id
              ? { ...a, status: nextStatus, segments: a.segments.map((s) => ({ ...s, status: nextStatus })) }
              : a,
          ),
        }))
      })

      onFlash(apt.id)
    }, 30_000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [date, qc, onFlash])

  useEffect(() => {
    if (USE_MOCKS) return  // mock path is the separate effect above

    const channel = supabase
      .channel(`calendar-grid-watch:${date}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Appointment', filter: `date=eq.${date}` },
        (payload) => {
          const updated = payload.new as { id: string; status: AppointmentStatus }
          console.log('[Realtime] Appointment.updated', updated.id, '->', updated.status)

          qc.setQueryData<CalendarColumn[]>(['calendar-grid', date], (old) => {
            if (!old) return old
            return old.map((col) => ({
              ...col,
              appointments: col.appointments.map((a) =>
                a.id === updated.id ? { ...a, status: updated.status } : a,
              ),
            }))
          })

          onFlash(updated.id)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [date, qc, onFlash])
}
