import React from 'react'
import { SlideOver } from '../ui/SlideOver'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Appointment, AppointmentStatus } from '../../mocks/db'
import { STATUS_COLORS } from './calendarUtils'
import { callRpc, USE_MOCKS } from '../../lib/supabaseClient'

interface Customer { id: string; name: string; isVIP: boolean; formulaNotes?: FormulaNote[] }
interface FormulaNote { id: string; serviceType: string; note: string; createdAt: string }

interface AppointmentDetailPanelProps {
  appointment: (Appointment & { customer?: Customer; stylist?: { name: string } }) | null
  date: string
  onClose: () => void
}

const STATUS_TRANSITIONS: Record<AppointmentStatus, { label: string; next: AppointmentStatus }[]> = {
  PENDING:     [{ label: 'Confirm',         next: 'CONFIRMED'  }, { label: 'Cancel', next: 'CANCELLED' }],
  CONFIRMED:   [{ label: 'Mark In-Progress',next: 'IN_PROGRESS'}, { label: 'Cancel', next: 'CANCELLED' }],
  IN_PROGRESS: [{ label: 'Mark Complete',   next: 'COMPLETE'   }],
  COMPLETE:    [],
  CANCELLED:   [],
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

async function patchStatusMock(id: string, status: AppointmentStatus) {
  const res = await fetch(`/api/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Status update failed')
  return res.json()
}

// M10.3 — calls the M8.2 update_appointment_status RPC. Per the bug-fix note
// in the implementation plan, this patches Appointment.status only (not
// individual segment statuses) — AppointmentBlock derives BUSY-segment
// colour from appointment.status specifically because of this, so the
// "mark complete doesn't change colour" bug stays fixed against the live backend too.
async function patchStatusLive(id: string, status: AppointmentStatus) {
  return callRpc('update_appointment_status', { p_appointment_id: id, p_status: status })
}

async function patchStatus(id: string, status: AppointmentStatus) {
  return USE_MOCKS ? patchStatusMock(id, status) : patchStatusLive(id, status)
}

export function AppointmentDetailPanel({ appointment, date, onClose }: AppointmentDetailPanelProps) {
  const { toast } = useToast()
  const qc = useQueryClient()

  // Track the live appointment id so we can pull updated data from the cache
  // after a status mutation, without requiring the parent to re-pass the prop.
  const [liveStatus, setLiveStatus] = React.useState<AppointmentStatus | null>(null)

  // Reset tracked status whenever a new appointment is opened
  React.useEffect(() => { setLiveStatus(null) }, [appointment?.id])

  const apt = appointment ? { ...appointment, status: liveStatus ?? appointment.status } : null

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => patchStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['calendar-grid', date] })
      const prev = qc.getQueryData(['calendar-grid', date])
      qc.setQueryData(['calendar-grid', date], (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((col: { appointments: Appointment[] }) => ({
          ...col,
          appointments: col.appointments.map((a: Appointment) =>
            a.id === id ? { ...a, status } : a,
          ),
        }))
      })
      return { prev }
    },
    onSuccess: (_, { status }) => {
      setLiveStatus(status)
      toast(`Status updated to ${status.replace('_', ' ').toLowerCase()}`, 'success')
    },
    onError: (_err, _vars, ctx: unknown) => {
      const c = ctx as { prev?: unknown }
      if (c?.prev) qc.setQueryData(['calendar-grid', date], c.prev)
      toast('Failed to update status', 'danger')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['calendar-grid', date] }),
  })

  const transitions = apt ? (STATUS_TRANSITIONS[apt.status] ?? []) : []
  const colors = apt ? (STATUS_COLORS[apt.status] ?? STATUS_COLORS.CONFIRMED) : STATUS_COLORS.CONFIRMED
  const relevantNotes = apt?.customer?.formulaNotes?.slice(0, 5) ?? []

  return (
    <SlideOver open={!!apt} onClose={onClose} title="Appointment details" width={340}>
      {apt ? (
        <div className="flex flex-col gap-5">

          {/* Client header */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-medium flex-shrink-0">
              {apt.customer?.name?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium text-slate-800 truncate">
                  {apt.customer?.name ?? 'Unknown client'}
                </h3>
                {apt.customer?.isVIP && <Badge variant="amber" dot>VIP</Badge>}
              </div>
              {apt.stylist && (
                <p className="text-xs text-slate-500 mt-0.5">with {apt.stylist.name}</p>
              )}
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {apt.status.replace('_', ' ')}
            </span>
          </div>

          {/* Segment timeline */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Timeline
            </p>
            <ol className="relative border-l border-slate-200 ml-3 flex flex-col gap-4">
              {apt.segments.map((seg, i) => (
                <li key={seg.id} className="ml-4">
                  <span
                    className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${seg.type === 'FREE' ? 'bg-slate-300' : 'bg-brand-blue-mid'}`}
                    aria-hidden="true"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {seg.serviceStep ?? (seg.type === 'FREE' ? 'Free (double-book open)' : `Step ${i + 1}`)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatTime(seg.startTime)} – {formatTime(seg.endTime)}
                      </p>
                    </div>
                    <Badge variant={seg.type === 'FREE' ? 'gray' : 'blue'}>
                      {seg.type === 'FREE' ? 'Open' : seg.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Formula notes */}
          {relevantNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Formula notes
              </p>
              <div className="flex flex-col gap-2">
                {relevantNotes.map((note) => (
                  <div key={note.id} className="bg-slate-50 rounded-md p-2.5">
                    <p className="text-[10px] font-medium text-slate-500 mb-0.5">{note.serviceType}</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status actions */}
          {transitions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Actions
              </p>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t.next}
                    variant={t.next === 'CANCELLED' ? 'danger' : 'primary'}
                    size="sm"
                    loading={isPending}
                    onClick={() => updateStatus({ id: apt.id, status: t.next })}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}
    </SlideOver>
  )
}
