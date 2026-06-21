import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useAddCustomer } from '../../hooks/useCustomers'
import { useToast } from '../ui/Toast'

interface Props { open: boolean; onClose: () => void; onCreated: (id: string) => void }

export function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', isVIP: false })
  const [emailErr, setEmailErr] = useState('')
  const { mutate, isPending } = useAddCustomer()
  const { toast } = useToast()

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
    if (field === 'email') setEmailErr('')
  }

  function handleSubmit() {
    if (!form.name.trim()) return
    mutate(form, {
      onSuccess: (c) => { toast('Customer added', 'success'); onCreated(c.id); onClose() },
      onError: (e: any) => {
        if (e.code === 'DUPLICATE_EMAIL') setEmailErr('This email is already registered')
        else toast('Failed to add customer', 'danger')
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Add customer">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Full name <span className="text-danger">*</span></span>
          <input
            className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="Kavita Sharma"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Phone</span>
          <input
            className="border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            value={form.phone} onChange={(e) => set('phone', e.target.value)}
            placeholder="+91 98765 00000"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input
            className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue ${emailErr ? 'border-danger' : 'border-slate-200'}`}
            value={form.email} onChange={(e) => set('email', e.target.value)}
            placeholder="kavita@example.com"
          />
          {emailErr && <p className="text-[11px] text-danger">{emailErr}</p>}
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isVIP} onChange={(e) => set('isVIP', e.target.checked)} className="w-4 h-4 accent-brand-blue" />
          <span className="text-xs font-medium text-slate-600">Mark as VIP</span>
        </label>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={isPending} disabled={!form.name.trim()} className="flex-1">Add customer</Button>
        </div>
      </div>
    </Modal>
  )
}
