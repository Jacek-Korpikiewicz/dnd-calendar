'use client'

import { useTransition } from 'react'
import { toggleAvailability } from '@/app/day/[date]/actions'
import { SLOT_LABELS, SLOT_ORDER, type TimeSlot } from '@/lib/types'

interface AvailabilityPanelProps {
  date: string
  currentUserId: string
  availability: { slot: TimeSlot; player_id: string; players: { display_name: string } }[]
}

const SLOT_ACCENTS: Record<TimeSlot, string> = {
  morning: 'border-l-yellow-400',
  afternoon: 'border-l-orange-400',
  evening: 'border-l-indigo-400',
}

export default function AvailabilityPanel({ date, currentUserId, availability }: AvailabilityPanelProps) {
  const [isPending, startTransition] = useTransition()

  function isChecked(slot: TimeSlot) {
    return availability.some(a => a.slot === slot && a.player_id === currentUserId)
  }

  function playersForSlot(slot: TimeSlot) {
    return availability.filter(a => a.slot === slot).map(a => a.players.display_name)
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-amber-400/60 uppercase tracking-wider mb-3">Availability</h3>
      <div className="space-y-2">
        {SLOT_ORDER.map(slot => {
          const players = playersForSlot(slot)
          const checked = isChecked(slot)
          return (
            <div
              key={slot}
              className={`bg-amber-950/40 border border-amber-800/15 border-l-2 ${SLOT_ACCENTS[slot]} rounded-xl p-4 transition-all`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPending}
                    onChange={() => startTransition(() => toggleAvailability(date, slot))}
                  />
                  <span className={`font-medium ${checked ? 'text-amber-100' : 'text-amber-300/70'}`}>
                    {SLOT_LABELS[slot]}
                  </span>
                </label>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${players.length >= 4
                    ? 'bg-green-600/20 text-green-400 font-semibold'
                    : 'bg-amber-800/20 text-amber-400/60'}
                `}>
                  {players.length} player{players.length !== 1 ? 's' : ''}
                </span>
              </div>
              {players.length > 0 && (
                <p className="text-amber-400/50 text-sm mt-2 ml-8">
                  {players.join(', ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
