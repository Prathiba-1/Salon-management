/**
 * In-memory mock database.
 * ALL timestamps are stored as "YYYY-MM-DDTHH:mm" (no timezone suffix).
 * This means they are always treated as LOCAL time in the browser — no UTC offset confusion.
 */

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETE' | 'CANCELLED'
export type AlertType = 'VIP_PENDING' | 'LOW_INVENTORY' | 'OUT_OF_STOCK' | 'CONFLICT'
export type SegmentType = 'BUSY' | 'FREE'

export interface Segment {
  id: string
  appointmentId: string
  type: SegmentType
  startTime: string  // "YYYY-MM-DDTHH:mm" local, no Z
  endTime: string
  status: AppointmentStatus
  serviceStep?: string
}

export interface Appointment {
  id: string
  customerId: string
  stylistId: string
  salonId: string
  status: AppointmentStatus
  date: string        // YYYY-MM-DD
  segments: Segment[]
  notes?: string
}

export interface Stylist {
  id: string
  name: string
  role: 'STYLIST' | 'SENIOR_STYLIST' | 'MANAGER'
  specialties: string[]
  avatarInitials: string
  shiftStart: string   // HH:mm
  shiftEnd: string     // HH:mm
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  isVIP: boolean
  formulaNotes: FormulaNota[]
}

export interface FormulaNota {
  id: string
  customerId: string
  serviceType: string
  note: string
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  brand: string
  quantity: number
  lowStockThreshold: number
  unit: string
}

export interface ActionAlert {
  id: string
  type: AlertType
  title: string
  subtitle: string
  resolved: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

/** M4 (minimal) — basic per-stylist occupancy snapshot. Not the full heatmap (deferred to backlog). */
export interface StylistUtilisation {
  stylistId: string
  stylistName: string
  avatarInitials: string
  bookingCount: number
  bookedMin: number
  shiftMin: number
  occupancyRate: number   // 0–1
  hasShiftData: boolean
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

/** Build a local timestamp string — NO trailing Z */
function ts(date: string, time: string): string {
  return `${date}T${time}`
}

/** Add minutes to a local timestamp string and return a new local timestamp string */
function addMins(localTs: string, mins: number): string {
  const d = new Date(localTs)   // parsed as local because no Z
  d.setMinutes(d.getMinutes() + mins)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Minutes between two "HH:mm" strings, e.g. shiftMinutes('09:00','18:00') -> 540 */
function shiftMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const STYLISTS: Stylist[] = [
  { id: 'sty_01', name: 'Sunita R.',  role: 'SENIOR_STYLIST', specialties: ['Balayage', 'Keratin'], avatarInitials: 'SR', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'sty_02', name: 'Ananya K.',  role: 'STYLIST',        specialties: ['Cuts', 'Colour'],      avatarInitials: 'AK', shiftStart: '10:00', shiftEnd: '19:00' },
  { id: 'sty_03', name: 'Meera P.',   role: 'STYLIST',        specialties: ['Bridal', 'Updos'],     avatarInitials: 'MP', shiftStart: '09:00', shiftEnd: '17:00' },
  { id: 'sty_04', name: 'Divya N.',   role: 'STYLIST',        specialties: ['Highlights', 'Toner'], avatarInitials: 'DN', shiftStart: '11:00', shiftEnd: '20:00' },
  { id: 'sty_05', name: 'Rekha T.',   role: 'SENIOR_STYLIST', specialties: ['Smoothening', 'Spa'],  avatarInitials: 'RT', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'sty_06', name: 'Kavitha M.', role: 'MANAGER',        specialties: ['Colour', 'Cuts'],      avatarInitials: 'KM', shiftStart: '08:00', shiftEnd: '17:00' },
]

const CUSTOMERS: Customer[] = [
  { id: 'cus_01', name: 'Priya M.',    phone: '+91 98765 43210', email: 'priya@example.com',    isVIP: true,  formulaNotes: [{ id: 'fn_01', customerId: 'cus_01', serviceType: 'Balayage', note: 'Level 7 base, 40vol highlights, toner: Wella T18', createdAt: ts(TODAY,'10:00') }] },
  { id: 'cus_02', name: 'Anjali S.',   phone: '+91 98765 11111', email: 'anjali@example.com',   isVIP: false, formulaNotes: [] },
  { id: 'cus_03', name: 'Deepa R.',    phone: '+91 98765 22222', email: 'deepa@example.com',    isVIP: true,  formulaNotes: [] },
  { id: 'cus_04', name: 'Sneha V.',    phone: '+91 98765 33333', email: 'sneha@example.com',    isVIP: false, formulaNotes: [] },
  { id: 'cus_05', name: 'Kavita L.',   phone: '+91 98765 44444', email: 'kavita@example.com',   isVIP: false, formulaNotes: [] },
  { id: 'cus_06', name: 'Rohini P.',   phone: '+91 98765 55555', email: 'rohini@example.com',   isVIP: false, formulaNotes: [] },
  { id: 'cus_07', name: 'Nisha A.',    phone: '+91 98765 66666', email: 'nisha@example.com',    isVIP: false, formulaNotes: [] },
  { id: 'cus_08', name: 'Pooja B.',    phone: '+91 98765 77777', email: 'pooja@example.com',    isVIP: true,  formulaNotes: [] },
  { id: 'cus_09', name: 'Swathi C.',   phone: '+91 98765 88888', email: 'swathi@example.com',   isVIP: false, formulaNotes: [] },
  { id: 'cus_10', name: 'Lakshmi D.',  phone: '+91 98765 99999', email: 'lakshmi@example.com',  isVIP: false, formulaNotes: [] },
  { id: 'cus_11', name: 'Aruna E.',    phone: '+91 98766 10000', email: 'aruna@example.com',    isVIP: false, formulaNotes: [] },
  { id: 'cus_12', name: 'Bhavani F.',  phone: '+91 98766 20000', email: 'bhavani@example.com',  isVIP: false, formulaNotes: [] },
  { id: 'cus_13', name: 'Chitra G.',   phone: '+91 98766 30000', email: 'chitra@example.com',   isVIP: false, formulaNotes: [] },
  { id: 'cus_14', name: 'Durga H.',    phone: '+91 98766 40000', email: 'durga@example.com',    isVIP: true,  formulaNotes: [] },
  { id: 'cus_15', name: 'Eshwari I.',  phone: '+91 98766 50000', email: 'eshwari@example.com',  isVIP: false, formulaNotes: [] },
]

const APPOINTMENTS: Appointment[] = [
  // Sunita — Balayage with processing gap (multi-segment)
  {
    id: 'apt_01', customerId: 'cus_01', stylistId: 'sty_01', salonId: 'sal_01',
    status: 'PENDING', date: TODAY,
    segments: [
      { id: 'seg_01a', appointmentId: 'apt_01', type: 'BUSY', startTime: ts(TODAY,'09:00'), endTime: ts(TODAY,'09:30'), status: 'PENDING', serviceStep: 'Consultation' },
      { id: 'seg_01b', appointmentId: 'apt_01', type: 'FREE', startTime: ts(TODAY,'09:30'), endTime: ts(TODAY,'10:30'), status: 'PENDING', serviceStep: 'Processing' },
      { id: 'seg_01c', appointmentId: 'apt_01', type: 'BUSY', startTime: ts(TODAY,'10:30'), endTime: ts(TODAY,'11:30'), status: 'PENDING', serviceStep: 'Finishing' },
    ],
  },
  // Sunita — Cut at 13:00
  { id: 'apt_02', customerId: 'cus_02', stylistId: 'sty_01', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_02a', appointmentId: 'apt_02', type: 'BUSY', startTime: ts(TODAY,'13:00'), endTime: ts(TODAY,'14:00'), status: 'CONFIRMED', serviceStep: 'Cut & Blow-dry' }] },
  // Ananya — Global Colour 10:00–11:30
  { id: 'apt_03', customerId: 'cus_03', stylistId: 'sty_02', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_03a', appointmentId: 'apt_03', type: 'BUSY', startTime: ts(TODAY,'10:00'), endTime: ts(TODAY,'11:30'), status: 'CONFIRMED', serviceStep: 'Global Colour' }] },
  // Ananya — Cut at 14:00
  { id: 'apt_04', customerId: 'cus_04', stylistId: 'sty_02', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_04a', appointmentId: 'apt_04', type: 'BUSY', startTime: ts(TODAY,'14:00'), endTime: ts(TODAY,'15:00'), status: 'CONFIRMED', serviceStep: 'Cut' }] },
  // Meera — Bridal 09:00–12:00
  { id: 'apt_05', customerId: 'cus_05', stylistId: 'sty_03', salonId: 'sal_01', status: 'IN_PROGRESS', date: TODAY,
    segments: [{ id: 'seg_05a', appointmentId: 'apt_05', type: 'BUSY', startTime: ts(TODAY,'09:00'), endTime: ts(TODAY,'12:00'), status: 'IN_PROGRESS', serviceStep: 'Bridal Makeup' }] },
  // Divya — Highlights 11:00–13:00
  { id: 'apt_06', customerId: 'cus_06', stylistId: 'sty_04', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_06a', appointmentId: 'apt_06', type: 'BUSY', startTime: ts(TODAY,'11:00'), endTime: ts(TODAY,'13:00'), status: 'CONFIRMED', serviceStep: 'Highlights' }] },
  // Rekha — Smoothening 10:00–13:00
  { id: 'apt_07', customerId: 'cus_07', stylistId: 'sty_05', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_07a', appointmentId: 'apt_07', type: 'BUSY', startTime: ts(TODAY,'10:00'), endTime: ts(TODAY,'13:00'), status: 'CONFIRMED', serviceStep: 'Smoothening' }] },
  // Kavitha — Colour 09:00–11:00
  { id: 'apt_08', customerId: 'cus_08', stylistId: 'sty_06', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_08a', appointmentId: 'apt_08', type: 'BUSY', startTime: ts(TODAY,'09:00'), endTime: ts(TODAY,'11:00'), status: 'CONFIRMED', serviceStep: 'Colour' }] },
  // Sunita — Treatment 15:00–16:00
  { id: 'apt_09', customerId: 'cus_09', stylistId: 'sty_01', salonId: 'sal_01', status: 'PENDING', date: TODAY,
    segments: [{ id: 'seg_09a', appointmentId: 'apt_09', type: 'BUSY', startTime: ts(TODAY,'15:00'), endTime: ts(TODAY,'16:00'), status: 'PENDING', serviceStep: 'Treatment' }] },
  // Ananya — Blowdry 16:00–17:00
  { id: 'apt_10', customerId: 'cus_10', stylistId: 'sty_02', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_10a', appointmentId: 'apt_10', type: 'BUSY', startTime: ts(TODAY,'16:00'), endTime: ts(TODAY,'17:00'), status: 'CONFIRMED', serviceStep: 'Blowdry' }] },
  // Meera — Cut 13:00–14:00
  { id: 'apt_11', customerId: 'cus_11', stylistId: 'sty_03', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_11a', appointmentId: 'apt_11', type: 'BUSY', startTime: ts(TODAY,'13:00'), endTime: ts(TODAY,'14:00'), status: 'CONFIRMED', serviceStep: 'Cut' }] },
  // Divya — Toner 14:00–15:00
  { id: 'apt_12', customerId: 'cus_12', stylistId: 'sty_04', salonId: 'sal_01', status: 'PENDING', date: TODAY,
    segments: [{ id: 'seg_12a', appointmentId: 'apt_12', type: 'BUSY', startTime: ts(TODAY,'14:00'), endTime: ts(TODAY,'15:00'), status: 'PENDING', serviceStep: 'Toner' }] },
  // Rekha — Spa 14:00–16:00
  { id: 'apt_13', customerId: 'cus_13', stylistId: 'sty_05', salonId: 'sal_01', status: 'CONFIRMED', date: TODAY,
    segments: [{ id: 'seg_13a', appointmentId: 'apt_13', type: 'BUSY', startTime: ts(TODAY,'14:00'), endTime: ts(TODAY,'16:00'), status: 'CONFIRMED', serviceStep: 'Spa' }] },
  // Kavitha — Cuts 12:00–13:30
  { id: 'apt_14', customerId: 'cus_14', stylistId: 'sty_06', salonId: 'sal_01', status: 'COMPLETE', date: TODAY,
    segments: [{ id: 'seg_14a', appointmentId: 'apt_14', type: 'BUSY', startTime: ts(TODAY,'12:00'), endTime: ts(TODAY,'13:30'), status: 'COMPLETE', serviceStep: 'Cuts' }] },
]

const INVENTORY: InventoryItem[] = [
  { id: 'inv_01', name: 'Blondor Powder', brand: "L'Oréal",     quantity: 3,  lowStockThreshold: 5, unit: 'packs' },
  { id: 'inv_02', name: 'Inoa 6.0',       brand: "L'Oréal",     quantity: 0,  lowStockThreshold: 3, unit: 'tubes' },
  { id: 'inv_03', name: 'Wella T18 Toner',brand: 'Wella',        quantity: 8,  lowStockThreshold: 5, unit: 'bottles' },
  { id: 'inv_04', name: 'Olaplex No.3',   brand: 'Olaplex',      quantity: 12, lowStockThreshold: 5, unit: 'bottles' },
  { id: 'inv_05', name: 'Keratin Serum',  brand: 'Wella',        quantity: 2,  lowStockThreshold: 4, unit: 'bottles' },
  { id: 'inv_06', name: 'Purple Shampoo', brand: 'Fanola',       quantity: 6,  lowStockThreshold: 3, unit: 'bottles' },
  { id: 'inv_07', name: 'Argan Oil',      brand: 'Moroccanoil',  quantity: 4,  lowStockThreshold: 3, unit: 'bottles' },
  { id: 'inv_08', name: 'Colour Protect', brand: "L'Oréal",     quantity: 9,  lowStockThreshold: 4, unit: 'bottles' },
]

let ACTION_ALERTS: ActionAlert[] = [
  { id: 'alt_01', type: 'VIP_PENDING',   title: 'VIP booking pending',       subtitle: 'Priya M. · Balayage · 14:00 with Sunita', resolved: false, createdAt: ts(TODAY,'08:00'), metadata: { appointmentId: 'apt_01' } },
  { id: 'alt_02', type: 'LOW_INVENTORY', title: "Low stock — Blondor Powder", subtitle: '3 units remaining · threshold 5',          resolved: false, createdAt: ts(TODAY,'08:05'), metadata: { inventoryId: 'inv_01' } },
  { id: 'alt_03', type: 'OUT_OF_STOCK',  title: 'Out of stock — Inoa 6.0',   subtitle: '0 units remaining',                        resolved: false, createdAt: ts(TODAY,'08:10'), metadata: { inventoryId: 'inv_02' } },
  { id: 'alt_04', type: 'CONFLICT',      title: 'Scheduling conflict',        subtitle: 'Ananya K. double-booked at 11:30',         resolved: false, createdAt: ts(TODAY,'08:15') },
]

// ─── DB helpers ───────────────────────────────────────────────────────────────

let appointments = [...APPOINTMENTS]

export const db = {
  getStylists: () => STYLISTS,
  searchCustomers: (q: string) =>
    CUSTOMERS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
  getInventory: () => INVENTORY,
  getActionAlerts: () => ACTION_ALERTS.filter((a) => !a.resolved),
  resolveAlert: (id: string) => {
    ACTION_ALERTS = ACTION_ALERTS.map((a) => (a.id === id ? { ...a, resolved: true } : a))
  },

  getAppointments: ({ date, stylistId }: { date?: string | null; stylistId?: string | null }) =>
    appointments
      .filter(
        (a) =>
          (!date || a.date === date) &&
          (!stylistId || a.stylistId === stylistId),
      )
      .map((a) => ({ ...a, customer: CUSTOMERS.find((c) => c.id === a.customerId) })),

  getAppointmentDetail: (id: string) => {
    const apt = appointments.find((a) => a.id === id)
    if (!apt) return null
    const customer = CUSTOMERS.find((c) => c.id === apt.customerId)!
    const stylist  = STYLISTS.find((s) => s.id === apt.stylistId)!
    return { ...apt, customer, stylist }
  },

  createAppointment: (body: Record<string, unknown>): Appointment => {
    const apt: Appointment = {
      id: `apt_${crypto.randomUUID().slice(0, 8)}`,
      salonId: 'sal_01',
      status: 'PENDING',
      ...(body as Omit<Appointment, 'id' | 'salonId' | 'status'>),
    }
    appointments = [...appointments, apt]
    return apt
  },

  updateAppointmentStatus: (id: string, status: string): Appointment | null => {
    const existing = appointments.find((a) => a.id === id)
    if (!existing) return null
    appointments = appointments.map((a) =>
      a.id === id ? { ...a, status: status as AppointmentStatus } : a,
    )
    return appointments.find((a) => a.id === id)!
  },

  rescheduleAppointment: (id: string, body: Record<string, unknown>): Appointment | null => {
    appointments = appointments.map((a) =>
      a.id === id ? { ...a, ...body } : a,
    )
    return appointments.find((a) => a.id === id) ?? null
  },

  /**
   * Conflict check: compare local timestamp strings directly.
   * Strings are "YYYY-MM-DDTHH:mm" — lexicographic comparison works correctly.
   */
  checkConflict: (body: Record<string, unknown>, excludeId?: string): boolean => {
    const newSegments = (body.segments ?? []) as Segment[]
    const busyNew = newSegments.filter((s) => s.type === 'BUSY')
    if (!busyNew.length) return false

    const busyExisting = appointments
      .filter((a) => a.id !== excludeId && a.stylistId === body.stylistId && a.date === body.date)
      .flatMap((a) => a.segments)
      .filter((s) => s.type === 'BUSY')

    return busyNew.some((newSeg) =>
      busyExisting.some(
        (existing) =>
          existing.startTime < newSeg.endTime &&
          existing.endTime   > newSeg.startTime,
      ),
    )
  },

  getDailyPulse: (date: string) => {
    const dayApts = appointments.filter((a) => a.date === date)
    const bookedMin = dayApts
      .flatMap((a) => a.segments.filter((s) => s.type === 'BUSY'))
      .reduce((acc, s) => {
        const diff = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000
        return acc + diff
      }, 0)
    const shiftMin = STYLISTS.length * 9 * 60
    return {
      date,
      revenue: { services: 14200, retail: 2800, tips: 1420, total: 18420 },
      occupancy: { rate: Math.min(bookedMin / shiftMin, 1), bookedMin, shiftMin },
      appointments: {
        total:      dayApts.length,
        confirmed:  dayApts.filter((a) => a.status === 'CONFIRMED').length,
        pending:    dayApts.filter((a) => a.status === 'PENDING').length,
        inProgress: dayApts.filter((a) => a.status === 'IN_PROGRESS').length,
        complete:   dayApts.filter((a) => a.status === 'COMPLETE').length,
      },
    }
  },

  getCalendarGrid: (date: string, stylistIds?: string[]) => {
    const stylists = stylistIds
      ? STYLISTS.filter((s) => stylistIds.includes(s.id))
      : STYLISTS
    return stylists.map((stylist) => ({
      stylist,
      appointments: appointments
        .filter((a) => a.date === date && a.stylistId === stylist.id)
        .map((a) => ({ ...a, customer: CUSTOMERS.find((c) => c.id === a.customerId) })),
    }))
  },

  getHeatmap: (startDate: string, endDate: string, stylistId?: string) => {
    const stylists = stylistId ? STYLISTS.filter((s) => s.id === stylistId) : STYLISTS
    return stylists.map((stylist) => ({
      stylist,
      cells: Array.from({ length: 7 }, (_, dayIdx) => ({
        day: dayIdx,
        slots: Array.from({ length: 24 }, (_, slotIdx) => ({
          slot: slotIdx,
          occupancyRate: Math.random() * 0.9,
          bookingCount: Math.floor(Math.random() * 3),
        })),
      })),
    }))
  },

  /**
   * M4 (minimal) — a simple per-stylist occupancy snapshot for one day, computed from
   * real seeded appointments + shifts (not the random `getHeatmap` stub above, which
   * remains here unused for the full heatmap if that's picked up from the backlog later).
   * Stylists with no shift data are flagged rather than excluded, per the Risk Register
   * mitigation for missing shift data.
   */
  getUtilisationSnapshot: (date: string): StylistUtilisation[] => {
    return STYLISTS.map((stylist) => {
      const dayApts = appointments.filter((a) => a.date === date && a.stylistId === stylist.id)
      const bookedMin = dayApts
        .flatMap((a) => a.segments.filter((s) => s.type === 'BUSY'))
        .reduce((acc, s) => {
          const diff = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60_000
          return acc + diff
        }, 0)
      const hasShiftData = Boolean(stylist.shiftStart && stylist.shiftEnd)
      const shiftMin = hasShiftData ? shiftMinutes(stylist.shiftStart, stylist.shiftEnd) : 0

      return {
        stylistId: stylist.id,
        stylistName: stylist.name,
        avatarInitials: stylist.avatarInitials,
        bookingCount: dayApts.length,
        bookedMin,
        shiftMin,
        occupancyRate: hasShiftData && shiftMin > 0 ? Math.min(bookedMin / shiftMin, 1) : 0,
        hasShiftData,
      }
    }).sort((a, b) => b.occupancyRate - a.occupancyRate)
  },
}

// ─── M5 extensions ────────────────────────────────────────────────────────────

export interface FormulaNote {
  id: string
  customerId: string
  serviceType: string
  brand: string
  shade: string
  developer: string
  ratio: string
  timing: string
  notes: string
  stylistId: string
  createdAt: string  // YYYY-MM-DDTHH:mm
}

export interface CustomerNote {
  id: string
  customerId: string
  body: string
  updatedAt: string
}

export interface CustomerHistory {
  appointmentId: string
  date: string
  serviceStep: string
  stylistName: string
  durationMin: number
  status: AppointmentStatus
  totalPaid: number
}

export interface Invoice {
  id: string
  appointmentId?: string
  customerId?: string
  customerName: string
  date: string
  amount: number
  status: 'PAID' | 'UNPAID'
}

// Simple invoices store (M5) — derived from some appointments for demo
let INVOICES: Invoice[] = [
  { id: 'invn_01', appointmentId: 'apt_14', customerId: 'cus_14', customerName: 'Durga H.', date: TODAY, amount: 2200, status: 'PAID' },
  { id: 'invn_02', appointmentId: 'apt_11', customerId: 'cus_11', customerName: 'Aruna E.', date: TODAY, amount: 1800, status: 'UNPAID' },
]

// Richer formula notes seed (keyed by customerId)
const FORMULA_NOTES: FormulaNote[] = [
  { id: 'fn_m5_01', customerId: 'cus_01', serviceType: 'Balayage',      brand: "L'Oréal",  shade: '7.0',   developer: '40vol', ratio: '1:1',   timing: '45 min', notes: 'Lift to level 9, tone with T18', stylistId: 'sty_01', createdAt: ts(TODAY,'10:00') },
  { id: 'fn_m5_02', customerId: 'cus_01', serviceType: 'Balayage',      brand: "L'Oréal",  shade: '8.0',   developer: '30vol', ratio: '1:1.5', timing: '40 min', notes: 'Slightly lighter than last time', stylistId: 'sty_01', createdAt: ts(TODAY,'10:00').replace('T','-prev T') },
  { id: 'fn_m5_03', customerId: 'cus_01', serviceType: 'Global Colour', brand: 'Wella',    shade: '6N',    developer: '20vol', ratio: '1:2',   timing: '35 min', notes: 'Cover greys on crown', stylistId: 'sty_02', createdAt: ts(TODAY,'09:00') },
  { id: 'fn_m5_04', customerId: 'cus_03', serviceType: 'Highlights',    brand: 'Schwarzkopf', shade: '9.5',developer: '40vol',ratio: '1:1',  timing: '50 min', notes: 'Fine foils, avoid root', stylistId: 'sty_04', createdAt: ts(TODAY,'11:00') },
  { id: 'fn_m5_05', customerId: 'cus_08', serviceType: 'Keratin',       brand: 'GKhair',   shade: 'N/A',   developer: 'N/A',   ratio: 'N/A',  timing: '90 min', notes: 'Medium porosity, use Gold treatment', stylistId: 'sty_05', createdAt: ts(TODAY,'09:00') },
]

const CUSTOMER_NOTES: CustomerNote[] = [
  { id: 'cn_01', customerId: 'cus_01', body: 'Prefers a seat near the window. Allergic to certain fragrances — check before applying product.', updatedAt: ts(TODAY,'10:00') },
  { id: 'cn_02', customerId: 'cus_03', body: 'Comes in monthly for highlights. Always brings reference photos.', updatedAt: ts(TODAY,'09:00') },
]

db.getCustomers = (q: string) =>
  CUSTOMERS.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase()) ||
      c.phone.includes(q),
  )

db.getCustomerById = (id: string) => CUSTOMERS.find((c) => c.id === id) ?? null

db.getCustomerHistory = (customerId: string): CustomerHistory[] =>
  appointments
    .filter((a) => a.customerId === customerId)
    .flatMap((a) => {
      const stylist = STYLISTS.find((s) => s.id === a.stylistId)
      const busySegs = a.segments.filter((s) => s.type === 'BUSY')
      if (!busySegs.length) return []
      const first = busySegs[0]
      const last  = busySegs[busySegs.length - 1]
      const dur = (new Date(last.endTime).getTime() - new Date(first.startTime).getTime()) / 60_000
      return [{
        appointmentId: a.id,
        date: a.date,
        serviceStep: first.serviceStep ?? 'Service',
        stylistName: stylist?.name ?? 'Unknown',
        durationMin: Math.round(dur),
        status: a.status,
        totalPaid: a.status === 'COMPLETE' ? 2200 : 0,
      }]
    })
    .sort((a, b) => b.date.localeCompare(a.date))

db.getFormulaNotesForCustomer = (customerId: string): FormulaNote[] =>
  FORMULA_NOTES.filter((f) => f.customerId === customerId)

db.getCustomerNote = (customerId: string): CustomerNote | null =>
  CUSTOMER_NOTES.find((n) => n.customerId === customerId) ?? null

db.upsertCustomerNote = (customerId: string, body: string): CustomerNote => {
  const existing = CUSTOMER_NOTES.findIndex((n) => n.customerId === customerId)
  const note: CustomerNote = { id: `cn_${customerId}`, customerId, body, updatedAt: new Date().toISOString().slice(0,16) }
  if (existing >= 0) CUSTOMER_NOTES[existing] = note
  else CUSTOMER_NOTES.push(note)
  return note
}

db.addFormulaNote = (note: Omit<FormulaNote, 'id' | 'createdAt'>): FormulaNote => {
  const n: FormulaNote = { ...note, id: `fn_${crypto.randomUUID().slice(0,8)}`, createdAt: new Date().toISOString().slice(0,16) }
  FORMULA_NOTES.push(n)
  return n
}

db.toggleVIP = (customerId: string): Customer | null => {
  const c = CUSTOMERS.find((x) => x.id === customerId)
  if (!c) return null
  c.isVIP = !c.isVIP
  return c
}

db.addCustomer = (data: Omit<Customer, 'id' | 'formulaNotes'>): Customer => {
  const c: Customer = { ...data, id: `cus_${crypto.randomUUID().slice(0,8)}`, formulaNotes: [] }
  CUSTOMERS.push(c)
  return c
}

// Invoices (simple CRUD in-memory)
db.getInvoices = () => INVOICES

db.createInvoice = (payload: Partial<Invoice>): Invoice => {
  const inv: Invoice = {
    id: `invn_${crypto.randomUUID().slice(0,8)}`,
    appointmentId: payload.appointmentId,
    customerId: payload.customerId,
    customerName: payload.customerName ?? 'Unknown',
    date: payload.date ?? new Date().toISOString().slice(0,10),
    amount: payload.amount ?? 0,
    status: payload.status ?? 'UNPAID',
  }
  INVOICES = [inv, ...INVOICES]
  return inv
}

db.payInvoice = (id: string) => {
  INVOICES = INVOICES.map((i) => (i.id === id ? { ...i, status: 'PAID' } : i))
}

db.deleteInvoice = (id: string) => {
  INVOICES = INVOICES.filter((i) => i.id !== id)
}
