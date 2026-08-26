'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#050608] text-slate-400">Loading...</div>}>
      <ForgotForm />
    </Suspense>
  )
}

function ForgotForm() {
  const search = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const data = await res.json()
      if (data?.ok) {
        setSent(true)
        setDevCode(data.resetToken || null)
        toast.success('Reset code sent (if account exists)')
      } else {
        throw new Error(data?.error || 'Request failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050608] px-4 text-white">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="rounded-2xl bg-white/5 p-2 backdrop-blur-md">
            <img src="/playbeat-logo.png" alt="PlayBeat" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Forgot Password?</h1>
          <p className="mt-1 text-sm text-slate-400">Enter your email or phone to receive a reset code.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-md">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Email or Phone Number</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@example.com or +923318333368"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-orange-400/40"
                />
              </div>
            </div>
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-105 disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send Reset Code
            </button>
            <div className="text-center text-xs text-slate-500">
              <a href="/login" className="font-medium text-orange-400 hover:underline">← Back to Login</a>
            </div>
          </form>
        ) : (
          <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h2 className="text-lg font-bold">Reset Code Sent</h2>
            <p className="text-sm text-slate-400">
              If an account exists for <span className="font-semibold text-white">{identifier}</span>, a 6-digit reset code has been sent.
            </p>
            {devCode && (
              <p className="rounded-lg bg-yellow-400/10 px-3 py-2 text-xs text-yellow-400">
                DEV: Your code is <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            <a href={`/reset-password?identifier=${encodeURIComponent(identifier)}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950">
              Enter Reset Code <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
          <span>Protected against account enumeration</span>
        </div>
      </div>
    </div>
  )
}
