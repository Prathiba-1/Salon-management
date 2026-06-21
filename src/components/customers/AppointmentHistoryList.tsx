import React, { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import type { CustomerHistory } from '../../hooks/useCustomers'

const STATUS_BADGE: Record<string, { variant: 'blue'|'amber'|'green'|'red'|'gray'; label: string }> = {
  PENDING:     { variant: 'amber', label: 'Pending' },
  CONFIRMED:   { variant: 'blue',  label: 'Confirmed' },
  IN_PROGRESS: { variant: 'blue',  label: 'In progress' },
  COMPLETE:    { variant: 'green', label: 'Complete' },
  CANCELLED:   { variant: 'gray',  label: 'Cancelled' },
}

const PAGE_SIZE = 10

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

interface Props { history: CustomerHistory[]; loading: boolean }

export function AppointmentHistoryList({ history, loading }: Props) {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE))
  const slice = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) return <div className="flex flex-col gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>

  if (!history.length) return (
    <div className="flex flex-col items-center py-12 gap-2 text-center">
      <span className="text-3xl">✂️</span>
      <p className="text-sm text-slate-500">No appointment history yet</p>
    </div>
  )

  return (
    <div>
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
        {slice.map((h) => {
          const st = STATUS_BADGE[h.status] ?? STATUS_BADGE.CONFIRMED
          const isOpen = expanded === h.appointmentId
          return (
            <div key={h.appointmentId}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : h.appointmentId)}
                aria-expanded={isOpen}
              >
                <div className="w-[90px] flex-shrink-0">
                  <p className="text-[12px] font-medium text-slate-700">{h.date}</p>
                  <p className="text-[11px] text-slate-400">{h.durationMin} min</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{h.serviceStep}</p>
                  <p className="text-[11px] text-slate-400 truncate">{h.stylistName}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {h.totalPaid > 0 && <span className="text-[12px] font-medium text-slate-600">{fmtCurrency(h.totalPaid)}</span>}
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <span className="text-slate-300 text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex gap-4 pt-2 flex-wrap">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Service</p>
                      <p className="text-[12px] text-slate-700 mt-0.5">{h.serviceStep}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Stylist</p>
                      <p className="text-[12px] text-slate-700 mt-0.5">{h.stylistName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Duration</p>
                      <p className="text-[12px] text-slate-700 mt-0.5">{h.durationMin} min</p>
                    </div>
                    {h.totalPaid > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total paid</p>
                        <p className="text-[12px] text-slate-700 mt-0.5">{fmtCurrency(h.totalPaid)}</p>
                      </div>
                    )}
                  </div>
                  <button className="mt-2 text-[11px] text-brand-blue hover:underline">View Invoice →</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px] text-slate-500">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  )
}
