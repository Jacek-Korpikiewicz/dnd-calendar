'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-950">
      <div className="bg-amber-100 border-2 border-amber-800 rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-amber-900 mb-2 text-center">
          D&D on a Bus
        </h1>
        <p className="text-amber-700 text-center mb-6 text-sm">
          Next stop: adventure
        </p>

        {sent ? (
          <div className="text-center">
            <p className="text-amber-900 font-medium">Check your email!</p>
            <p className="text-amber-700 text-sm mt-2">
              We sent a magic link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-amber-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 focus:border-amber-600 focus:ring-amber-600"
                placeholder="adventurer@example.com"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-amber-800 text-amber-100 py-2 rounded font-medium hover:bg-amber-700 transition-colors"
            >
              Send Magic Link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
