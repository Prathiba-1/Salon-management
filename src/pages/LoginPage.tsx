import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { USE_MOCKS } from '../lib/supabaseClient'
import salonPhoto from '../assets/login-salon.jpg'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in — bounce straight to the dashboard.
  if (!loading && user) {
    return <Navigate to="/daily-pulse" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF7F2]">
      {/* ── Image panel ───────────────────────────────────────────────── */}
      <div className="hidden lg:block relative w-[44%] flex-shrink-0 overflow-hidden bg-[#1C1B19]">
        <img
          src={salonPhoto}
          alt="A row of styling chairs and mirrors at The Glowbright Salon"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Bottom gradient so the wordmark stays legible over the photo */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, rgba(20,19,17,0.78) 0%, rgba(20,19,17,0) 100%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-10 pb-8 text-[#F5F1EA]">
          <span className="text-base leading-none" aria-hidden="true">✦</span>
          <span className="font-serif text-[16px] tracking-tight">The Glowbright Salon</span>
        </div>
      </div>

      {/* ── Form panel ────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 lg:hidden flex items-center gap-2 text-[#2C2622] justify-center">
            <span className="text-lg leading-none" aria-hidden="true">✦</span>
            <span className="font-serif text-[19px] tracking-tight">The Glowbright Salon</span>
          </div>

          <h1 className="font-serif text-[28px] text-[#2C2622] mb-1">Welcome back</h1>
          <p className="font-sans-ui text-[13px] text-[#7A6F63] mb-7">
            Sign in to open today&rsquo;s book.
          </p>

          {USE_MOCKS ? (
            <div className="rounded-lg border border-[#E3DED5] bg-white px-4 py-3.5 text-[13px] text-[#7A6F63] font-sans-ui leading-relaxed">
              <p className="font-medium text-[#2C2622] mb-1">Mock mode is active</p>
              <p>
                VITE_USE_MOCKS is true, so there&rsquo;s no real login right now — the app is using a
                mock signed-in user. Set VITE_USE_MOCKS=false and configure your Supabase env vars
                to sign in here.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans-ui">
              <label className="flex flex-col gap-1.5 text-[12px] text-[#5C5147]">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg border border-[#E3DED5] bg-white text-[14px] text-[#2C2622] placeholder:text-[#B8AC9D] focus:outline-none focus:ring-2 focus:ring-[#3D3A36]/15 focus:border-[#3D3A36] transition-colors"
                  placeholder="you@salon.com"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[12px] text-[#5C5147]">
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3.5 py-2.5 rounded-lg border border-[#E3DED5] bg-white text-[14px] text-[#2C2622] placeholder:text-[#B8AC9D] focus:outline-none focus:ring-2 focus:ring-[#3D3A36]/15 focus:border-[#3D3A36] transition-colors"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <p role="alert" className="text-[12px] text-[#A8453A] bg-[#FBEEEC] rounded-lg px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 px-4 py-2.5 rounded-lg bg-[#2C2622] text-[#FAF7F2] text-[13px] font-medium disabled:opacity-60 hover:bg-[#3D3A36] transition-colors"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
