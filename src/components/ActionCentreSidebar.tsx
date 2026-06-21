import React from 'react'
import { useActionAlerts, useResolveAlert, type ActionAlert, type AlertType } from '../hooks/useActionAlerts'
import { useToast } from './ui/Toast'
import { Skeleton } from './ui/Skeleton'

// ─── Per-variant config ───────────────────────────────────────────────────────

const ALERT_CONFIG: Record<AlertType, {
  borderColor: string
  iconBg: string
  iconColor: string
  icon: string
  ctaLabel?: string
  ctaColor: string
  isOutOfStock?: boolean
}> = {
  VIP_PENDING:   { borderColor: 'border-l-brand-blue-mid',   iconBg: 'bg-brand-blue-light', iconColor: 'text-brand-blue',  icon: '⭐', ctaLabel: 'Approve',     ctaColor: 'text-brand-blue' },
  LOW_INVENTORY: { borderColor: 'border-l-accent-amber-mid', iconBg: 'bg-accent-amber-light', iconColor: 'text-accent-amber', icon: '📦', ctaLabel: 'Order',       ctaColor: 'text-accent-amber' },
  OUT_OF_STOCK:  { borderColor: 'border-l-danger',           iconBg: 'bg-danger-bg',        iconColor: 'text-danger',      icon: '🚫', ctaLabel: undefined,      ctaColor: 'text-danger', isOutOfStock: true },
  CONFLICT:      { borderColor: 'border-l-danger',           iconBg: 'bg-danger-bg',        iconColor: 'text-danger',      icon: '⚠️', ctaLabel: 'Resolve',      ctaColor: 'text-danger' },
}

// ─── Single alert card ────────────────────────────────────────────────────────

function AlertCard({ alert, isHistorical }: { alert: ActionAlert; isHistorical: boolean }) {
  const config = ALERT_CONFIG[alert.type]
  const { mutate: resolve, isPending, isError } = useResolveAlert()
  const { toast } = useToast()

  function handleCta() {
    resolve(alert.id, {
      onSuccess: () => {
        const verb = config.ctaLabel === 'Approve' ? 'approved' : config.ctaLabel === 'Order' ? 'order placed' : 'resolved'
        toast(`Alert ${verb}`, 'success')
      },
      onError: () => toast('Action failed — please try again', 'danger'),
    })
  }

  return (
    <div
      className={`bg-white border border-slate-100 border-l-4 ${config.borderColor} rounded-r-md p-3 flex items-start gap-2.5`}
      role="listitem"
    >
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${config.iconBg}`}>
        <span className="text-sm" aria-hidden="true">{config.icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-800 leading-tight">{alert.title}</p>
          {isError && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-danger-bg text-danger rounded-full flex-shrink-0">
              Error
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">{alert.subtitle}</p>

        {!isHistorical && (
          <div className="mt-1.5">
            {config.isOutOfStock ? (
              <span className="text-[11px] font-semibold text-danger uppercase tracking-wide">
                Out of stock
              </span>
            ) : config.ctaLabel ? (
              <button
                onClick={handleCta}
                disabled={isPending}
                className={`text-[11px] font-medium ${config.ctaColor} hover:underline disabled:opacity-50`}
                aria-label={`${config.ctaLabel}: ${alert.title}`}
              >
                {isPending ? 'Processing…' : `${config.ctaLabel} →`}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface ActionCentreSidebarProps {
  isHistorical?: boolean
}

export function ActionCentreSidebar({ isHistorical = false }: ActionCentreSidebarProps) {
  const { data: alerts, isLoading, isError } = useActionAlerts()

  const visibleAlerts = (alerts ?? []).slice(0, 20)

  return (
    <aside
      className="w-[280px] flex-shrink-0 flex flex-col border-l border-slate-100 bg-white"
      aria-label="Action centre"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Action centre
        </h2>
        {!isLoading && visibleAlerts.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger-bg text-danger">
            {visibleAlerts.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3" role="list" aria-label="Alerts list">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-50 rounded-md p-3 flex gap-2.5">
                <Skeleton h={28} w="7" className="rounded-full" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton h={11} w="4/5" />
                  <Skeleton h={10} w="3/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="text-xs text-slate-400 text-center py-6">
            Failed to load alerts
          </p>
        )}

        {!isLoading && !isError && visibleAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-3xl" aria-hidden="true">✅</span>
            <p className="text-xs font-medium text-slate-600">All clear</p>
            <p className="text-[11px] text-slate-400">No pending actions right now</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col gap-2">
            {visibleAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} isHistorical={isHistorical} />
            ))}
          </div>
        )}

        {isHistorical && visibleAlerts.length > 0 && (
          <p className="text-[11px] text-slate-400 text-center mt-3">
            Historical view — actions are read-only
          </p>
        )}
      </div>
    </aside>
  )
}
