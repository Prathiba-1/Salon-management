import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callRpc, supabase, USE_MOCKS } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export interface Invoice {
  id: string
  salonId?: string
  appointmentId?: string | null
  customerId?: string | null
  customerName: string
  date: string
  amount: number
  status: 'PAID' | 'UNPAID'
  paidAt?: string | null
  createdAt?: string
}

async function fetchInvoicesMock(): Promise<Invoice[]> {
  const res = await fetch('/api/invoices')
  if (!res.ok) throw new Error('Failed to fetch invoices')
  return res.json()
}

async function fetchInvoicesLive(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('Invoice')
    .select('id, customerId, customerName, date, amount, status, paidAt, createdAt')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Invoice[]
}

export function useInvoices() {
  return useQuery<Invoice[], Error>({
    queryKey: ['invoices'],
    queryFn: USE_MOCKS ? fetchInvoicesMock : fetchInvoicesLive,
    staleTime: 30_000,
  })
}

interface CreateInvoicePayload {
  customerName: string
  amount: number
  date: string
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation<Invoice, Error, CreateInvoicePayload>({
    mutationFn: async (payload) => {
      if (USE_MOCKS) {
        const res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Create failed')
        return res.json()
      }
      // M10.6 — live path uses the M8.3 create_invoice RPC, which enforces
      // one-invoice-per-appointment via the unique constraint and surfaces a
      // clean INVOICE_EXISTS error on a duplicate attempt.
      return callRpc<Invoice>('create_invoice', {
        payload: { salonId: user?.salonId, ...payload },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function usePayInvoice() {
  const qc = useQueryClient()

  return useMutation<Invoice, Error, string>({
    mutationFn: async (id) => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/invoices/${id}/pay`, { method: 'PATCH' })
        if (!res.ok) throw new Error('Pay failed')
        return res.json()
      }
      return callRpc<Invoice>('update_invoice_status', { p_invoice_id: id, p_status: 'PAID' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (USE_MOCKS) {
        const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        return
      }
      // No dedicated RPC was specified for delete in M8.3 (the plan only
      // covers create/status-update) — direct table delete is fine here
      // since RLS (0004) already restricts Invoice writes to Owner/Admin.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('Invoice').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
