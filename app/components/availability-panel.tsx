'use client'

import { useTransition } from 'react'
import { toggleAvailability } from '@/app/day/[date]/actions'
import { SLOT_LABELS, SLOT_ORDER, type TimeSlot } from '@/lib/types'

interface AvailabilityPanelProps {
  date: string
  currentUserId: string
  availability: { slot: TimeSlot; player_id: string; players: { display_name: string } }[]
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
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-amber-100">Your Availability</h3>
      {SLOT_ORDER.map(slot => {
        const players = playersForSlot(slot)
        const checked = isChecked(slot)
        return (
          <div key={slot} className="bg-amber-900/30 rounded p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isPending}
                  onChange={() => startTransition(() => toggleAvailability(date, slot))}
                  className="rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-200 font-medium">{SLOT_LABELS[slot]}</span>
              </label>
              <span className={`text-sm ${players.length >= 4 ? 'text-green-400 font-bold' : 'text-amber-400'}`}>
                {players.length} player{players.length !== 1 ? 's' : ''}
              </span>
            </div>
            {players.length > 0 && (
              <p className="text-amber-400 text-sm mt-1 ml-6">
                {players.join(', ')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
