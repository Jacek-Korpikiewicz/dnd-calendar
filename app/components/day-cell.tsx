'use client'

import { type TimeSlot } from '@/lib/types'

interface DayCellProps {
  date: string
  dayNumber: number
  isToday: boolean
  availability: Record<TimeSlot, string[]>
  hasSession: 'proposed' | 'confirmed' | null
  onClick: () => void
}

const SLOT_COLORS: Record<TimeSlot, string> = {
  morning: 'bg-yellow-400',
  afternoon: 'bg-orange-400',
  evening: 'bg-indigo-400',
}

export default function DayCell({ dayNumber, isToday, availability, hasSession, onClick }: DayCellProps) {
  const totalPlayers = new Set(
    Object.values(availability).flat()
  ).size

  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 h-24 border border-amber-800/30 rounded text-left
        hover:bg-amber-800/40 transition-colors
        ${isToday ? 'ring-2 ring-amber-400' : ''}
        ${hasSession === 'confirmed' ? 'bg-green-900/30' : hasSession === 'proposed' ? 'bg-blue-900/30' : 'bg-amber-900/20'}
      `}
    >
      <span className={`text-sm font-medium ${isToday ? 'text-amber-300' : 'text-amber-200'}`}>
        {dayNumber}
      </span>
      <div className="flex gap-0.5 mt-1 flex-wrap">
        {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((slot) =>
          availability[slot].length > 0 ? (
            <div
              key={slot}
              className={`${SLOT_COLORS[slot]} rounded-full w-2 h-2`}
              title={`${slot}: ${availability[slot].join(', ')}`}
            />
          ) : null
        )}
      </div>
      {totalPlayers >= 4 && (
        <span className="absolute bottom-1 right-1 text-xs text-green-400 font-bold">
          {totalPlayers}
        </span>
      )}
      {hasSession && (
        <span className="absolute top-1 right-1 text-xs">
          {hasSession === 'confirmed' ? '\u2694\uFE0F' : '\u2753'}
        </span>
      )}
    </button>
  )
}
