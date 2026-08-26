import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req)
    if (!customer) return NextResponse.json({ ok: false, error: 'Session expired.' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const code = String(body?.code || '').trim()
    if (!code || code.length !== 6) return NextResponse.json({ ok: false, error: 'Enter the 6-digit code.' }, { status: 400 })
    const full = await db.customer.findUnique({ where: { id: customer.id } })
    if (!full) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 })
    if (full.emailVerified) return NextResponse.json({ ok: true, message: 'Already verified.' })
    if (!full.verifyToken || full.verifyToken !== code) return NextResponse.json({ ok: false, error: 'Invalid code.' }, { status: 400 })
    if (full.verifyExpires && full.verifyExpires < new Date()) return NextResponse.json({ ok: false, error: 'Code expired.' }, { status: 400 })
    await db.customer.update({ where: { id: customer.id }, data: { emailVerified: true, verifyToken: null, verifyExpires: null } })
    await db.notification.create({ data: { customerId: customer.id, type: 'system', title: 'Welcome to PlayBeat! 🎉', message: `Hi ${customer.name}, your account is verified.`, read: false } })
    return NextResponse.json({ ok: true, message: 'Email verified!' })
  } catch (e) { console.error('[verify-email]', e); return NextResponse.json({ ok: false, error: 'Failed.' }, { status: 500 }) }
}
