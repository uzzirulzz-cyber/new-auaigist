import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, signSession, setCustomerCookie } from '@/lib/customer-auth'

const loginAttempts = new Map<string, { count: number; resetAt: number; locked: boolean }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 30 * 60 * 1000

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || entry.resetAt < now) { loginAttempts.set(ip, { count: 0, resetAt: now + WINDOW_MS, locked: false }); return { allowed: true, remaining: MAX_ATTEMPTS } }
  if (entry.locked && entry.resetAt > now) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count }
}

function recordFailed(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS, locked: false }
  entry.count++
  if (entry.count >= MAX_ATTEMPTS) { entry.locked = true; entry.resetAt = now + LOCK_MS }
  loginAttempts.set(ip, entry)
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Too many failed attempts. Try again in 30 minutes.' }, { status: 429 })

  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 })

    const customer = await db.customer.findUnique({ where: { email } })
    if (!customer) { recordFailed(ip); return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 }) }

    const valid = await verifyPassword(password, customer.password)
    if (!valid) {
      recordFailed(ip)
      const remaining = rl.remaining - 1
      const msg = remaining > 0 ? `Invalid email or password. ${remaining} attempts remaining.` : 'Too many failed attempts. Locked for 30 minutes.'
      return NextResponse.json({ ok: false, error: msg }, { status: 401 })
    }

    loginAttempts.delete(ip)
    const token = signSession({ sub: customer.id, email: customer.email, name: customer.name, role: customer.role })
    const res = NextResponse.json({ ok: true, customer: { id: customer.id, email: customer.email, name: customer.name, role: customer.role, emailVerified: customer.emailVerified, avatar: customer.avatar }, requiresVerification: !customer.emailVerified })
    setCustomerCookie(res, token)
    return res
  } catch (e) {
    console.error('[customer.login]', e)
    return NextResponse.json({ ok: false, error: 'Login failed.' }, { status: 500 })
  }
}
