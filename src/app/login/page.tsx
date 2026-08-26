'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="grid min-h-screen place-items-center bg-[#050608] text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>}
    >
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const search = useSearchParams()
  const redirect = search.get('redirect') || '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    fetch('/api/customer/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data?.ok && data?.customer) { setAuthed(true); window.location.href = redirect } })
      .catch(() => {})
  }, [redirect])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, remember }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Login failed')
      if (data.requiresVerification) {
        window.location.href = '/signup'
      } else {
        window.location.href = redirect
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function socialLogin(provider: 'google' | 'facebook' | 'tiktok') {
    setError(null)
    try {
      const res = await fetch(`/api/auth/${provider}`)
      if (res.status === 503) {
        const data = await res.json()
        setError(data?.error || `${provider} login is not configured.`)
        toast.error(`${provider} login is not configured. See setup instructions.`)
        return
      }
      // Redirect to OAuth provider
      window.location.href = res.url
    } catch {
      setError(`${provider} login failed. Please try again.`)
    }
  }

  if (authed) {
    return <div className="grid min-h-screen place-items-center bg-[#050608] text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050608] px-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-white/5 p-2 backdrop-blur-md">
            <img src="/playbeat-logo.png" alt="PlayBeat" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome Back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to your PlayBeat account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Email or Mobile</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type="text"
                autoComplete="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type={showPw ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-slate-400">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-orange-500" />
              Remember me
            </label>
            <a href="/forgot-password" className="text-orange-400 hover:underline">Forgot password?</a>
          </div>

          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Sign In
          </button>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative flex justify-center"><span className="bg-[#0a0e1a] px-3 text-[10px] uppercase tracking-wider text-slate-500">or continue with</span></div>
          </div>

          {/* Social login */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => socialLogin('google')} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button type="button" onClick={() => socialLogin('facebook')} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
              Facebook
            </button>
            <button type="button" onClick={() => socialLogin('tiktok')} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#25F4EE" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.69a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.12z"/><path fill="#000" d="M15.82 8.69v7.04a6.34 6.34 0 0 1-10.86 4.43A6.33 6.33 0 0 1 9.36 9.4a6.84 6.84 0 0 1 1 .05v2.6a2.93 2.93 0 0 0-.88-.13A2.89 2.89 0 0 0 7.17 17a2.89 2.89 0 0 0 5.2-1.74V2h3.45v.44a4.83 4.83 0 0 0 3.77 4.25v3.4a8.16 8.16 0 0 1-4.77-1.4z"/></svg>
              TikTok
            </button>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <a href="/signup" className="font-medium text-orange-400 hover:underline">Create Account</a>
            <a href="/storefront" className="hover:text-slate-300">View Storefront</a>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
          <span>Secured with bcrypt + JWT · Rate limited</span>
        </div>
      </div>
    </div>
  )
}
