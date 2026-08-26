import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/customer-auth'

const rateLimit = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || entry.resetAt < now) { rateLimit.set(ip, { count: 1, resetAt: now + windowMs }); return true }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// POST /api/customer/reset-password
// Body: { identifier, code, newPassword, confirmPassword }
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const identifier = String(body?.identifier || '').trim().toLowerCase()
    const code = String(body?.code || '').trim()
    const newPassword = String(body?.newPassword || '')
    const confirmPassword = String(body?.confirmPassword || '')

    if (!identifier || !code || !newPassword) {
      return NextResponse.json({ ok: false, error: 'All fields are required.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: 'Passwords do not match.' }, { status: 400 })
    }
    // Password strength check
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ ok: false, error: 'Password must contain uppercase, lowercase, and a number.' }, { status: 400 })
    }

    const customer = await db.customer.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: { contains: identifier.replace(/[^\d]/g, '') } }],
      },
    })

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired code.' }, { status: 400 })
    }

    // Verify code
    if (!customer.resetToken || customer.resetToken !== code) {
      return NextResponse.json({ ok: false, error: 'Invalid verification code.' }, { status: 400 })
    }
    if (!customer.resetExpires || customer.resetExpires < new Date()) {
      return NextResponse.json({ ok: false, error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    // Hash new password and clear reset token
    const hashed = await hashPassword(newPassword)
    await db.customer.update({
      where: { id: customer.id },
      data: { password: hashed, resetToken: null, resetExpires: null },
    })

    return NextResponse.json({ ok: true, message: 'Password reset successfully!' })
  } catch (e) {
    console.error('[reset-password]', e)
    return NextResponse.json({ ok: false, error: 'Reset failed.' }, { status: 500 })
  }
}
