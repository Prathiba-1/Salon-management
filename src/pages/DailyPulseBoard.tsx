import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDailyPulse } from '../hooks/useDailyPulse'
import { MetricCard, BreakdownRow } from '../components/MetricCard'
import { ActionCentreSidebar } from '../components/ActionCentreSidebar'
import { DateNavigator } from '../components/DateNavigator'
import type { Appointment } from '../mocks/db'

import { callRpc, USE_MOCKS } from '../lib/supabaseClient'
import type { CalendarColumn } from '../hooks/useCalendarGrid'

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

function useAppointments(date: string) {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', date],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/appointments?date=${date}`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      // Bug fix: this hook previously always hit the mock endpoint
      // regardless of VITE_USE_MOCKS, so the Daily Pulse appointments list
      // silently came back empty once mocks were turned off. The live path
      // reuses calendar_grid (M8.4) — already returns each appointment with
      // its nested `customer` — and flattens the per-stylist grouping back
      // into a single list, matching the mock endpoint's flat shape.
      const columns = await callRpc<CalendarColumn[]>('calendar_grid', { p_date: date })
      return columns.flatMap((col) => col.appointments) as unknown as Appointment[]
    },
    staleTime: 30_000,
  })
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  PENDING:     { dot: 'bg-accent-amber',     label: 'Pending' },
  CONFIRMED:   { dot: 'bg-brand-blue-mid',   label: 'Confirmed' },
  IN_PROGRESS: { dot: 'bg-brand-blue',       label: 'In progress' },
  COMPLETE:    { dot: 'bg-green-400',        label: 'Complete' },
  CANCELLED:   { dot: 'bg-slate-300',        label: 'Cancelled' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function EmptyDayIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <span className="text-5xl" aria-hidden="true">✂️</span>
      <h3 className="text-sm font-medium text-slate-600">No bookings today</h3>
      <p className="text-xs text-slate-400 max-w-[220px]">
        Appointments will appear here once they're added to the calendar.
      </p>
    </div>
  )
}

export function DailyPulseBoard() {
  const [date, setDate] = useState(toISO(new Date()))
  const isHistorical = date < toISO(new Date())

  const { data, isLoading, isError, refetch } = useDailyPulse(date)
  const { data: appointments } = useAppointments(date)

  const hasBookings = (data?.appointments.total ?? 0) > 0

  // Flatten all appointments into a sorted list
  const aptList = (appointments ?? [])
    .filter(a => a.status !== 'CANCELLED')
    .map(a => ({
      ...a,
      startIso: a.segments[0]?.startTime ?? '',
      endIso:   a.segments[a.segments.length - 1]?.endTime ?? '',
    }))
    .sort((a, b) => a.startIso.localeCompare(b.startIso))

  return (
    <div className="flex h-full min-h-0">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="text-[18px] font-medium text-slate-800">Daily Pulse</h1>
            <p className="text-xs text-slate-400 mt-0.5">Revenue, occupancy, and live alerts</p>
          </div>
          <DateNavigator value={date} onChange={setDate} />
        </div>

        {/* ── Metric cards row ── */}
        <div className="grid grid-cols-3 gap-3 mb-6" aria-label="Key metrics">

          <MetricCard
            label="Total revenue"
            value={data?.revenue.total ?? null}
            format="currency"
            trend={12}
            badge={data ? `${Math.round((data.revenue.services / data.revenue.total) * 100)}% services` : undefined}
            loading={isLoading}
            error={isError}
            onRetry={refetch}
          >
            {data && (
              <div className="flex flex-col gap-1.5">
                <BreakdownRow label="Services" value={data.revenue.services} format="currency" share={data.revenue.services / data.revenue.total} />
                <BreakdownRow label="Retail"   value={data.revenue.retail}   format="currency" share={data.revenue.retail   / data.revenue.total} />
                <BreakdownRow label="Tips"     value={data.revenue.tips}     format="currency" share={data.revenue.tips     / data.revenue.total} />
              </div>
            )}
          </MetricCard>

          <MetricCard
            label="Chair occupancy"
            value={data?.occupancy.rate ?? null}
            format="percent"
            trend={5}
            loading={isLoading}
            error={isError}
            onRetry={refetch}
          >
            {data && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Booked</span>
                  <span className="font-medium text-slate-700">{data.occupancy.bookedMin} min</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Available</span>
                  <span className="font-medium text-slate-700">{data.occupancy.shiftMin} min</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1" aria-hidden="true">
                  <div className="h-full bg-brand-blue rounded-full transition-all duration-500" style={{ width: `${Math.round(data.occupancy.rate * 100)}%` }} />
                </div>
              </div>
            )}
          </MetricCard>

          <MetricCard
            label="Appointments"
            value={data?.appointments.total ?? null}
            format="number"
            trend={-2}
            loading={isLoading}
            error={isError}
            onRetry={refetch}
          >
            {data && (
              <div className="flex flex-col gap-1.5">
                <BreakdownRow label="Confirmed"   value={data.appointments.confirmed}  format="number" />
                <BreakdownRow label="Pending"     value={data.appointments.pending}    format="number" />
                <BreakdownRow label="In progress" value={data.appointments.inProgress} format="number" />
                <BreakdownRow label="Complete"    value={data.appointments.complete}   format="number" />
              </div>
            )}
          </MetricCard>
        </div>

        {/* ── Appointment list or empty state ── */}
        {!isLoading && !isError && !hasBookings && <EmptyDayIllustration />}

        {!isLoading && !isError && hasBookings && aptList.length > 0 && (
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-3">Today's appointments</h2>
            <div className="flex flex-col divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
              {aptList.map((apt) => {
                const st = STATUS_STYLES[apt.status] ?? STATUS_STYLES.CONFIRMED
                const serviceNames = [...new Set(apt.segments.filter(s => s.type === 'BUSY').map(s => s.serviceStep).filter(Boolean))]
                return (
                  <div key={apt.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Time */}
                    <div className="w-[72px] flex-shrink-0 text-[11px] text-slate-500 font-medium">
                      {apt.startIso ? fmtTime(apt.startIso) : '—'}
                      <span className="block text-slate-400 font-normal">{apt.endIso ? fmtTime(apt.endIso) : ''}</span>
                    </div>
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} aria-label={st.label} />
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">
                        {(apt as any).customer?.name ?? apt.customerId}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {serviceNames.length ? serviceNames.join(' · ') : 'Service'}
                      </p>
                    </div>
                    {/* Status pill */}
                    <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">{st.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isHistorical && (
          <p className="text-[11px] text-slate-400 text-center mt-4">
            Showing historical data — actions are read-only
          </p>
        )}
      </div>

      {/* ── Action centre sidebar ── */}
      <ActionCentreSidebar isHistorical={isHistorical} />
    </div>
  )
}
