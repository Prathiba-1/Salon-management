import React, { useState } from 'react'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { DateNavigator } from '../components/DateNavigator'

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

export function CalendarPage() {
  const [date, setDate] = useState(toISO(new Date()))

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-[18px] font-medium text-slate-800">Calendar</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Drag appointments to reschedule · Click any slot to add
          </p>
        </div>
        <DateNavigator value={date} onChange={setDate} />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden flex">
        <CalendarGrid date={date} />
      </div>
    </div>
  )
}
