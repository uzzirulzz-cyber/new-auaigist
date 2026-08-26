import { NextRequest, NextResponse } from 'next/server'
import { getCustomerFromRequest } from '@/lib/customer-auth'
export async function GET(req: NextRequest) {
  const customer = await getCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ ok: false, customer: null }, { status: 401 })
  return NextResponse.json({ ok: true, customer })
}
