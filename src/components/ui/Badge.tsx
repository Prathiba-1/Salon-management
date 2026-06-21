import React from 'react'

type Variant = 'blue' | 'amber' | 'green' | 'red' | 'gray'

interface BadgeProps {
  variant?: Variant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  blue:  'bg-brand-blue-light text-brand-blue',
  amber: 'bg-accent-amber-light text-accent-amber',
  green: 'bg-success-bg text-success',
  red:   'bg-danger-bg text-danger',
  gray:  'bg-slate-100 text-slate-600',
}

const dotClasses: Record<Variant, string> = {
  blue:  'bg-brand-blue',
  amber: 'bg-accent-amber',
  green: 'bg-success',
  red:   'bg-danger',
  gray:  'bg-slate-600',
}

export function Badge({ variant = 'gray', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClasses[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  )
}
