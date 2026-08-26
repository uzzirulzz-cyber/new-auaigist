import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req)
    if (!customer) return NextResponse.json({ ok: false, error: 'Session expired.' }, { status: 401 })
    if (customer.emailVerified) return NextResponse.json({ ok: true, message: 'Already verified.' })
    const verifyToken = String(Math.floor(100000 + Math.random() * 900000))
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await db.customer.update({ where: { id: customer.id }, data: { verifyToken, verifyExpires } })
    return NextResponse.json({ ok: true, message: 'Code sent.', verifyToken: process.env.NODE_ENV === 'development' ? verifyToken : undefined })
  } catch (e) { return NextResponse.json({ ok: false, error: 'Failed.' }, { status: 500 }) }
}
