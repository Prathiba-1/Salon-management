import React, { useState } from 'react'

type Preset = 'today' | 'yesterday' | 'custom'

interface DateNavigatorProps {
  value: string           // YYYY-MM-DD
  onChange: (date: string) => void
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

function diffDays(a: string, b: string) {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000)
}

function formatDisplay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const TODAY = toISO(new Date())
const YESTERDAY = addDays(TODAY, -1)

export function DateNavigator({ value, onChange }: DateNavigatorProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [customInput, setCustomInput] = useState(value)
  const [rangeError, setRangeError] = useState<string | null>(null)

  function getPreset(): Preset {
    if (value === TODAY) return 'today'
    if (value === YESTERDAY) return 'yesterday'
    return 'custom'
  }

  function selectPreset(preset: Preset) {
    setRangeError(null)
    if (preset === 'today') { onChange(TODAY); setShowPicker(false) }
    if (preset === 'yesterday') { onChange(YESTERDAY); setShowPicker(false) }
    if (preset === 'custom') setShowPicker(true)
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setCustomInput(raw)
    if (!raw) return

    const diff = diffDays(raw, TODAY)
    if (diff > 90) {
      setRangeError('Custom range cannot exceed 90 days from today')
      return
    }
    setRangeError(null)
    onChange(raw)
  }

  const preset = getPreset()

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Date navigator">
      {/* Preset buttons */}
      {(['today', 'yesterday', 'custom'] as Preset[]).map((p) => (
        <button
          key={p}
          onClick={() => selectPreset(p)}
          aria-pressed={preset === p}
          className={[
            'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors capitalize',
            preset === p
              ? 'bg-brand-blue text-white border-transparent'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
          ].join(' ')}
        >
          {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : 'Custom'}
        </button>
      ))}

      {/* Date label */}
      <span className="text-xs text-slate-500 pl-1" aria-live="polite">
        {formatDisplay(value)}
      </span>

      {/* Prev / Next arrows */}
      <div className="flex items-center gap-0.5 ml-auto">
        <button
          onClick={() => onChange(addDays(value, -1))}
          aria-label="Previous day"
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          ‹
        </button>
        <button
          onClick={() => onChange(addDays(value, 1))}
          disabled={value >= TODAY}
          aria-label="Next day"
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
      </div>

      {/* Custom date picker */}
      {showPicker && (
        <div className="w-full flex flex-col gap-1 mt-1">
          <input
            type="date"
            value={customInput}
            max={TODAY}
            onChange={handleCustomChange}
            aria-label="Pick a custom date"
            aria-describedby={rangeError ? 'date-range-error' : undefined}
            className="w-44 text-xs border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {rangeError && (
            <p id="date-range-error" role="alert" className="text-[11px] text-danger">
              {rangeError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
