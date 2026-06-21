import React from 'react'
import { useUtilisationSnapshot } from '../hooks/useUtilisationSnapshot'
import { Skeleton } from './ui/Skeleton'
import { Badge } from './ui/Badge'

interface UtilisationSnapshotProps {
  date: string
}

function occupancyBarColor(rate: number) {
  if (rate >= 0.8) return 'bg-brand-blue'
  if (rate >= 0.5) return 'bg-brand-blue-mid'
  if (rate > 0) return 'bg-accent-amber-mid'
  return 'bg-slate-200'
}

function occupancyPillClass(rate: number) {
  if (rate >= 0.8) return 'bg-brand-blue text-white'
  if (rate >= 0.5) return 'bg-brand-blue-light text-brand-blue'
  if (rate > 0) return 'bg-accent-amber-light text-accent-amber'
  return 'bg-slate-100 text-slate-500'
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h${mm ? ` ${mm}m` : ''}`
}

export function UtilisationSnapshot({ date }: UtilisationSnapshotProps) {
  const { data, isLoading, isError, refetch } = useUtilisationSnapshot(date)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200/60 rounded-lg p-3 flex items-center gap-3">
            <Skeleton h={28} w="7" className="rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton h={11} w="2/5" />
              <Skeleton h={6} w="full" />
            </div>
            <Skeleton h={11} w="10" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-xs text-danger">Failed to load utilisation snapshot</p>
        <button onClick={() => refetch()} className="text-xs font-medium text-brand-blue hover:underline">
          Retry →
        </button>
      </div>
    )
  }

  const rows = data ?? []

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="text-3xl" aria-hidden="true">🪑</span>
        <p className="text-xs font-medium text-slate-600">No stylists to show</p>
        <p className="text-[11px] text-slate-400 max-w-[220px]">
          Add stylists and shifts to see today's utilisation here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list" aria-label="Stylist utilisation today">
      {rows.map((row) => (
        <div
          key={row.stylistId}
          role="listitem"
          className="bg-white border border-slate-200/60 rounded-lg p-3 flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-full bg-brand-blue text-white flex items-center justify-center text-[12px] font-medium flex-shrink-0 ring-1 ring-slate-50"
            aria-hidden="true"
          >
            {row.avatarInitials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{row.stylistName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatMinutes(row.bookedMin)} booked · {formatMinutes(row.shiftMin)} shift</p>
              </div>
              {row.hasShiftData ? (
                <span className={`text-[12px] font-semibold px-2 py-1 rounded-full ${occupancyPillClass(row.occupancyRate)} flex-shrink-0`}> 
                  {Math.round(row.occupancyRate * 100)}%
                </span>
              ) : (
                <Badge variant="gray" className="flex-shrink-0">No shift data</Badge>
              )}
            </div>

            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-3" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all duration-500 ${occupancyBarColor(row.occupancyRate)}`}
                style={{ width: `${Math.round(row.occupancyRate * 100)}%`, boxShadow: 'inset 0 -6px 18px rgba(0,0,0,0.04)' }}
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-medium text-slate-700">{row.bookingCount}</span>
            <span className="text-[11px] text-slate-400">bookings</span>
          </div>
        </div>
      ))}
    </div>
  )
}
