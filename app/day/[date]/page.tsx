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
    <main className="min-h-screen bg-amber-950 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-400 hover:text-amber-200 text-sm mb-4 inline-block">
          &larr; Back to calendar
        </Link>
        <h1 className="text-2xl font-bold text-amber-100 mb-1">{displayDate}</h1>
        <p className="text-amber-500 text-sm mb-6">Tap slots to toggle your availability</p>

        <div className="space-y-6">
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
