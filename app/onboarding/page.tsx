import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setDisplayName } from './actions'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('display_name')
    .eq('id', session.user.id)
    .single()

  if (player?.display_name) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mb-4 shadow-lg shadow-amber-900/30">
            <span className="text-2xl">🧙</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-50 tracking-tight">
            Welcome Aboard
          </h1>
          <p className="text-amber-500/80 text-sm mt-1">
            What should we call you, adventurer?
          </p>
        </div>

        <div className="bg-amber-950/40 border border-amber-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          <form action={setDisplayName} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-amber-300/80 mb-1.5">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                maxLength={30}
                className="w-full"
                placeholder="Your character name"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-2.5 rounded-xl font-medium hover:from-amber-500 hover:to-amber-600 transition-all shadow-lg shadow-amber-900/30"
            >
              Board the Bus
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
