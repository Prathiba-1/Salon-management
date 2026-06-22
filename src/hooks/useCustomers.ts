import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

// The generated Database type (src/types/database.ts) is a placeholder until
// `npm run gen-types` is run against a live Supabase project with real migrations.
// Until then every supabase.from() call infers its row/update types as `never`,
// causing TS2345/TS2339 errors throughout this file. This cast isolates the
// workaround in one place — once real types are generated, remove this line
// and replace `db` with `supabase` everywhere below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  isVIP: boolean
}

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
  createdAt: string
}

export interface CustomerHistory {
  appointmentId: string
  date: string
  serviceStep: string
  stylistName: string
  durationMin: number
  status: string
  totalPaid: number
}

export interface CustomerNote {
  body: string
}

// ── List / search ────────────────────────────────────────────────────────
export function useCustomerList(q: string) {
  const { user } = useAuth()
  return useQuery<Customer[]>({
    queryKey: ['customers', 'list', q],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/list?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      // M10.6 — RLS (0004) already scopes this to the caller's salon and to
      // Owner/Admin only; a plain `.ilike` search is sufficient here (no
      // custom RPC needed per M8.1's "simple resources" note), backed by
      // the GIN trigram-style index from 0001_core_schema.sql.
      let query = db
        .from('Customer')
        .select('id, name, phone, email, isVIP')
        .eq('salonId', user?.salonId ?? '')
        .order('name')
      if (q.trim()) query = query.ilike('name', `%${q.trim()}%`)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as Customer[]
    },
    staleTime: 30_000,
  })
}

// ── Single customer ──────────────────────────────────────────────────────
export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${id}`)
        if (!res.ok) throw new Error('Not found')
        return res.json()
      }
      const { data, error } = await db
        .from('Customer')
        .select('id, name, phone, email, isVIP')
        .eq('id', id)
        .single()
      if (error) throw new Error(error.message)
      return data as Customer
    },
    enabled: Boolean(id),
  })
}

// ── Appointment history ──────────────────────────────────────────────────
export function useCustomerHistory(customerId: string) {
  return useQuery<CustomerHistory[]>({
    queryKey: ['customers', customerId, 'history'],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${customerId}/history`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      // M10.6 — no dedicated M8.4 view was specified for customer history;
      // built here as a join across Appointment + AppointmentSegment +
      // Stylist + Invoice, mirroring the mock's CustomerHistory shape
      // exactly (one row per appointment, using its first segment's
      // serviceStep/duration as the summary).
      const { data, error } = await db
        .from('Appointment')
        .select(`
          id, date, status,
          stylist:Stylist ( name ),
          segments:AppointmentSegment ( serviceStep, startTime, endTime ),
          invoice:Invoice ( amount, status )
        `)
        .eq('customerId', customerId)
        .order('date', { ascending: false })
      if (error) throw new Error(error.message)

      return (data ?? []).map((row: any) => {
        const firstSeg = row.segments?.[0]
        const durationMin = (row.segments ?? []).reduce((sum: number, s: any) => {
          const start = new Date(s.startTime).getTime()
          const end = new Date(s.endTime).getTime()
          return sum + Math.max(0, (end - start) / 60_000)
        }, 0)
        const paidInvoice = (Array.isArray(row.invoice) ? row.invoice : [row.invoice]).find(
          (i: any) => i?.status === 'PAID',
        )
        return {
          appointmentId: row.id,
          date: row.date,
          serviceStep: firstSeg?.serviceStep ?? '—',
          stylistName: row.stylist?.name ?? 'Unknown',
          durationMin,
          status: row.status,
          totalPaid: paidInvoice?.amount ?? 0,
        } as CustomerHistory
      })
    },
    enabled: Boolean(customerId),
  })
}

// ── Formula notes ────────────────────────────────────────────────────────
export function useFormulaNotes(customerId: string) {
  return useQuery<FormulaNote[]>({
    queryKey: ['customers', customerId, 'formula-notes'],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${customerId}/formula-notes`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      const { data, error } = await db
        .from('ClientFormulaNotes')
        .select('id, customerId, serviceType, brand, shade, developer, ratio, timing, notes, stylistId, createdAt')
        .eq('customerId', customerId)
        .order('createdAt', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as FormulaNote[]
    },
    enabled: Boolean(customerId),
  })
}

// ── Free-text customer note ──────────────────────────────────────────────
export function useCustomerNote(customerId: string) {
  return useQuery<CustomerNote>({
    queryKey: ['customers', customerId, 'notes'],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${customerId}/notes`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      const { data, error } = await db
        .from('CustomerNote')
        .select('body')
        .eq('customerId', customerId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as unknown as CustomerNote | null) ?? { body: '' }
    },
    enabled: Boolean(customerId),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────
export function useToggleVIP() {
  const qc = useQueryClient()
  return useMutation<Customer, Error, string>({
    mutationFn: async (customerId) => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${customerId}/vip`, { method: 'PATCH' })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      // Read-then-write: flips isVIP. RLS (0004, customer_write_owner)
      // restricts this to Owner/Admin already, matching the UI's existing
      // owner-only toggle visibility.
      const { data: current, error: readErr } = await db
        .from('Customer')
        .select('id, name, phone, email, isVIP')
        .eq('id', customerId)
        .single()
      if (readErr) throw new Error(readErr.message)

      const { data, error } = await db
        .from('Customer')
        .update({ isVIP: !current.isVIP })
        .eq('id', customerId)
        .select('id, name, phone, email, isVIP')
        .single()
      if (error) throw new Error(error.message)
      return data as Customer
    },
    onSuccess: (updated) => {
      qc.setQueryData<Customer>(['customers', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['customers', 'list'] })
    },
  })
}

export function useSaveCustomerNote() {
  const qc = useQueryClient()
  return useMutation<CustomerNote, Error, { customerId: string; body: string }>({
    mutationFn: async ({ customerId, body }) => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${customerId}/notes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      const { data, error } = await db
        .from('CustomerNote')
        .upsert({ customerId, body, updatedAt: new Date().toISOString() }, { onConflict: 'customerId' })
        .select('body')
        .single()
      if (error) throw new Error(error.message)
      return data as CustomerNote
    },
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'notes'] })
    },
  })
}

export function useAddFormulaNote() {
  const qc = useQueryClient()
  return useMutation<FormulaNote, Error, Omit<FormulaNote, 'id' | 'createdAt'>>({
    mutationFn: async (note) => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/customers/${note.customerId}/formula-notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
      const { data, error } = await db
        .from('ClientFormulaNotes')
        .insert(note)
        .select('id, customerId, serviceType, brand, shade, developer, ratio, timing, notes, stylistId, createdAt')
        .single()
      if (error) throw new Error(error.message)
      return data as FormulaNote
    },
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['customers', customerId, 'formula-notes'] })
    },
  })
}

export function useAddCustomer() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation<Customer, Error & { code?: string }, Omit<Customer, 'id'>>({
    mutationFn: async (data) => {
      if (USE_MOCKS) {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          throw Object.assign(new Error(err.message), { code: err.code })
        }
        return res.json()
      }
      const { data: inserted, error } = await db
        .from('Customer')
        .insert({ ...data, salonId: user?.salonId })
        .select('id, name, phone, email, isVIP')
        .single()
      if (error) {
        // 23505 = unique_violation — matches the mock's duplicate-email 409,
        // mapped here so AddCustomerModal's existing error-code check works
        // unchanged against the live path too.
        const code = error.code === '23505' ? 'DUPLICATE_EMAIL' : undefined
        throw Object.assign(new Error(error.message), { code })
      }
      return inserted as Customer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', 'list'] })
    },
  })
}
