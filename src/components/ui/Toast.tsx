import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastVariant = 'default' | 'success' | 'danger'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const bgClasses: Record<ToastVariant, string> = {
  default: 'bg-slate-800',
  success: 'bg-success',
  danger:  'bg-danger',
}

const icons: Record<ToastVariant, string> = {
  default: '💬',
  success: '✓',
  danger:  '✕',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 flex flex-col gap-2 z-50"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-md text-white text-sm font-medium shadow-lg animate-in slide-in-from-right ${bgClasses[t.variant]}`}
          >
            <span aria-hidden="true">{icons[t.variant]}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
