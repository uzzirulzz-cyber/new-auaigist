import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Rate limit store (in-memory, per IP)
const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// POST /api/customer/forgot-password
// Body: { identifier: "email or phone" }
// Sends a reset code to email (if found). Always returns success to prevent enumeration.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const identifier = String(body?.identifier || '').trim().toLowerCase()

    if (!identifier) {
      return NextResponse.json(
        { ok: false, error: 'Email or phone number is required.' },
        { status: 400 }
      )
    }

    // Find customer by email or phone
    const customer = await db.customer.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: { contains: identifier.replace(/[^\d]/g, '') } },
        ],
      },
    })

    if (!customer) {
      // Don't reveal whether the email exists — prevent enumeration
      return NextResponse.json({
        ok: true,
        message: 'If an account exists, a reset code has been sent.',
      })
    }

    // Generate 6-digit reset code
    const resetToken = String(Math.floor(100000 + Math.random() * 900000))
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    await db.customer.update({
      where: { id: customer.id },
      data: { resetToken, resetExpires },
    })

    // In production: send email with reset code
    // For dev: return the code
    return NextResponse.json({
      ok: true,
      message: 'If an account exists, a reset code has been sent.',
      // Dev only — remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      devEmail: process.env.NODE_ENV === 'development' ? customer.email : undefined,
    })
  } catch (e) {
    console.error('[forgot-password]', e)
    return NextResponse.json(
      { ok: false, error: 'Request failed.' },
      { status: 500 }
    )
  }
}
