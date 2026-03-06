'use client'

interface CalendarHeaderProps {
  year: number
  month: number
  view: 'month' | 'week'
  onPrev: () => void
  onNext: () => void
  onToggleView: () => void
  onSignOut: () => void
  playerName: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarHeader({
  year, month, view, onPrev, onNext, onToggleView, onSignOut, playerName,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onPrev} className="text-amber-200 hover:text-white text-xl px-2">&larr;</button>
        <h2 className="text-xl font-bold text-amber-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={onNext} className="text-amber-200 hover:text-white text-xl px-2">&rarr;</button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-amber-300 text-sm">{playerName}</span>
        <button
          onClick={onToggleView}
          className="bg-amber-800 text-amber-100 px-3 py-1 rounded text-sm hover:bg-amber-700 transition-colors"
        >
          {view === 'month' ? 'Week' : 'Month'}
        </button>
        <button
          onClick={onSignOut}
          className="text-amber-400 hover:text-amber-200 text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
