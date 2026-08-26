'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#050608] text-slate-400">Loading...</div>}>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const search = useSearchParams()
  const initialIdentifier = search.get('identifier') || ''
  const [identifier, setIdentifier] = useState(initialIdentifier)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password strength
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNum = /[0-9]/.test(newPassword)
  const hasLen = newPassword.length >= 8
  const strength = [hasUpper, hasLower, hasNum, hasLen].filter(Boolean).length
  const strengthLabel = strength === 4 ? 'Strong' : strength === 3 ? 'Good' : strength === 2 ? 'Weak' : 'Very weak'
  const strengthColor = strength === 4 ? 'text-emerald-400' : strength === 3 ? 'text-yellow-400' : 'text-red-400'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code: code.join(''), newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Reset failed')
      setDone(true)
      toast.success('Password reset successfully!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050608] px-4 text-white">
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <h2 className="mt-3 text-xl font-bold">Password Reset!</h2>
            <p className="mt-1 text-sm text-slate-400">Your password has been changed successfully.</p>
            <a href="/login" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-3 text-sm font-bold text-slate-950">
              Go to Login <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050608] px-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-white/5 p-2 backdrop-blur-md">
            <img src="/playbeat-logo.png" alt="PlayBeat" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-400">Enter the 6-digit code and your new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Identifier */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Email or Phone</label>
            <input
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
            />
          </div>

          {/* 6-digit code */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Reset Code</label>
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    const next = [...code]; next[i] = val; setCode(next)
                    if (val && i < 5) document.getElementById(`rc-${i + 1}`)?.focus()
                  }}
                  id={`rc-${i}`}
                  className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 text-center text-lg font-bold text-white outline-none focus:border-orange-400/40"
                />
              ))}
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">New Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {newPassword.length > 0 && (
              <div className="mt-1 space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? (strength === 4 ? 'bg-emerald-500' : strength === 3 ? 'bg-yellow-400' : 'bg-red-500') : 'bg-white/10'}`} />
                  ))}
                </div>
                <div className={`text-[10px] ${strengthColor}`}>{strengthLabel} — needs: {!hasUpper && 'uppercase'} {!hasLower && 'lowercase'} {!hasNum && 'number'} {!hasLen && '8+ chars'}</div>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Confirm Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="text-[10px] text-red-400">Passwords do not match</div>
            )}
          </div>

          <button type="submit" disabled={submitting || code.join('').length !== 6 || !newPassword || newPassword !== confirmPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Reset Password
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
          <span>One-time use code · Expires in 30 minutes</span>
        </div>
      </div>
    </div>
  )
}
