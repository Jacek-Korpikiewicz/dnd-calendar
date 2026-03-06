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
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-900/30 border border-amber-800/20 text-amber-300 hover:bg-amber-800/40 hover:text-amber-100 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2 className="text-lg font-semibold text-amber-50 min-w-[180px] text-center">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={onNext}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-900/30 border border-amber-800/20 text-amber-300 hover:bg-amber-800/40 hover:text-amber-100 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-amber-400/60 text-sm hidden sm:inline">{playerName}</span>
        <button
          onClick={onToggleView}
          className="px-3 py-1.5 rounded-lg bg-amber-900/30 border border-amber-800/20 text-amber-300 text-sm hover:bg-amber-800/40 hover:text-amber-100 transition-all"
        >
          {view === 'month' ? 'Week' : 'Month'}
        </button>
        <button
          onClick={onSignOut}
          className="px-3 py-1.5 rounded-lg text-amber-500/60 text-sm hover:text-amber-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
