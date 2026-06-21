import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { supabase, USE_MOCKS } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

async function fetchInventoryMock() {
  const res = await fetch('/api/inventory')
  if (!res.ok) throw new Error('Failed to fetch inventory')
  return res.json()
}

// Bug fix: this previously always hit the mock endpoint regardless of
// VITE_USE_MOCKS, so Inventory always showed "retry" once mocks were off.
// RLS (inventory_select_salon) permits any role in the salon to read stock
// levels — matches the existing "Staff can see what's in stock" intent.
async function fetchInventoryLive(salonId: string) {
  const { data, error } = await supabase
    .from('InventoryItem')
    .select('id, name, brand, quantity, lowStockThreshold, unit')
    .eq('salonId', salonId)
    .order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => (USE_MOCKS ? fetchInventoryMock() : fetchInventoryLive(user?.salonId ?? '')),
  })

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('units')

  function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    const newItem = { id: `inv_${Date.now()}`, name, sku: '', quantity: Number(quantity || 0), unit }
    queryClient.setQueryData(['inventory'], (old: any) => [newItem, ...(old || [])])
    setName('')
    setQuantity('1')
    setUnit('units')
  }

  function removeItem(id: string) {
    if (!confirm('Remove this inventory item?')) return
    queryClient.setQueryData(['inventory'], (old: any) => (old || []).filter((i: any) => i.id !== id))
  }

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <form onSubmit={addItem} className="flex items-center gap-2">
          <input className="border border-slate-200 rounded px-2 py-1 text-sm" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-16 border border-slate-200 rounded px-2 py-1 text-sm" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <input className="w-24 border border-slate-200 rounded px-2 py-1 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Button type="submit">Add</Button>
        </form>
      </div>

      {isLoading && <div className="text-sm text-slate-500">Loading…</div>}
      {isError && <div className="text-sm text-red-600">Failed to load inventory</div>}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 gap-3">
          {(data || []).map((item: any) => (
            <Card key={item.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-slate-500">{item.sku || item.id}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-700 text-right">
                  <div className="font-medium">{item.quantity}</div>
                  <div className="text-xs text-slate-400">{item.unit ?? 'units'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => removeItem(item.id)} variant="danger">Remove</Button>
                </div>
              </div>
            </Card>
          ))}
          {data && data.length === 0 && <div className="text-sm text-slate-500">No inventory items</div>}
        </div>
      )}
    </div>
  )
}
