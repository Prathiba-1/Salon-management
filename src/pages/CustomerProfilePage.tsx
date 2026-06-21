import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomer, useCustomerHistory, useFormulaNotes } from '../hooks/useCustomers'
import { CustomerProfileHeader } from '../components/customers/CustomerProfileHeader'
import { AppointmentHistoryList } from '../components/customers/AppointmentHistoryList'
import { FormulaNotesList } from '../components/customers/FormulaNotesList'
import { CustomerNotes } from '../components/customers/CustomerNotes'
import { Skeleton } from '../components/ui/Skeleton'

type Tab = 'history' | 'formula' | 'notes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'history', label: 'Appointment history' },
  { id: 'formula', label: 'Formula notes' },
  { id: 'notes',   label: 'Notes' },
]

export function CustomerProfilePage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('history')

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id)
  const { data: history = [], isLoading: loadingHistory } = useCustomerHistory(id)
  const { data: formulaNotes = [], isLoading: loadingFormula } = useFormulaNotes(id)

  if (loadingCustomer) return (
    <div className="p-6 flex flex-col gap-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-8 rounded-lg w-64" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )

  if (!customer) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-sm">Customer not found</div>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Back button */}
      <div className="px-6 pt-4 pb-0 flex-shrink-0">
        <button onClick={() => navigate('/customers')} className="text-[12px] text-slate-400 hover:text-brand-blue flex items-center gap-1 mb-1">
          ← Back to customers
        </button>
      </div>

      {/* Profile header */}
      <CustomerProfileHeader customer={customer} history={history} />

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6 flex-shrink-0 bg-white">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-3 text-[13px] border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-brand-blue text-brand-blue font-medium' : 'border-transparent text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'history' && (
          <AppointmentHistoryList history={history} loading={loadingHistory} />
        )}
        {tab === 'formula' && (
          <FormulaNotesList customerId={id} notes={formulaNotes} loading={loadingFormula} />
        )}
        {tab === 'notes' && (
          <CustomerNotes customerId={id} />
        )}
      </div>
    </div>
  )
}
