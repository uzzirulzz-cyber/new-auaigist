import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signSession, setCustomerCookie } from '@/lib/customer-auth'

// GET /api/auth/tiktok/callback
// Handles the OAuth callback from TikTok
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=social_login_cancelled', req.url))
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=social_not_configured', req.url))
  }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[tiktok callback] No access token:', tokenData)
      return NextResponse.redirect(new URL('/login?error=social_token_failed', req.url))
    }

    const accessToken = tokenData.access_token
    const openId = tokenData.open_id

    // Step 2: Get user profile from TikTok
    const profileRes = await fetch('https://open.tiktokapis.com/v2/user/info/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: ['open_id', 'union_id', 'avatar_url', 'display_name', 'email'],
      }),
    })
    const profileData = await profileRes.json()

    const profile = profileData?.data?.user || {}
    const email = profile.email ? profile.email.toLowerCase() : null
    const name = profile.display_name || 'TikTok User'
    const avatar = profile.avatar_url || null

    if (!email && !openId) {
      return NextResponse.redirect(new URL('/login?error=social_no_email', req.url))
    }

    // Step 3: Find or create customer
    // TikTok may not always provide email — use openId as fallback identifier
    let customer
    if (email) {
      customer = await db.customer.findUnique({ where: { email } })
    }

    if (!customer) {
      // Create new account from TikTok data
      const randomPassword = bcrypt.hashSync(Math.random().toString(36).slice(-16), 10)
      customer = await db.customer.create({
        data: {
          email: email || `tiktok_${openId}@playbeat.digital`,
          password: randomPassword,
          name,
          avatar,
          role: 'customer',
          emailVerified: !!email, // Only verified if email was provided
        },
      })

      await db.notification.create({
        data: {
          customerId: customer.id,
          type: 'system',
          title: 'Welcome to PlayBeat! 🎉',
          message: `Hi ${name}, your account was created via TikTok.`,
          read: false,
        },
      })
    } else {
      // Update avatar if changed
      if (avatar && customer.avatar !== avatar) {
        customer = await db.customer.update({
          where: { id: customer.id },
          data: { avatar, emailVerified: true },
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
    console.error('[tiktok callback]', e)
    return NextResponse.redirect(new URL('/login?error=social_callback_failed', req.url))
  }
}
