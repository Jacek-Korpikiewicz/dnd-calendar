'use client'

import { useTransition } from 'react'
import { proposeSession, confirmSession, deleteSession } from '@/app/day/[date]/actions'
import { SLOT_LABELS, SLOT_ORDER, type TimeSlot, type Session } from '@/lib/types'

interface SessionPanelProps {
  date: string
  sessions: (Session & { players: { display_name: string } })[]
  isDm: boolean
}

export default function SessionPanel({ date, sessions, isDm }: SessionPanelProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-amber-100">Sessions</h3>

      {sessions.length === 0 && (
        <p className="text-amber-500 text-sm">No sessions proposed for this day.</p>
      )}

      {sessions.map(session => (
        <div
          key={session.id}
          className={`rounded p-3 ${session.status === 'confirmed' ? 'bg-green-900/30 border border-green-700' : 'bg-blue-900/30 border border-blue-700'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-100 font-medium">{SLOT_LABELS[session.slot]}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${session.status === 'confirmed' ? 'bg-green-700 text-green-100' : 'bg-blue-700 text-blue-100'}`}>
                {session.status}
              </span>
            </div>
            {isDm && (
              <div className="flex gap-2">
                {session.status === 'proposed' && (
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => confirmSession(session.id, date))}
                    className="text-xs bg-green-700 text-green-100 px-2 py-1 rounded hover:bg-green-600"
                  >
                    Confirm
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteSession(session.id, date))}
                  className="text-xs bg-red-800 text-red-100 px-2 py-1 rounded hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <p className="text-amber-500 text-xs mt-1">
            Proposed by {session.players.display_name}
          </p>
        </div>
      ))}

      {isDm && (
        <div className="pt-2 border-t border-amber-800/50">
          <p className="text-amber-400 text-sm mb-2">Propose a session:</p>
          <div className="flex gap-2">
            {SLOT_ORDER.map(slot => (
              <button
                key={slot}
                disabled={isPending}
                onClick={() => startTransition(() => proposeSession(date, slot))}
                className="text-xs bg-amber-800 text-amber-100 px-3 py-1.5 rounded hover:bg-amber-700 transition-colors"
              >
                {slot.charAt(0).toUpperCase() + slot.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
