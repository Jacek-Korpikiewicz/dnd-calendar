'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 mb-4 shadow-lg shadow-amber-900/30">
            <span className="text-2xl">🎲</span>
          </div>
          <h1 className="text-2xl font-bold text-amber-50 tracking-tight">
            D&D on a Bus
          </h1>
          <p className="text-amber-500/80 text-sm mt-1">
            Next stop: adventure
          </p>
        </div>

        {/* Card */}
        <div className="bg-amber-950/40 border border-amber-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-900/30 border border-green-700/30 mb-4">
                <span className="text-xl">✉️</span>
              </div>
              <p className="text-amber-50 font-medium">Check your email</p>
              <p className="text-amber-400/70 text-sm mt-2">
                Magic link sent to <span className="text-amber-300">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-amber-300/80 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                  placeholder="adventurer@example.com"
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-2.5 rounded-xl font-medium hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/30"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
