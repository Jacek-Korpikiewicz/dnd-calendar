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

const SLOT_STYLES: Record<TimeSlot, { bg: string; ring: string }> = {
  morning: { bg: 'bg-yellow-400', ring: 'ring-yellow-400/30' },
  afternoon: { bg: 'bg-orange-400', ring: 'ring-orange-400/30' },
  evening: { bg: 'bg-indigo-400', ring: 'ring-indigo-400/30' },
}

export default function DayCell({ dayNumber, isToday, availability, hasSession, onClick }: DayCellProps) {
  const totalPlayers = new Set(Object.values(availability).flat()).size
  const hasAvailability = totalPlayers > 0

  return (
    <button
      onClick={onClick}
      className={`
        group relative p-2 min-h-[5.5rem] rounded-xl text-left transition-all duration-150
        border backdrop-blur-sm
        ${isToday
          ? 'border-amber-500/40 bg-amber-800/20 shadow-sm shadow-amber-500/10'
          : 'border-amber-800/15 bg-amber-950/30 hover:bg-amber-900/25 hover:border-amber-700/25'}
        ${hasSession === 'confirmed'
          ? 'border-green-600/30 bg-green-900/15'
          : hasSession === 'proposed'
            ? 'border-blue-600/20 bg-blue-900/10'
            : ''}
      `}
    >
      {/* Day number */}
      <div className="flex items-center justify-between">
        <span className={`
          text-sm font-medium
          ${isToday ? 'text-amber-300' : 'text-amber-200/70 group-hover:text-amber-200'}
        `}>
          {dayNumber}
        </span>
        {hasSession && (
          <span className="text-[10px]">
            {hasSession === 'confirmed' ? '\u2694\uFE0F' : '\u2753'}
          </span>
        )}
      </div>

      {/* Slot indicators */}
      <div className="flex gap-1 mt-2">
        {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((slot) => {
          const count = availability[slot].length
          if (count === 0) return null
          return (
            <div
              key={slot}
              className={`${SLOT_STYLES[slot].bg} rounded-full transition-all`}
              style={{ width: `${Math.min(6 + count * 2, 14)}px`, height: `${Math.min(6 + count * 2, 14)}px` }}
              title={`${slot}: ${availability[slot].join(', ')}`}
            />
          )
        })}
      </div>

      {/* Player count badge */}
      {totalPlayers >= 4 && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-green-600/80 text-[10px] font-bold text-white">
          {totalPlayers}
        </div>
      )}
    </button>
  )
}
