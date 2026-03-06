import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setDisplayName } from './actions'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (player?.display_name) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-950">
      <div className="bg-amber-100 border-2 border-amber-800 rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-amber-900 mb-2 text-center">
          Welcome Aboard!
        </h1>
        <p className="text-amber-700 text-center mb-6 text-sm">
          What should we call you, adventurer?
        </p>
        <form action={setDisplayName} className="space-y-4">
          <input
            name="displayName"
            type="text"
            required
            maxLength={30}
            className="block w-full rounded border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 focus:border-amber-600 focus:ring-amber-600"
            placeholder="Your display name"
          />
          <button
            type="submit"
            className="w-full bg-amber-800 text-amber-100 py-2 rounded font-medium hover:bg-amber-700 transition-colors"
          >
            Board the Bus
          </button>
        </form>
      </div>
    </div>
  )
}
