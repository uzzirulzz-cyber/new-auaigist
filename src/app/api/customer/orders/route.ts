import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'
export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const orders = await db.order.findMany({ where: { customerId: auth.customer.id }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ ok: true, orders })
}
