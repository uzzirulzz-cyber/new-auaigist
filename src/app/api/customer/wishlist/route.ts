import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomer } from '@/lib/customer-auth'
export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const products = await db.product.findMany({ where: { id: { in: auth.customer.wishlist || [] } }, select: { id: true, sku: true, name: true, description: true, category: true, price: true, currency: true, originalPrice: true, originalCurrency: true, region: true, stock: true, status: true, image: true, images: true, digital: true, deliveryMethod: true, tags: true, rating: true, reviewCount: true, salesCount: true, featured: true, trending: true, bestSeller: true, flashDeal: true, brand: true } })
  return NextResponse.json({ ok: true, products })
}
export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req); if ('error' in auth) return auth.error
  const body = await req.json().catch(() => ({}))
  const productId = String(body?.productId || ''); const action = String(body?.action || 'toggle')
  if (!productId) return NextResponse.json({ ok: false, error: 'productId required.' }, { status: 400 })
  const current = auth.customer.wishlist || []
  let next: string[]
  if (action === 'add') next = current.includes(productId) ? current : [...current, productId]
  else if (action === 'remove') next = current.filter(id => id !== productId)
  else next = current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId]
  await db.customer.update({ where: { id: auth.customer.id }, data: { wishlist: next } })
  return NextResponse.json({ ok: true, wishlist: next, inWishlist: next.includes(productId) })
}
