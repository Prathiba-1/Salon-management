import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  /** Use 'metric' for the muted-background summary cards on the Daily Pulse board */
  variant?: 'default' | 'metric'
  onClick?: () => void
}

export function Card({ children, className = '', variant = 'default', onClick }: CardProps) {
  const base =
    variant === 'metric'
      ? 'bg-slate-50 rounded-md p-4'
      : 'bg-white border border-slate-200/60 rounded-lg p-4'

  return (
    <div
      className={[base, onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : '', className].join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  )
}
