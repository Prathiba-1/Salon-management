import React, { useEffect, useRef } from 'react'
import type { Appointment, Segment } from '../../mocks/db'
import { isoToTop, isoToDuration, STATUS_COLORS } from './calendarUtils'

interface Customer { id: string; name: string; isVIP: boolean }

interface AppointmentBlockProps {
  appointment: Appointment & { customer?: Customer }
  columnWidth: number
  flashing: boolean
  // Now receives the MouseEvent so callers can call stopPropagation
  onClick: (e: React.MouseEvent) => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}

function SegmentBlock({
  segment,
  wrapperTop,
  customer,
  isFirst,
  isLast,
  columnWidth,
  appointmentStatus,
}: {
  segment: Segment
  wrapperTop: number
  customer?: Customer
  isFirst: boolean
  isLast: boolean
  columnWidth: number
  appointmentStatus?: string
}) {
  const segTop    = isoToTop(segment.startTime) - wrapperTop
  const segHeight = isoToDuration(segment.startTime, segment.endTime)
  const isFree    = segment.type === 'FREE'
  // Use the appointment-level status for colour so that status updates from
  // the detail panel (which patch appointment.status but not segment.status)
  // are reflected immediately on the block.
  const effectiveStatus = isFree ? segment.status : (appointmentStatus ?? segment.status)
  const colors    = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.CONFIRMED
  const narrow    = columnWidth < 150

  return (
    <div
      style={{ position: 'absolute', top: segTop, height: segHeight, left: 2, right: 2 }}
      className={[
        'rounded overflow-hidden border-l-2 select-none',
        isFree
          ? 'border-slate-300 bg-slate-50/80'
          : `${colors.bg} ${colors.border}`,
      ].join(' ')}
      aria-label={`${isFree ? 'Open' : 'Busy'}: ${segment.serviceStep ?? ''}`}
    >
      {isFree && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #94a3b8 0, #94a3b8 1px, transparent 0, transparent 50%)',
            backgroundSize: '6px 6px',
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          'relative h-full px-1.5 py-1 flex flex-col justify-start gap-0.5 overflow-hidden',
          isFree ? 'text-slate-400' : colors.text,
        ].join(' ')}
      >
        {isFree ? (
          <span className="text-[9px] font-medium leading-tight">Open</span>
        ) : (
          <>
            {isFirst && customer && !narrow && (
              <span className="text-[10px] font-semibold leading-tight truncate">
                {customer.name}
                {customer.isVIP && (
                  <span className="ml-1 text-[9px]" aria-label="VIP">⭐</span>
                )}
              </span>
            )}
            {segment.serviceStep && (
              <span className="text-[9px] leading-tight truncate opacity-80">
                {segment.serviceStep}
              </span>
            )}
          </>
        )}
      </div>

      {!isLast && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-brand-blue-mid z-10"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export function AppointmentBlock({
  appointment,
  columnWidth,
  flashing,
  onClick,
  dragHandleProps = {},
  isDragging = false,
}: AppointmentBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!flashing || !blockRef.current) return
    blockRef.current.classList.add('animate-pulse')
    const t = setTimeout(() => blockRef.current?.classList.remove('animate-pulse'), 1200)
    return () => clearTimeout(t)
  }, [flashing])

  if (!appointment.segments.length) return null

  const firstSeg = appointment.segments[0]
  const lastSeg  = appointment.segments[appointment.segments.length - 1]

  const wrapTop    = isoToTop(firstSeg.startTime)
  const wrapHeight = isoToTop(lastSeg.endTime) - wrapTop

  return (
    <div
      ref={blockRef}
      role="button"
      tabIndex={0}
      aria-label={`Appointment for ${appointment.customer?.name ?? 'client'}`}
      style={{
        position: 'absolute',
        top: wrapTop,
        height: wrapHeight,
        left: 2,
        right: 2,
        zIndex: isDragging ? 50 : 10,
      }}
      className={[
        'cursor-pointer outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1',
        isDragging ? 'opacity-70 shadow-xl' : '',
      ].join(' ')}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          // For keyboard activation, create a synthetic stop — grid won't
          // receive a real click event from keyboard so no extra guard needed.
          onClick(e as unknown as React.MouseEvent)
        }
      }}
      {...dragHandleProps}
    >
      {appointment.segments.map((seg, i) => (
        <SegmentBlock
          key={seg.id}
          segment={seg}
          wrapperTop={wrapTop}
          customer={appointment.customer}
          isFirst={i === 0}
          isLast={i === appointment.segments.length - 1}
          columnWidth={columnWidth}
          appointmentStatus={appointment.status}
        />
      ))}
    </div>
  )
}
