import React, { useState, useEffect, useRef } from 'react'
import { useCustomerNote, useSaveCustomerNote } from '../../hooks/useCustomers'

interface Props { customerId: string }

export function CustomerNotes({ customerId }: Props) {
  const { data } = useCustomerNote(customerId)
  const { mutate: save } = useSaveCustomerNote()
  const [body, setBody] = useState('')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data?.body !== undefined) setBody(data.body)
  }, [data?.body])

  function handleChange(val: string) {
    setBody(val)
    setSaved(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      save({ customerId, body: val }, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) } })
    }, 1000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Notes</h3>
        {saved && <span className="text-[11px] text-success">Saved ✓</span>}
      </div>
      <textarea
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
        rows={4}
        value={body}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="General notes about this client — preferences, allergies, special requests…"
        aria-label="Customer notes"
      />
    </div>
  )
}
