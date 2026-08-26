import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signSession, setCustomerCookie } from '@/lib/customer-auth'

// GET /api/auth/google/callback
// Handles the OAuth callback from Google
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=social_login_cancelled', req.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=social_not_configured', req.url))
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[google callback] No access token:', tokenData)
      return NextResponse.redirect(new URL('/login?error=social_token_failed', req.url))
    }

    const accessToken = tokenData.access_token

    // Step 2: Get user profile from Google
    const profileRes = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
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
      // Create new account from Google data
      const randomPassword = bcrypt.hashSync(Math.random().toString(36).slice(-16), 10)
      customer = await db.customer.create({
        data: {
          email,
          password: randomPassword,
          name: profile.name || 'Google User',
          avatar: profile.picture || null,
          role: 'customer',
          emailVerified: true, // Google email is pre-verified
        },
      })

      await db.notification.create({
        data: {
          customerId: customer.id,
          type: 'system',
          title: 'Welcome to PlayBeat! 🎉',
          message: `Hi ${customer.name}, your account was created via Google.`,
          read: false,
        },
      })
    } else {
      // Update avatar if changed
      if (profile.picture && customer.avatar !== profile.picture) {
        customer = await db.customer.update({
          where: { id: customer.id },
          data: {
            avatar: profile.picture,
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
    console.error('[google callback]', e)
    return NextResponse.redirect(new URL('/login?error=social_callback_failed', req.url))
  }
}
