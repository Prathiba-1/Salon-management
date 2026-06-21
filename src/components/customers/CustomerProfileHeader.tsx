import React from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useToggleVIP } from '../../hooks/useCustomers'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import type { Customer, CustomerHistory } from '../../hooks/useCustomers'

interface Props {
  customer: Customer
  history: CustomerHistory[]
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function CustomerProfileHeader({ customer, history }: Props) {
  const { user } = useAuth()
  const { mutate: toggleVIP, isPending } = useToggleVIP()
  const { toast } = useToast()

  const lifetimeSpend = history.filter(h => h.status === 'COMPLETE').reduce((s, h) => s + h.totalPaid, 0)
  const lastVisit = history[0]?.date ?? null
  const canToggleVIP = user?.role === 'OWNER' || user?.role === 'ADMIN'

  function handleVIP() {
    toggleVIP(customer.id, {
      onError: () => toast('Failed to update VIP status', 'danger'),
    })
  }

  const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-100 bg-white flex-wrap">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-brand-blue text-white text-[15px] font-medium flex items-center justify-center flex-shrink-0">
        {initials}
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[17px] font-medium text-slate-800">{customer.name}</h1>
          {customer.isVIP && <Badge variant="amber">⭐ VIP</Badge>}
        </div>
        <div className="flex gap-4 mt-0.5 flex-wrap">
          <span className="text-[12px] text-slate-400">{customer.phone}</span>
          <span className="text-[12px] text-slate-400">{customer.email}</span>
        </div>
        {/* Stat pills */}
        <div className="flex gap-2 mt-2 flex-wrap">
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[11px] text-slate-400">Total visits</p>
            <p className="text-[14px] font-semibold text-slate-700">{history.length}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[11px] text-slate-400">Lifetime spend</p>
            <p className="text-[14px] font-semibold text-slate-700">{fmtCurrency(lifetimeSpend)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-center">
            <p className="text-[11px] text-slate-400">Last visit</p>
            <p className="text-[14px] font-semibold text-slate-700">{lastVisit ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* VIP toggle */}
      {canToggleVIP && (
        <Button
          variant={customer.isVIP ? 'secondary' : 'ghost'}
          size="sm"
          loading={isPending}
          onClick={handleVIP}
        >
          {customer.isVIP ? 'Remove VIP' : '⭐ Make VIP'}
        </Button>
      )}
    </div>
  )
}
