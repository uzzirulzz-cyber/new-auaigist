import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signSession, setCustomerCookie } from '@/lib/customer-auth'

// GET /api/auth/facebook/callback
// Handles the OAuth callback from Facebook
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=social_login_cancelled', req.url))
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=social_not_configured', req.url))
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`,
      { method: 'GET' }
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[facebook callback] No access token:', tokenData)
      return NextResponse.redirect(new URL('/login?error=social_token_failed', req.url))
    }

    const accessToken = tokenData.access_token

    // Step 2: Get user profile from Facebook
    const profileRes = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${accessToken}`,
      { method: 'GET' }
    )
    const profile = await profileRes.json()

    if (!profile.email) {
      return NextResponse.redirect(new URL('/login?error=social_no_email', req.url))
    }

    // Step 3: Find or create customer
    const email = profile.email.toLowerCase()
    let customer = await db.customer.findUnique({ where: { email } })

    if (!customer) {
      // Create new account from Facebook data
      const randomPassword = bcrypt.hashSync(Math.random().toString(36).slice(-16), 10)
      customer = await db.customer.create({
        data: {
          email,
          password: randomPassword,
          name: profile.name || 'Facebook User',
          avatar: profile.picture?.data?.url || null,
          role: 'customer',
          emailVerified: true, // Facebook email is pre-verified
        },
      })

      // Welcome notification
      await db.notification.create({
        data: {
          customerId: customer.id,
          type: 'system',
          title: 'Welcome to PlayBeat! 🎉',
          message: `Hi ${customer.name}, your account was created via Facebook.`,
          read: false,
        },
      })
    } else {
      // Update avatar if changed
      if (profile.picture?.data?.url && customer.avatar !== profile.picture.data.url) {
        customer = await db.customer.update({
          where: { id: customer.id },
          data: {
            avatar: profile.picture.data.url,
            emailVerified: true,
          },
        })
      }
    }

    // Step 4: Create session
    const token = signSession({
      sub: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role,
    })

    const res = NextResponse.redirect(new URL('/account', req.url))
    setCustomerCookie(res, token)
    return res
  } catch (e) {
    console.error('[facebook callback]', e)
    return NextResponse.redirect(new URL('/login?error=social_callback_failed', req.url))
  }
}
