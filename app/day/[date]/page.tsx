import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AvailabilityPanel from '@/app/components/availability-panel'
import SessionPanel from '@/app/components/session-panel'

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [playerRes, availRes, sessionRes] = await Promise.all([
    supabase.from('players').select('*').eq('id', session.user.id).single(),
    supabase
      .from('availability')
      .select('*, players(display_name)')
      .eq('date', date),
    supabase
      .from('sessions')
      .select('*, players:proposed_by(display_name)')
      .eq('date', date),
  ])

  const player = playerRes.data
  if (!player) redirect('/login')

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-amber-500/60 text-sm hover:text-amber-300 transition-colors mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to calendar
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-bold text-amber-50">{displayDate}</h1>
          <p className="text-amber-500/50 text-sm mt-0.5">Tap slots to toggle your availability</p>
        </div>

        <div className="space-y-8">
          <AvailabilityPanel
            date={date}
            currentUserId={session.user.id}
            availability={(availRes.data || []) as any}
          />
          <SessionPanel
            date={date}
            sessions={(sessionRes.data || []) as any}
            isDm={player.is_dm}
          />
        </div>
      </div>
    </main>
  )
}
