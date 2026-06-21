import React, { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useInvoices, useCreateInvoice, usePayInvoice, useDeleteInvoice } from '../hooks/useInvoices'

export function InvoicesPage() {
  const { data, isLoading, isError } = useInvoices()
  const createMutation = useCreateInvoice()
  const payMutation = usePayInvoice()
  const deleteMutation = useDeleteInvoice()

  const [customerName, setCustomerName] = useState('')
  const [amount, setAmount] = useState('')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName || !amount) return
    createMutation.mutate({ customerName, amount: Number(amount), date: new Date().toISOString().slice(0, 10) })
    setCustomerName('')
    setAmount('')
  }

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Invoices</h1>
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input className="border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit">Create</Button>
        </form>
      </div>

      {createMutation.isError && (
        <div className="text-sm text-red-600 mb-3">
          {createMutation.error?.message.includes('INVOICE_EXISTS')
            ? 'An invoice already exists for this appointment.'
            : `Failed to create invoice: ${createMutation.error?.message}`}
        </div>
      )}
      {deleteMutation.isError && (
        <div className="text-sm text-red-600 mb-3">Failed to delete invoice: {deleteMutation.error?.message}</div>
      )}
      {payMutation.isError && (
        <div className="text-sm text-red-600 mb-3">Failed to mark invoice paid: {payMutation.error?.message}</div>
      )}

      {isLoading && <div className="text-sm text-slate-500">Loading…</div>}
      {isError && <div className="text-sm text-red-600">Failed to load invoices</div>}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-3">
          {(data || []).map((inv) => (
            <Card key={inv.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{inv.customerName}</div>
                <div className="text-xs text-slate-500">{inv.date} • {inv.appointmentId ?? '—'}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">₹{inv.amount}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${inv.status === 'PAID' ? 'bg-slate-100 text-slate-600' : 'bg-accent-amber-light text-accent-amber'}`}>{inv.status}</div>
                {inv.status !== 'PAID' && (
                  <Button onClick={() => payMutation.mutate(inv.id)}>Mark paid</Button>
                )}
                <Button variant="danger" onClick={() => deleteMutation.mutate(inv.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
