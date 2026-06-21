import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Stylist } from '../../mocks/db'
import { callRpc, supabase, USE_MOCKS } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth'

interface SlotInfo {
  stylistId: string
  stylistName: string
  startTime: string   // HH:mm
  date: string        // YYYY-MM-DD
}

interface QuickAddModalProps {
  slot: SlotInfo | null
  onClose: () => void
}

interface CustomerResult { id: string; name: string; isVIP: boolean; phone: string }

interface ServiceTemplate {
  id: string
  name: string
  durationMinutes: number
  segmentCount: number
  segments: { step: string; durationMinutes: number; type: 'BUSY' | 'FREE' }[]
}

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: 'svc_01', name: 'Balayage', durationMinutes: 150, segmentCount: 3,
    segments: [
      { step: 'Consultation', durationMinutes: 30,  type: 'BUSY' },
      { step: 'Processing',   durationMinutes: 60,  type: 'FREE' },
      { step: 'Finishing',    durationMinutes: 60,  type: 'BUSY' },
    ],
  },
  {
    id: 'svc_02', name: 'Cut & Blow-dry', durationMinutes: 60, segmentCount: 1,
    segments: [{ step: 'Cut & Blow-dry', durationMinutes: 60, type: 'BUSY' }],
  },
  {
    id: 'svc_03', name: 'Global Colour', durationMinutes: 90, segmentCount: 2,
    segments: [
      { step: 'Application', durationMinutes: 30, type: 'BUSY' },
      { step: 'Processing',  durationMinutes: 60, type: 'FREE' },
    ],
  },
  {
    id: 'svc_04', name: 'Keratin Treatment', durationMinutes: 180, segmentCount: 2,
    segments: [
      { step: 'Application', durationMinutes: 60,  type: 'BUSY' },
      { step: 'Processing',  durationMinutes: 120, type: 'FREE' },
    ],
  },
  {
    id: 'svc_05', name: 'Highlights', durationMinutes: 120, segmentCount: 2,
    segments: [
      { step: 'Foiling',    durationMinutes: 60, type: 'BUSY' },
      { step: 'Processing', durationMinutes: 60, type: 'FREE' },
    ],
  },
]

// ─── Pure local-time helpers (no Date(), no UTC) ──────────────────────────────

/** "HH:mm" → total minutes from midnight */
function hmToMins(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

/** total minutes from midnight → "HH:mm" */
function minsToHm(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Format "HH:mm" as "12:30 pm" */
function fmtHm(hm: string): string {
  const [h, m] = hm.split(':').map(Number)
  const period = h < 12 ? 'am' : 'pm'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

/** Build a local timestamp string "YYYY-MM-DDTHH:mm" */
function localTs(date: string, hm: string): string {
  return `${date}T${hm}`
}

// ─── Segment builder ──────────────────────────────────────────────────────────

interface BuiltSegment {
  id: string
  appointmentId: string
  type: 'BUSY' | 'FREE'
  startTime: string
  endTime: string
  status: 'PENDING'
  serviceStep: string
  startHm: string
  endHm: string
}

function buildSegments(date: string, startHm: string, service: ServiceTemplate): BuiltSegment[] {
  let cursorMins = hmToMins(startHm)
  return service.segments.map((tmpl, i) => {
    const startMins = cursorMins
    const endMins   = cursorMins + tmpl.durationMinutes
    cursorMins = endMins
    const startHmStr = minsToHm(startMins)
    const endHmStr   = minsToHm(endMins)
    return {
      id:            `new_seg_${i}`,
      appointmentId: 'new',
      type:          tmpl.type,
      startTime:     localTs(date, startHmStr),
      endTime:       localTs(date, endHmStr),
      status:        'PENDING',
      serviceStep:   tmpl.step,
      startHm:       startHmStr,
      endHm:         endHmStr,
    }
  })
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function searchCustomers(q: string): Promise<CustomerResult[]> {
  if (q.length < 2) return []
  if (USE_MOCKS) {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    return res.json()
  }
  // Bug fix: this previously always hit the mock endpoint regardless of
  // VITE_USE_MOCKS, so client search always came back empty ("no customer
  // found") once mocks were off. RLS (customer_select_owner) already scopes
  // this to the caller's own salon — no salonId filter needed client-side.
  const { data, error } = await supabase
    .from('Customer')
    .select('id, name, isVIP, phone')
    .ilike('name', `%${q}%`)
    .limit(10)
  if (error) return []
  return (data ?? []) as CustomerResult[]
}

async function createAppointment(body: Record<string, unknown>, salonId: string) {
  if (USE_MOCKS) {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 409) throw new Error('CONFLICT')
    if (!res.ok) throw new Error('Failed to create appointment')
    return res.json()
  }
  // Live path: M8.2's create_appointment RPC. Conflict detection is the
  // M7.2 EXCLUDE constraint, surfaced here as a SEGMENT_CONFLICT error.
  try {
    return await callRpc('create_appointment', { payload: { ...body, salonId } })
  } catch (err) {
    if (err instanceof Error && err.message.includes('SEGMENT_CONFLICT')) {
      throw new Error('CONFLICT')
    }
    throw err
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickAddModal({ slot, onClose }: QuickAddModalProps) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [customerQuery, setCustomerQuery]     = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null)
  const [selectedService, setSelectedService]   = useState<ServiceTemplate | null>(null)
  const [showDropdown, setShowDropdown]         = useState(false)
  const [conflict, setConflict]                 = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(customerQuery), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [customerQuery])

  const { data: customerResults = [] } = useQuery({
    queryKey: ['customer-search', debouncedQuery],
    queryFn: () => searchCustomers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  // Conflict check — all comparisons are plain "YYYY-MM-DDTHH:mm" string comparisons
  const segments = slot && selectedService
    ? buildSegments(slot.date, slot.startTime, selectedService)
    : []

  useEffect(() => {
    if (!slot || !selectedService || !segments.length) { setConflict(false); return }

    const cols = qc.getQueryData<{
      stylist: Stylist
      appointments: { segments: { type: string; startTime: string; endTime: string }[] }[]
    }[]>(['calendar-grid', slot.date])

    if (!cols) { setConflict(false); return }

    const col = cols.find((c) => c.stylist.id === slot.stylistId)
    if (!col) { setConflict(false); return }

    const busyExisting = col.appointments
      .flatMap((a) => a.segments)
      .filter((s) => s.type === 'BUSY')

    const busyNew = segments.filter((s) => s.type === 'BUSY')

    // String comparison works because format is "YYYY-MM-DDTHH:mm" — lexicographic = chronological
    const hasConflict = busyNew.some((newSeg) =>
      busyExisting.some(
        (ex) => ex.startTime < newSeg.endTime && ex.endTime > newSeg.startTime,
      ),
    )
    setConflict(hasConflict)
  }, [selectedService, slot, segments, qc])

  const { mutate: save, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) => createAppointment(body, user?.salonId ?? ''),
    onSuccess: () => {
      toast('Appointment created', 'success')
      qc.invalidateQueries({ queryKey: ['calendar-grid', slot?.date] })
      handleClose()
    },
    onError: (err: Error) => {
      toast(err.message === 'CONFLICT' ? 'Slot already booked' : 'Failed to create appointment', 'danger')
    },
  })

  function handleClose() {
    setCustomerQuery('')
    setSelectedCustomer(null)
    setSelectedService(null)
    setShowDropdown(false)
    setConflict(false)
    onClose()
  }

  function handleSave() {
    if (!slot || !selectedCustomer || !selectedService || conflict) return
    // Strip preview-only fields before sending
    const apiSegments = segments.map(({ startHm: _a, endHm: _b, ...s }) => s)
    save({
      customerId: selectedCustomer.id,
      stylistId:  slot.stylistId,
      salonId:    user?.salonId ?? 'sal_01',  // mock-mode fallback only — real path always has a salonId from the session
      date:       slot.date,
      status:     'PENDING',
      segments:   apiSegments,
    })
  }

  const canSave = !!selectedCustomer && !!selectedService && !conflict

  return (
    <Modal
      open={!!slot}
      onClose={handleClose}
      title="Quick add appointment"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" disabled={!canSave} loading={isPending} onClick={handleSave}>
            Save appointment
          </Button>
        </>
      }
    >
      {slot && (
        <div className="flex flex-col gap-4">

          {/* Slot summary */}
          <div className="bg-slate-50 rounded-md px-3 py-2 flex items-center gap-3 text-xs text-slate-600">
            <span className="font-medium">{slot.stylistName}</span>
            <span className="text-slate-300">·</span>
            <span>{fmtHm(slot.startTime)} · {slot.date}</span>
          </div>

          {/* Client search */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5" htmlFor="client-search">
              Client
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-brand-blue-light rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-blue">{selectedCustomer.name}</span>
                  {selectedCustomer.isVIP && <Badge variant="amber" dot>VIP</Badge>}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                  aria-label="Clear client"
                >✕</button>
              </div>
            ) : (
              <>
                <input
                  id="client-search"
                  type="text"
                  placeholder="Search by name…"
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showDropdown && customerResults.length > 0}
                />
                {showDropdown && customerResults.length > 0 && (
                  <ul role="listbox" className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                    {customerResults.map((c) => (
                      <li
                        key={c.id}
                        role="option"
                        aria-selected={false}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                        onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); setShowDropdown(false) }}
                      >
                        <span>{c.name}</span>
                        <div className="flex items-center gap-2">
                          {c.isVIP && <Badge variant="amber" dot>VIP</Badge>}
                          <span className="text-[11px] text-slate-400">{c.phone}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {debouncedQuery.length >= 2 && customerResults.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1 pl-1">No clients found</p>
                )}
              </>
            )}
          </div>

          {/* Service picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5" htmlFor="service-select">
              Service
            </label>
            <select
              id="service-select"
              value={selectedService?.id ?? ''}
              onChange={(e) => setSelectedService(SERVICE_TEMPLATES.find((s) => s.id === e.target.value) ?? null)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
            >
              <option value="">Select a service…</option>
              {SERVICE_TEMPLATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMinutes} min · {s.segmentCount} segment{s.segmentCount > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Segment preview — uses pure HH:mm strings, no Date() */}
          {selectedService && segments.length > 0 && (
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Segments</p>
              <div className="flex flex-col gap-1.5">
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${seg.type === 'BUSY' ? 'bg-brand-blue' : 'bg-slate-300'}`} aria-hidden="true" />
                      <span className="text-slate-700">{seg.serviceStep}</span>
                      <Badge variant={seg.type === 'FREE' ? 'gray' : 'blue'}>
                        {seg.type === 'FREE' ? 'Open' : 'Busy'}
                      </Badge>
                    </div>
                    <span className="text-slate-400">{fmtHm(seg.startHm)}–{fmtHm(seg.endHm)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflict warning */}
          {conflict && (
            <div role="alert" className="flex items-center gap-2 bg-danger-bg border border-danger/20 rounded-md px-3 py-2">
              <span className="text-danger text-sm" aria-hidden="true">⚠️</span>
              <p className="text-xs font-medium text-danger">
                Conflict — this slot overlaps an existing appointment
              </p>
            </div>
          )}

        </div>
      )}
    </Modal>
  )
}
