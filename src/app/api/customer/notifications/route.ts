import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'
export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const notifications = await db.notification.findMany({ where: { customerId: auth.customer.id }, orderBy: { createdAt: 'desc' }, take: 50 })
  const unread = notifications.filter(n => !n.read).length
  return NextResponse.json({ ok: true, notifications, unread })
}
export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const body = await req.json().catch(() => ({}))
  if (body?.markAll) { await db.notification.updateMany({ where: { customerId: auth.customer.id, read: false }, data: { read: true } }); return NextResponse.json({ ok: true }) }
  if (body?.notificationId) { await db.notification.updateMany({ where: { id: body.notificationId, customerId: auth.customer.id }, data: { read: true } }); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ ok: false, error: 'Provide notificationId or markAll.' }, { status: 400 })
}
