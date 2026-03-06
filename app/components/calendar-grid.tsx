'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDaysInMonth, getStartPadding, getWeekDays, getWeekDates, formatDate } from '@/lib/calendar'
import { type TimeSlot, type Player } from '@/lib/types'
import CalendarHeader from './calendar-header'
import DayCell from './day-cell'

interface CalendarGridProps {
  player: Player
}

interface DayData {
  availability: Record<TimeSlot, string[]>
  session: 'proposed' | 'confirmed' | null
}

export default function CalendarGrid({ player }: CalendarGridProps) {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [weekBase, setWeekBase] = useState(now)
  const [dayData, setDayData] = useState<Record<string, DayData>>({})

  const fetchData = useCallback(async (dates: Date[]) => {
    const supabase = createClient()
    const dateStrs = dates.map(formatDate)
    const minDate = dateStrs[0]
    const maxDate = dateStrs[dateStrs.length - 1]

    const [availRes, sessionRes] = await Promise.all([
      supabase
        .from('availability')
        .select('date, slot, player_id, players(display_name)')
        .gte('date', minDate)
        .lte('date', maxDate),
      supabase
        .from('sessions')
        .select('date, status')
        .gte('date', minDate)
        .lte('date', maxDate),
    ])

    const data: Record<string, DayData> = {}
    for (const d of dateStrs) {
      data[d] = {
        availability: { morning: [], afternoon: [], evening: [] },
        session: null,
      }
    }

    for (const row of availRes.data || []) {
      const d = row.date as string
      const slot = row.slot as TimeSlot
      const name = (row.players as unknown as { display_name: string })?.display_name || 'Unknown'
      if (data[d]) {
        data[d].availability[slot].push(name)
      }
    }

    for (const row of sessionRes.data || []) {
      const d = row.date as string
      if (data[d]) {
        const status = row.status as 'proposed' | 'confirmed'
        if (data[d].session !== 'confirmed') {
          data[d].session = status
        }
      }
    }

    setDayData(data)
  }, [])

  useEffect(() => {
    if (view === 'month') {
      fetchData(getDaysInMonth(year, month))
    } else {
      fetchData(getWeekDates(weekBase))
    }
  }, [year, month, view, weekBase, fetchData])

  function handlePrev() {
    if (view === 'month') {
      if (month === 0) { setMonth(11); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
    }
  }

  function handleNext() {
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const todayStr = formatDate(now)
  const days = view === 'month' ? getDaysInMonth(year, month) : getWeekDates(weekBase)
  const padding = view === 'month' ? getStartPadding(year, month) : 0

  return (
    <div className="max-w-4xl mx-auto p-4">
      <CalendarHeader
        year={year}
        month={month}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleView={() => setView(v => v === 'month' ? 'week' : 'month')}
        onSignOut={handleSignOut}
        playerName={player.display_name || 'Adventurer'}
      />
      <div className="grid grid-cols-7 gap-1 mb-1">
        {getWeekDays().map(d => (
          <div key={d} className="text-center text-amber-400 text-xs font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: padding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(date => {
          const dateStr = formatDate(date)
          const dd = dayData[dateStr] || { availability: { morning: [], afternoon: [], evening: [] }, session: null }
          return (
            <DayCell
              key={dateStr}
              date={dateStr}
              dayNumber={date.getDate()}
              isToday={dateStr === todayStr}
              availability={dd.availability}
              hasSession={dd.session}
              onClick={() => router.push(`/day/${dateStr}`)}
            />
          )
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-amber-400 justify-center">
        <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Morning</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Afternoon</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1" />Evening</span>
        <span>{'\u2694\uFE0F'} Confirmed</span>
        <span>{'\u2753'} Proposed</span>
      </div>
    </div>
  )
}
