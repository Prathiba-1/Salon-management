import React, { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

interface Webhook {
  id: string
  url: string
  event: string
}

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: 'wh_1', url: 'https://example.com/hook', event: 'appointment.created' },
  ])
  const [newUrl, setNewUrl] = useState('')
  const [newEvent, setNewEvent] = useState('appointment.created')

  function addWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl) return
    setWebhooks((s) => [...s, { id: `wh_${Date.now()}`, url: newUrl, event: newEvent }])
    setNewUrl('')
  }

  function removeWebhook(id: string) {
    setWebhooks((s) => s.filter((w) => w.id !== id))
  }

  return (
    <div className="p-6 h-full">
      <h1 className="text-lg font-semibold mb-4">Webhooks</h1>

      <Card>
        <form onSubmit={addWebhook} className="flex gap-2 items-center">
          <input
            className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="https://your.endpoint/hook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <select className="border border-slate-200 rounded px-2 py-2 text-sm" value={newEvent} onChange={(e) => setNewEvent(e.target.value)}>
            <option value="appointment.created">appointment.created</option>
            <option value="customer.updated">customer.updated</option>
          </select>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <section className="mt-4">
        <h2 className="text-sm font-medium mb-2">Registered webhooks</h2>
        <div className="flex flex-col gap-2">
          {webhooks.map((w) => (
            <Card key={w.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{w.event}</div>
                <div className="text-xs text-slate-500">{w.url}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => alert('Test webhook (mock)')}>Test</Button>
                <Button onClick={() => removeWebhook(w.id)} variant="danger">Remove</Button>
              </div>
            </Card>
          ))}
          {webhooks.length === 0 && <div className="text-sm text-slate-500">No webhooks configured</div>}
        </div>
      </section>
    </div>
  )
}
