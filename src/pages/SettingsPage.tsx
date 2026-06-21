import React, { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useSettings } from '../contexts/SettingsContext'

export function SettingsPage() {
  const { settings, setSettings } = useSettings()
  const [businessName, setBusinessName] = useState(settings.businessName)
  const [timezone, setTimezone] = useState(settings.timezone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setTimeout(() => {
      setSettings({ businessName, timezone })
      setSaving(false)
      setSaved(true)
    }, 500)
  }

  return (
    <div className="p-6 h-full">
      <h1 className="text-lg font-semibold mb-4">Settings</h1>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Business name</label>
            <input
              className="block w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Timezone</label>
            <select
              className="block w-full border border-slate-200 rounded px-3 py-2 text-sm"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </form>
      </Card>

      <section className="mt-6">
        <h2 className="text-sm font-medium mb-2">Danger zone</h2>
        <Card>
          <p className="text-sm text-slate-500">Resetting will remove demo data in this sandbox.</p>
          <div className="mt-3">
            <Button onClick={() => alert('Reset (mock)')}>Reset demo data</Button>
          </div>
        </Card>
      </section>
    </div>
  )
}
