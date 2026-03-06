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
    <main className="min-h-screen bg-amber-950">
      <div className="text-center pt-6 pb-2">
        <h1 className="text-3xl font-bold text-amber-100">D&amp;D on a Bus</h1>
        <p className="text-amber-500 text-sm">Next stop: adventure</p>
      </div>
      <CalendarGrid player={player} />
    </main>
  )
}
