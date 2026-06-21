import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomerList } from '../hooks/useCustomers'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { AddCustomerModal } from '../components/customers/AddCustomerModal'
import type { Customer } from '../hooks/useCustomers'

type SortKey = 'name' | 'email' | 'isVIP'
type SortDir = 'asc' | 'desc'

function useDebounce(value: string, delay = 200) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SortButton({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey
  return (
    <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800">
      {label}
      <span className="text-[10px] text-slate-300">{active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </button>
  )
}

export function CustomersPage() {
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [addOpen, setAddOpen] = useState(false)
  const debouncedQ = useDebounce(q)
  const navigate = useNavigate()

  const { data, isLoading } = useCustomerList(debouncedQ)

  const sorted = [...(data ?? [])].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name')  cmp = a.name.localeCompare(b.name)
    if (sortKey === 'email') cmp = a.email.localeCompare(b.email)
    if (sortKey === 'isVIP') cmp = Number(b.isVIP) - Number(a.isVIP)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-[18px] font-medium text-slate-800">Customers</h1>
          <p className="text-xs text-slate-400 mt-0.5">{data?.length ?? 0} clients on record</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Search name, email, phone…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Search customers"
          />
          <Button size="sm" onClick={() => setAddOpen(true)}>+ Add customer</Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <span className="text-4xl">👤</span>
            <p className="text-sm text-slate-500">No customers found</p>
            {q && <p className="text-xs text-slate-400">Try a different search</p>}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_120px_80px] gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <SortButton label="Name"  sortKey="name"  current={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortButton label="Email" sortKey="email" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <span className="text-[11px] font-medium text-slate-500">Phone</span>
              <SortButton label="VIP"   sortKey="isVIP" current={sortKey} dir={sortDir} onSort={toggleSort} />
            </div>
            <div className="divide-y divide-slate-50">
              {sorted.map((c: Customer) => (
                <button
                  key={c.id}
                  className="grid grid-cols-[1fr_1fr_120px_80px] gap-4 px-4 py-3 w-full text-left hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <span className="text-[13px] font-medium text-slate-800 truncate">{c.name}</span>
                  <span className="text-[12px] text-slate-500 truncate">{c.email}</span>
                  <span className="text-[12px] text-slate-500 truncate">{c.phone}</span>
                  <span>{c.isVIP && <Badge variant="amber">⭐ VIP</Badge>}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={(id) => navigate(`/customers/${id}`)} />
    </div>
  )
}
