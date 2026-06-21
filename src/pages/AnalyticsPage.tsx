import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UtilisationSnapshot } from '../components/UtilisationSnapshot'
import { DateNavigator } from '../components/DateNavigator'
import type { Stylist } from '../mocks/db'

import { supabase, USE_MOCKS } from '../lib/supabaseClient'

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

function useStylists() {
  return useQuery<Stylist[]>({
    queryKey: ['stylists'],
    queryFn: async () => {
      if (USE_MOCKS) {
        const res = await fetch('/api/stylists')
        if (!res.ok) throw new Error('Failed to fetch stylists')
        return res.json()
      }
      // Bug fix: this previously always hit the mock endpoint regardless of
      // VITE_USE_MOCKS, so Staff details always showed "retry" once mocks
      // were off. RLS (stylist_select_salon) permits any role in the salon
      // to read the roster — no special filtering needed here.
      const { data, error } = await supabase
        .from('Stylist')
        .select('id, name, role, specialties, avatarInitials, shiftStart, shiftEnd')
        .eq('active', true)
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as Stylist[]
    },
    staleTime: 60_000,
  })
}

const ROLE_LABEL: Record<string, string> = {
  SENIOR_STYLIST: 'Senior Stylist',
  STYLIST: 'Stylist',
  MANAGER: 'Manager',
}

const ROLE_COLOR: Record<string, string> = {
  SENIOR_STYLIST: 'bg-brand-blue-light text-brand-blue',
  STYLIST: 'bg-slate-100 text-slate-600',
  MANAGER: 'bg-accent-amber-light text-accent-amber',
}

export function AnalyticsPage() {
  const [date, setDate] = useState(toISO(new Date()))
  const { data: stylists } = useStylists()

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-[18px] font-medium text-slate-800">Staff details</h1>
          <p className="text-xs text-slate-400 mt-0.5">Team roster and today's utilisation</p>
        </div>
        <DateNavigator value={date} onChange={setDate} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Staff roster cards */}
        <section>
          <h2 className="text-[13px] font-medium text-slate-500 mb-3 uppercase tracking-widest text-[10px]">Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(stylists ?? []).map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-100 rounded-xl p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-brand-blue text-white text-[12px] font-medium flex items-center justify-center flex-shrink-0">
                  {s.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-slate-800 truncate">{s.name}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLOR[s.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {ROLE_LABEL[s.role] ?? s.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Shift: {s.shiftStart} – {s.shiftEnd}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.specialties.map((sp) => (
                      <span key={sp} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Utilisation */}
        <section>
          <h2 className="text-[10px] font-medium text-slate-500 mb-3 uppercase tracking-widest">Utilisation — {date}</h2>
          <div className="w-full">
            <UtilisationSnapshot date={date} />
          </div>
        </section>

      </div>
    </div>
  )
}
