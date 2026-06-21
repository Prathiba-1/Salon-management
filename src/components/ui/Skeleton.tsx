import React from 'react'

interface SkeletonProps {
  className?: string
  /** Convenience: height in px, e.g. 16 */
  h?: number
  /** Convenience: width as Tailwind fraction string, e.g. '3/4' */
  w?: string
}

export function Skeleton({ className = '', h, w }: SkeletonProps) {
  const hStyle = h ? { height: `${h}px` } : undefined
  const wClass = w ? `w-${w}` : 'w-full'
  return (
    <div
      aria-hidden="true"
      style={hStyle}
      className={`animate-pulse bg-slate-100 rounded ${wClass} ${className}`}
    />
  )
}

/** Drop-in replacement for metric card content while loading */
export function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton h={11} w="1/2" />
      <Skeleton h={24} w="2/5" />
      <Skeleton h={10} w="2/5" />
    </div>
  )
}
