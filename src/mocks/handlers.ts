import { http, HttpResponse, graphql } from 'msw'
import { db } from './db'

const gql = graphql.link('/graphql')

// ─── REST handlers ────────────────────────────────────────────────────────────

export const restHandlers = [
  // Daily pulse
  http.get('/api/daily-pulse', ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    return HttpResponse.json(db.getDailyPulse(date))
  }),

  // Appointments
  http.get('/api/appointments', ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const stylistId = url.searchParams.get('stylistId')
    return HttpResponse.json(db.getAppointments({ date, stylistId }))
  }),

  http.post('/api/appointments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const conflict = db.checkConflict(body)
    if (conflict) {
      return HttpResponse.json({ code: 'SEGMENT_CONFLICT', message: 'Slot already booked' }, { status: 409 })
    }
    const appointment = db.createAppointment(body)
    return HttpResponse.json(appointment, { status: 201 })
  }),

  http.patch('/api/appointments/:id/status', async ({ params, request }) => {
    const { id } = params as { id: string }
    const { status } = await request.json() as { status: string }
    const updated = db.updateAppointmentStatus(id, status)
    if (!updated) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(updated)
  }),

  http.post('/api/appointments/:id/reschedule', async ({ params, request }) => {
    const { id } = params as { id: string }
    const body = await request.json() as Record<string, unknown>
    const conflict = db.checkConflict(body, id)
    if (conflict) {
      return HttpResponse.json({ code: 'SEGMENT_CONFLICT', message: 'Slot already booked' }, { status: 409 })
    }
    const updated = db.rescheduleAppointment(id, body)
    return HttpResponse.json(updated)
  }),

  // Stylists
  http.get('/api/stylists', () => HttpResponse.json(db.getStylists())),

  // Customers
  http.get('/api/customers', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json(db.searchCustomers(q))
  }),

  // Inventory
  http.get('/api/inventory', () => HttpResponse.json(db.getInventory())),

  // Utilisation snapshot (M4 — minimal; full heatmap deferred to backlog)
  http.get('/api/utilisation-snapshot', ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    return HttpResponse.json(db.getUtilisationSnapshot(date))
  }),

  // Action alerts
  http.get('/api/action-alerts', () => HttpResponse.json(db.getActionAlerts())),

  http.patch('/api/action-alerts/:id/resolve', ({ params }) => {
    const { id } = params as { id: string }
    db.resolveAlert(id)
    return HttpResponse.json({ ok: true })
  }),

  // Invoices
  http.get('/api/invoices', () => HttpResponse.json((db as any).getInvoices())),
  http.post('/api/invoices', async ({ request }) => {
    const body = await request.json() as any
    const inv = (db as any).createInvoice(body)
    return HttpResponse.json(inv, { status: 201 })
  }),
  http.patch('/api/invoices/:id/pay', ({ params }) => {
    const { id } = params as { id: string }
    ;(db as any).payInvoice(id)
    return HttpResponse.json({ ok: true })
  }),
  http.delete('/api/invoices/:id', ({ params }) => {
    const { id } = params as { id: string }
    ;(db as any).deleteInvoice(id)
    return HttpResponse.json({ ok: true })
  }),

  // ── M5 Customer handlers ─────────────────────────────────────────────────
  http.get('/api/customers/list', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json((db as any).getCustomers(q))
  }),
  http.get('/api/customers/:id/history', ({ params }) => {
    return HttpResponse.json((db as any).getCustomerHistory(params.id as string))
  }),
  http.get('/api/customers/:id/formula-notes', ({ params }) => {
    return HttpResponse.json((db as any).getFormulaNotesForCustomer(params.id as string))
  }),
  http.post('/api/customers/:id/formula-notes', async ({ params, request }) => {
    const body = await request.json() as any
    const note = (db as any).addFormulaNote({ ...body, customerId: params.id as string })
    return HttpResponse.json(note, { status: 201 })
  }),
  http.get('/api/customers/:id/notes', ({ params }) => {
    const note = (db as any).getCustomerNote(params.id as string)
    return HttpResponse.json(note ?? { body: '' })
  }),
  http.put('/api/customers/:id/notes', async ({ params, request }) => {
    const { body } = await request.json() as { body: string }
    const note = (db as any).upsertCustomerNote(params.id as string, body)
    return HttpResponse.json(note)
  }),
  http.patch('/api/customers/:id/vip', ({ params }) => {
    const c = (db as any).toggleVIP(params.id as string)
    if (!c) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(c)
  }),
  http.post('/api/customers', async ({ request }) => {
    const body = await request.json() as any
    const existing = (db as any).getCustomers(body.email ?? '').find((c: any) => c.email === body.email)
    if (existing) return HttpResponse.json({ code: 'DUPLICATE_EMAIL', message: 'Email already registered' }, { status: 409 })
    const c = (db as any).addCustomer(body)
    return HttpResponse.json(c, { status: 201 })
  }),
  http.get('/api/customers/:id', ({ params }) => {
    const c = (db as any).getCustomerById(params.id as string)
    if (!c) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json(c)
  }),
]

// ─── GraphQL handlers ─────────────────────────────────────────────────────────

export const graphqlHandlers = [
  gql.query('DailyPulse', ({ variables }) => {
    const date = (variables.date as string) ?? new Date().toISOString().slice(0, 10)
    return HttpResponse.json({ data: { dailyPulse: db.getDailyPulse(date) } })
  }),

  gql.query('CalendarGrid', ({ variables }) => {
    const { date, stylistIds } = variables as { date: string; stylistIds?: string[] }
    return HttpResponse.json({ data: { calendarGrid: db.getCalendarGrid(date, stylistIds) } })
  }),

  gql.query('AppointmentDetail', ({ variables }) => {
    const { id } = variables as { id: string }
    return HttpResponse.json({ data: { appointmentDetail: db.getAppointmentDetail(id) } })
  }),

  gql.query('UtilisationHeatmap', ({ variables }) => {
    const { startDate, endDate, stylistId } = variables as {
      startDate: string
      endDate: string
      stylistId?: string
    }
    return HttpResponse.json({ data: { utilisationHeatmap: db.getHeatmap(startDate, endDate, stylistId) } })
  }),

  gql.query('ActionAlerts', () => {
    return HttpResponse.json({ data: { actionAlerts: db.getActionAlerts() } })
  }),

  gql.mutation('UpdateAppointmentStatus', ({ variables }) => {
    const { id, status } = variables as { id: string; status: string }
    const updated = db.updateAppointmentStatus(id, status)
    return HttpResponse.json({ data: { updateAppointmentStatus: updated } })
  }),
]

export const handlers = [...restHandlers, ...graphqlHandlers]
