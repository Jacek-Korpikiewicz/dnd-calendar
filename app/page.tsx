import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarGrid from './components/calendar-grid'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!player?.display_name) redirect('/onboarding')

  return (
    <main className="min-h-screen pt-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-amber-50 tracking-tight">
          D&D on a Bus
        </h1>
        <p className="text-amber-500/60 text-sm mt-0.5">Next stop: adventure</p>
      </div>
      <CalendarGrid player={player} />
    </main>
  )
}
