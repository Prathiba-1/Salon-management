import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { CalendarColumn } from '../../hooks/useCalendarGrid'
import { AppointmentBlock } from './AppointmentBlock'
import { TOTAL_MINUTES, PIXELS_PER_MINUTE, GRID_START_HOUR, SLOT_HEIGHT_PX } from './calendarUtils'

interface StylistColumnProps {
  column: CalendarColumn
  columnWidth: number
  flashingIds: Set<string>
  onAppointmentClick: (apt: CalendarColumn['appointments'][number]) => void
  onSlotClick: (stylistId: string, stylistName: string, time: string) => void
  date: string
}

export function StylistColumn({
  column,
  columnWidth,
  flashingIds,
  onAppointmentClick,
  onSlotClick,
  date,
}: StylistColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stylist.id })

  const totalHeight = TOTAL_MINUTES * PIXELS_PER_MINUTE

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only open QuickAdd when clicking the bare grid — not on appointment blocks.
    // AppointmentBlock passes its MouseEvent up; we check if the click target
    // (or any ancestor up to this element) has role="button", which AppointmentBlock sets.
    const target = e.target as HTMLElement
    if (target.closest('[role="button"]')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const rawY = e.clientY - rect.top
    // Snap to 15-min grid
    const snappedY = Math.floor(rawY / SLOT_HEIGHT_PX) * SLOT_HEIGHT_PX
    const totalMins = snappedY / PIXELS_PER_MINUTE
    const hour = Math.floor(totalMins / 60) + GRID_START_HOUR
    const min  = Math.round(totalMins % 60)
    const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    onSlotClick(column.stylist.id, column.stylist.name, time)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ width: columnWidth, minWidth: columnWidth, height: totalHeight }}
      className={[
        'relative border-r border-slate-100 flex-shrink-0 cursor-cell',
        isOver ? 'bg-brand-blue-light/30' : '',
      ].join(' ')}
      onClick={handleGridClick}
      aria-label={`${column.stylist.name}'s schedule column`}
    >
      {/* 30-min horizontal gridlines */}
      {Array.from({ length: (TOTAL_MINUTES / 30) + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-slate-100"
          style={{ top: i * 30 * PIXELS_PER_MINUTE }}
          aria-hidden="true"
        />
      ))}

      {/* 60-min darker gridlines */}
      {Array.from({ length: 15 }, (_, i) => (
        <div
          key={`hr-${i}`}
          className="absolute left-0 right-0 border-t border-slate-200"
          style={{ top: i * 60 * PIXELS_PER_MINUTE }}
          aria-hidden="true"
        />
      ))}

      {/* Drop zone highlight */}
      {isOver && (
        <div
          className="absolute inset-0 border-2 border-brand-blue border-dashed rounded pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Appointments */}
      {column.appointments.map((apt) => (
        <AppointmentBlock
          key={apt.id}
          appointment={apt}
          columnWidth={columnWidth}
          flashing={flashingIds.has(apt.id)}
          onClick={(e) => {
            // Stop the click from bubbling to the grid's handleGridClick
            e.stopPropagation()
            onAppointmentClick(apt)
          }}
        />
      ))}
    </div>
  )
}
