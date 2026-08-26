import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'
export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const licenses = await db.digitalLicense.findMany({ where: { customerId: auth.customer.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ ok: true, licenses })
}
