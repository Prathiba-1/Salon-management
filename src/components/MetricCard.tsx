import React, { useEffect, useRef } from 'react'
import { Skeleton } from './ui/Skeleton'

interface MetricCardProps {
  label: string
  value: number | null
  format?: 'currency' | 'percent' | 'number'
  trend?: number | null        // +/- percent vs last period
  badge?: string               // e.g. "68% of revenue"
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  children?: React.ReactNode   // optional breakdown rows
}

function formatValue(value: number, format: MetricCardProps['format'], locale = 'en-IN') {
  if (format === 'currency') {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(value)
  }
  if (format === 'percent') {
    return `${Math.round(value * 100)}%`
  }
  return new Intl.NumberFormat(locale).format(value)
}

/** Animates the displayed number when `value` changes */
function useCountUp(target: number | null, duration = 600) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef<number>(0)

  useEffect(() => {
    if (target === null || !ref.current) return
    const start = prev.current
    const end = target
    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)   // ease-out cubic
      const current = Math.round(start + (end - start) * eased)
      if (ref.current) ref.current.textContent = String(current)
      if (progress < 1) requestAnimationFrame(step)
      else prev.current = end
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return ref
}

export function MetricCard({
  label, value, format = 'number', trend, badge, loading, error, onRetry, children,
}: MetricCardProps) {
  const countRef = useCountUp(value)

  if (loading) {
    return (
      <div className="bg-slate-50 rounded-md p-4 flex flex-col gap-2">
        <Skeleton h={11} w="2/5" />
        <Skeleton h={28} w="3/5" />
        <Skeleton h={10} w="1/3" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-50 rounded-md p-4 flex flex-col items-start gap-2">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xs text-danger">Failed to load</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-medium text-brand-blue hover:underline"
          >
            Retry →
          </button>
        )}
      </div>
    )
  }

  const isUp = trend !== null && trend !== undefined && trend > 0
  const isDown = trend !== null && trend !== undefined && trend < 0

  return (
    <div className="bg-slate-50 rounded-md p-4 flex flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">{label}</p>

      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-[22px] font-medium text-slate-800 leading-none">
          {value !== null && format === 'currency'
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
            : format === 'percent' && value !== null
            ? `${Math.round(value * 100)}%`
            : <span ref={countRef}>{value ?? '—'}</span>
          }
        </span>
        {badge && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-brand-blue-light text-brand-blue">
            {badge}
          </span>
        )}
      </div>

      {trend !== null && trend !== undefined && (
        <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isUp ? 'text-success' : isDown ? 'text-danger' : 'text-slate-400'}`}>
          <span aria-hidden="true">{isUp ? '↑' : isDown ? '↓' : '→'}</span>
          <span>{Math.abs(trend)}% vs last week</span>
        </p>
      )}

      {children && <div className="mt-2 border-t border-slate-200 pt-2">{children}</div>}
    </div>
  )
}

interface BreakdownRowProps {
  label: string
  value: number
  format?: MetricCardProps['format']
  share?: number   // 0–1
}

export function BreakdownRow({ label, value, format = 'currency', share }: BreakdownRowProps) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-500">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {share !== undefined && (
          <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-blue-mid rounded-full"
              style={{ width: `${Math.round(share * 100)}%` }}
            />
          </div>
        )}
        <span className="font-medium text-slate-700">
          {format === 'currency'
            ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
            : format === 'percent'
            ? `${Math.round(value * 100)}%`
            : value}
        </span>
      </div>
    </div>
  )
}
