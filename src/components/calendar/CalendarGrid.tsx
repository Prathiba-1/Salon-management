import React, { useCallback, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { CalendarColumn } from '../../hooks/useCalendarGrid'
import { useCalendarGrid, useOptimisticReschedule, shiftLocalTs } from '../../hooks/useCalendarGrid'
import { useCalendarSocket } from '../../hooks/useCalendarSocket'
import { AppointmentBlock } from './AppointmentBlock'
import { AppointmentDetailPanel } from './AppointmentDetailPanel'
import { QuickAddModal } from './QuickAddModal'
import { StylistColumn } from './StylistColumn'
import { Skeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import {
  getTimeLabels,
  TOTAL_MINUTES,
  PIXELS_PER_MINUTE,
  isoToTop,
} from './calendarUtils'
import type { Appointment } from '../../mocks/db'
import { callRpc, USE_MOCKS } from '../../lib/supabaseClient'
import { usePresenceLock } from '../../hooks/usePresenceLock'
import { useAuth } from '../../hooks/useAuth'

const TIME_AXIS_WIDTH = 52
const COLUMN_WIDTH    = 180

interface CalendarGridProps {
  date: string
}

interface SlotInfo {
  stylistId: string
  stylistName: string
  startTime: string
  date: string
}

export function CalendarGrid({ date }: CalendarGridProps) {
  const { data: columns, isLoading, isError, refetch } = useCalendarGrid(date)
  const { reschedule, revert } = useOptimisticReschedule()
  const { toast } = useToast()
  const { user } = useAuth()
  const { lockSlot, unlockSlot, isLocked } = usePresenceLock(user?.salonId ?? '')

  const [selectedApt, setSelectedApt] = useState<CalendarColumn['appointments'][number] | null>(null)
  const [quickAddSlot, setQuickAddSlot] = useState<SlotInfo | null>(null)
  const [draggingApt, setDraggingApt] = useState<Appointment | null>(null)
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set())

  const scrollRef = useRef<HTMLDivElement>(null)
  const totalHeight = TOTAL_MINUTES * PIXELS_PER_MINUTE

  // Flash handler for WS updates
  const onFlash = useCallback((id: string) => {
    setFlashingIds((prev) => new Set(prev).add(id))
    setTimeout(() => setFlashingIds((prev) => {
      const next = new Set(prev); next.delete(id); return next
    }), 1500)
  }, [])

  useCalendarSocket(date, onFlash)

  // DnD sensors — supports pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const apt = columns?.flatMap((c) => c.appointments).find((a) => a.id === active.id)
    if (apt) {
      setDraggingApt(apt)
      const slotId = `${apt.stylistId}:${apt.segments[0]?.startTime}`
      void lockSlot(slotId)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingApt(null)
    void unlockSlot()
    const { active, over, delta } = event
    if (!over || !columns) return

    const apt = columns.flatMap((c) => c.appointments).find((a) => a.id === active.id)
    if (!apt) return

    const newStylistId = over.id as string
    const offsetPx     = delta.y
    const offsetMins   = Math.round(offsetPx / PIXELS_PER_MINUTE / 15) * 15

    // Check if dropping onto a BUSY block
    const targetCol  = columns.find((c) => c.stylist.id === newStylistId)
    const isDroppingOnBusy = targetCol?.appointments
      .filter((a) => a.id !== apt.id)
      .flatMap((a) => a.segments)
      .filter((s) => s.type === 'BUSY')
      .some((s) => {
        const newStart = new Date(apt.segments[0].startTime).getTime() + offsetMins * 60_000
        const newEnd   = new Date(apt.segments[apt.segments.length - 1].endTime).getTime() + offsetMins * 60_000
        return new Date(s.startTime).getTime() < newEnd && new Date(s.endTime).getTime() > newStart
      })

    if (isDroppingOnBusy) {
      toast('Cannot drop onto a booked segment', 'danger')
      return
    }

    // Optimistic update
    reschedule(date, apt.id, newStylistId, offsetMins)

    try {
      if (USE_MOCKS) {
        const res = await fetch(`/api/appointments/${apt.id}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stylistId: newStylistId, offsetMinutes: offsetMins }),
        })
        if (!res.ok) throw new Error('Reschedule failed')
      } else {
        // M10.4 — live path calls the M8.2 reschedule_appointment RPC. Server
        // re-validates the same overlap check via the M7.2 EXCLUDE constraint
        // — this is the actual authority, not the client-side isDroppingOnBusy
        // check above, which is only a fast-path UX guard. A concurrent
        // conflicting write from another client (missed by Presence, e.g. a
        // stale/disconnected lock) is still caught here and surfaces as a
        // SEGMENT_CONFLICT error, reverting the optimistic update below.
        const shiftedSegments = apt.segments.map((s) => ({
          id: s.id,
          startTime: shiftLocalTs(s.startTime, offsetMins),
          endTime: shiftLocalTs(s.endTime, offsetMins),
        }))
        await callRpc('reschedule_appointment', {
          payload: { appointmentId: apt.id, stylistId: newStylistId, segments: shiftedSegments },
        })
      }
      toast('Appointment rescheduled', 'success')
    } catch (err) {
      revert(date)
      const message = err instanceof Error && err.message.includes('SEGMENT_CONFLICT')
        ? 'Slot unavailable — someone just booked this time'
        : 'Reschedule failed — reverted'
      toast(message, 'danger')
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-2 p-4 overflow-hidden">
        <div style={{ width: TIME_AXIS_WIDTH }} className="flex-shrink-0">
          <div className="flex flex-col gap-8 pt-10">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={10} w="full" />)}
          </div>
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ width: COLUMN_WIDTH }} className="flex flex-col gap-2">
            <Skeleton h={28} className="rounded-md" />
            <Skeleton h={80} className="rounded-md" />
            <Skeleton h={60} className="rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-sm text-slate-500">Failed to load calendar</p>
        <button onClick={() => refetch()} className="text-xs font-medium text-brand-blue hover:underline">
          Retry
        </button>
      </div>
    )
  }

  if (!columns?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
        <span className="text-4xl" aria-hidden="true">📅</span>
        <p className="text-sm font-medium text-slate-600">No stylists on shift today</p>
      </div>
    )
  }

  const timeLabels = getTimeLabels()
  const showScrollHint = columns.length > 8

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 8+ columns scroll indicator */}
      {showScrollHint && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-accent-amber-light border-b border-accent-amber/20">
          <span className="text-[11px] font-medium text-accent-amber">
            ← Scroll to see all {columns.length} stylists →
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex overflow-x-auto overflow-y-auto w-full"
        style={{ maxHeight: 'calc(100vh - 220px)' }}
        role="region"
        aria-label="Calendar grid"
      >
        {/* Time axis — sticky left */}
        <div
          className="flex-shrink-0 sticky left-0 z-20 bg-white border-r border-slate-200"
          style={{ width: TIME_AXIS_WIDTH }}
          aria-hidden="true"
        >
          {/* Header spacer */}
          <div className="h-12 border-b border-slate-200" />
          {/* Time labels */}
          <div className="relative" style={{ height: totalHeight }}>
            {timeLabels.map(({ label, top }) => (
              <div
                key={label}
                className="absolute right-2 text-[10px] text-slate-400 -translate-y-1/2"
                style={{ top }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Stylist columns — each grows to fill leftover width (so few
            stylists don't leave a blank gap on the right) but never
            shrinks below COLUMN_WIDTH (so many stylists trigger horizontal
            scroll on the outer wrapper instead of squashing illegibly). */}
        <div className="flex flex-1 min-w-fit">
          {columns.map((col) => (
            <div key={col.stylist.id} style={{ flex: `1 1 ${COLUMN_WIDTH}px`, minWidth: COLUMN_WIDTH }}>
              {/* Column header */}
              <div
                className="h-12 flex items-center gap-2 px-3 border-b border-r border-slate-200 sticky top-0 bg-white z-10"
              >
                <div className="w-7 h-7 rounded-full bg-brand-blue text-white text-[11px] font-medium flex items-center justify-center flex-shrink-0">
                  {col.stylist.avatarInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{col.stylist.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{col.stylist.role.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Column body */}
              <StylistColumn
                column={col}
                columnWidth={COLUMN_WIDTH}
                flashingIds={flashingIds}
                date={date}
                onAppointmentClick={(apt) => setSelectedApt(apt)}
                onSlotClick={(stylistId, stylistName, time) =>
                  setQuickAddSlot({ stylistId, stylistName, startTime: time, date })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggingApt && (
          <div
            style={{ width: COLUMN_WIDTH - 4, opacity: 0.85 }}
            className="bg-brand-blue-light border-2 border-brand-blue rounded shadow-xl p-2 text-xs font-medium text-brand-blue pointer-events-none"
          >
            Moving appointment…
          </div>
        )}
      </DragOverlay>

      {/* Detail panel */}
      <AppointmentDetailPanel
        appointment={selectedApt}
        date={date}
        onClose={() => setSelectedApt(null)}
      />

      {/* Quick add modal */}
      <QuickAddModal
        slot={quickAddSlot}
        onClose={() => setQuickAddSlot(null)}
      />
    </DndContext>
  )
}
