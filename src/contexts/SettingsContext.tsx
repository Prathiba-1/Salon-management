import React, { createContext, useContext, useEffect, useState } from 'react'

interface Settings {
  businessName: string
  timezone: string
}

interface SettingsContextValue {
  settings: Settings
  setSettings: (s: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  businessName: 'The Glowbright Salon',
  timezone: 'UTC',
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem('settings')
      return raw ? JSON.parse(raw) : defaultSettings
    } catch {
      return defaultSettings
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('settings', JSON.stringify(settings))
    } catch {}
  }, [settings])

  function setSettings(p: Partial<Settings>) {
    setSettingsState((s) => ({ ...s, ...p }))
  }

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsProvider
