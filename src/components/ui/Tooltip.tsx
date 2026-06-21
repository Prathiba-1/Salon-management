import React, { useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  const positionClasses =
    side === 'top'
      ? 'bottom-full mb-1.5'
      : 'top-full mt-1.5'

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 ${positionClasses} whitespace-nowrap bg-slate-800 text-white text-[11px] px-2 py-1 rounded-md pointer-events-none z-50`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
