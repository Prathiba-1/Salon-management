import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { useAddFormulaNote } from '../../hooks/useCustomers'
import { useToast } from '../ui/Toast'
import type { FormulaNote } from '../../hooks/useCustomers'

const FORMULA_FIELDS = ['brand','shade','developer','ratio','timing'] as const

function NoteCard({ note }: { note: FormulaNote }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-slate-400">{note.createdAt.slice(0,10)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
        {FORMULA_FIELDS.map(f => (
          <div key={f}>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{f}</p>
            <p className="text-[12px] font-medium text-slate-700">{(note as any)[f]}</p>
          </div>
        ))}
      </div>
      {note.notes && (
        <p className="text-[12px] text-slate-500 border-t border-slate-100 pt-2 mt-2">{note.notes}</p>
      )}
    </div>
  )
}

function AddNoteModal({ customerId, open, onClose }: { customerId: string; open: boolean; onClose: () => void }) {
  const blank = { serviceType: '', brand: '', shade: '', developer: '', ratio: '', timing: '', notes: '', stylistId: 'sty_01' }
  const [form, setForm] = useState(blank)
  const { mutate, isPending } = useAddFormulaNote()
  const { toast } = useToast()

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  const required = ['serviceType', ...FORMULA_FIELDS] as const
  const valid = required.every(f => form[f as keyof typeof form].trim())

  function submit() {
    if (!valid) return
    mutate({ ...form, customerId }, {
      onSuccess: () => { toast('Formula note added', 'success'); setForm(blank); onClose() },
      onError: () => toast('Failed to save', 'danger'),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Add formula note">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Service type <span className="text-danger">*</span></span>
          <input className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" value={form.serviceType} onChange={e => set('serviceType', e.target.value)} placeholder="e.g. Balayage" />
        </label>
        {FORMULA_FIELDS.map(f => (
          <label key={f} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600 capitalize">{f} <span className="text-danger">*</span></span>
            <input className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" value={(form as any)[f]} onChange={e => set(f, e.target.value)} placeholder={f === 'brand' ? "L'Oréal" : f === 'developer' ? '20vol' : ''} />
          </label>
        ))}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Notes</span>
          <textarea className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional observations…" />
        </label>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={submit} loading={isPending} disabled={!valid} className="flex-1">Save note</Button>
        </div>
      </div>
    </Modal>
  )
}

interface Props { customerId: string; notes: FormulaNote[]; loading: boolean }

export function FormulaNotesList({ customerId, notes, loading }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (loading) return <div className="flex flex-col gap-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>

  // Group by serviceType
  const groups = notes.reduce<Record<string, FormulaNote[]>>((acc, n) => {
    ;(acc[n.serviceType] ??= []).push(n)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Formula notes</h3>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>+ Add note</Button>
      </div>
      {!notes.length ? (
        <div className="flex flex-col items-center py-10 gap-2 text-center text-slate-400">
          <span className="text-2xl">🧪</span>
          <p className="text-sm">No formula notes yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(groups).map(([type, group]) => {
            const isExp = expanded[type] ?? false
            const visible = isExp ? group : group.slice(0, 5)
            return (
              <div key={type}>
                <p className="text-[11px] font-semibold text-slate-600 mb-2">{type}</p>
                <div className="flex flex-col gap-2">
                  {visible.map(n => <NoteCard key={n.id} note={n} />)}
                </div>
                {group.length > 5 && (
                  <button className="mt-2 text-[11px] text-brand-blue hover:underline" onClick={() => setExpanded(e => ({ ...e, [type]: !isExp }))}>
                    {isExp ? 'Show less' : `Show all ${group.length}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <AddNoteModal customerId={customerId} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
