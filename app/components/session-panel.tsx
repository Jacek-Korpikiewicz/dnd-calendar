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
    <div>
      <h3 className="text-sm font-medium text-amber-400/60 uppercase tracking-wider mb-3">Sessions</h3>

      {sessions.length === 0 && !isDm && (
        <p className="text-amber-500/40 text-sm bg-amber-950/30 border border-amber-800/10 rounded-xl p-4">
          No sessions proposed for this day yet.
        </p>
      )}

      <div className="space-y-2">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`rounded-xl p-4 border transition-all ${
              session.status === 'confirmed'
                ? 'bg-green-900/15 border-green-700/25'
                : 'bg-blue-900/10 border-blue-700/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-100 font-medium">{SLOT_LABELS[session.slot]}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                  session.status === 'confirmed'
                    ? 'bg-green-600/20 text-green-400'
                    : 'bg-blue-600/20 text-blue-400'
                }`}>
                  {session.status}
                </span>
              </div>
              {isDm && (
                <div className="flex gap-1.5">
                  {session.status === 'proposed' && (
                    <button
                      disabled={isPending}
                      onClick={() => startTransition(() => confirmSession(session.id, date))}
                      className="text-xs bg-green-600/20 text-green-400 px-2.5 py-1 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => deleteSession(session.id, date))}
                    className="text-xs bg-red-600/15 text-red-400/80 px-2.5 py-1 rounded-lg hover:bg-red-600/25 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <p className="text-amber-500/40 text-xs mt-1.5">
              Proposed by {session.players.display_name}
            </p>
          </div>
        ))}
      </div>

      {isDm && (
        <div className="mt-4 pt-4 border-t border-amber-800/15">
          <p className="text-amber-400/50 text-xs mb-2.5">Propose a session:</p>
          <div className="flex gap-2">
            {SLOT_ORDER.map(slot => (
              <button
                key={slot}
                disabled={isPending}
                onClick={() => startTransition(() => proposeSession(date, slot))}
                className="text-sm bg-amber-800/25 text-amber-300/80 px-4 py-2 rounded-lg border border-amber-700/20 hover:bg-amber-700/30 hover:text-amber-200 transition-all disabled:opacity-50"
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
