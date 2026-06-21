/** Start hour (07:00) and end hour (21:00) of the visible grid */
export const GRID_START_HOUR = 7
export const GRID_END_HOUR   = 21
export const TOTAL_MINUTES   = (GRID_END_HOUR - GRID_START_HOUR) * 60  // 840

/** Height of each 15-minute slot in pixels */
export const SLOT_HEIGHT_PX = 16   // 15 min = 16px → 1 hr = 64px

export const PIXELS_PER_MINUTE = SLOT_HEIGHT_PX / 15

/**
 * Parse a local timestamp string "YYYY-MM-DDTHH:mm" into { h, m }.
 * We split the string directly rather than using new Date(), which would
 * apply a timezone offset and give wrong hours.
 */
function parseLocalHM(localTs: string): { h: number; m: number } {
  // localTs = "2026-06-15T13:00" — take the HH:mm part directly
  const timePart = localTs.includes('T') ? localTs.split('T')[1] : localTs
  const [hStr, mStr] = timePart.split(':')
  return { h: parseInt(hStr, 10), m: parseInt(mStr, 10) }
}

/**
 * Convert a local timestamp string to pixels from the top of the grid.
 * String-parsed so timezone never interferes.
 */
export function isoToTop(localTs: string): number {
  const { h, m } = parseLocalHM(localTs)
  const minutesFromStart = (h - GRID_START_HOUR) * 60 + m
  return Math.max(0, minutesFromStart * PIXELS_PER_MINUTE)
}

/** Duration in pixels between two local timestamp strings */
export function isoToDuration(start: string, end: string): number {
  const s = parseLocalHM(start)
  const e = parseLocalHM(end)
  const startMins = s.h * 60 + s.m
  const endMins   = e.h * 60 + e.m
  const diff = endMins - startMins
  return Math.max(SLOT_HEIGHT_PX, diff * PIXELS_PER_MINUTE)
}

/** Snap a pixel offset to the nearest 15-min grid line */
export function snapToGrid(px: number): number {
  return Math.round(px / SLOT_HEIGHT_PX) * SLOT_HEIGHT_PX
}

/** Convert a top-px value back to an HH:mm string */
export function topToTime(px: number): string {
  const totalMins = px / PIXELS_PER_MINUTE + GRID_START_HOUR * 60
  const h = Math.floor(totalMins / 60)
  const m = Math.round(totalMins % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Generate time axis labels every 30 minutes */
export function getTimeLabels(): { label: string; top: number }[] {
  const labels: { label: string; top: number }[] = []
  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
    for (const min of [0, 30]) {
      if (hour === GRID_END_HOUR && min > 0) break
      const top = ((hour - GRID_START_HOUR) * 60 + min) * PIXELS_PER_MINUTE
      // hour === 0 → 12, hour === 12 → 12 (noon), hour > 12 → subtract 12
      const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const ampm = hour < 12 ? 'am' : 'pm'
      // Show am/pm only on the hour label; half-hour labels are unambiguous next to them
      labels.push({ label: min === 0 ? `${h}${ampm}` : `${h}:30`, top })
    }
  }
  return labels
}

/** Appointment status → Tailwind colour tokens */
export const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:     { bg: 'bg-accent-amber-light', border: 'border-accent-amber',   text: 'text-accent-amber' },
  CONFIRMED:   { bg: 'bg-brand-blue-light',   border: 'border-brand-blue-mid', text: 'text-brand-blue' },
  IN_PROGRESS: { bg: 'bg-brand-blue',         border: 'border-brand-blue',     text: 'text-white' },
  COMPLETE:    { bg: 'bg-success-bg',          border: 'border-success',        text: 'text-success' },
  CANCELLED:   { bg: 'bg-slate-100',           border: 'border-slate-200',      text: 'text-slate-400' },
}
