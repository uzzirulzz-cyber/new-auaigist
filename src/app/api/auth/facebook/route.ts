import { NextResponse } from 'next/server'

// GET /api/auth/facebook
export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'https://playbeat.digital'}/api/auth/facebook/callback`

  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Facebook OAuth is not configured. Set FACEBOOK_CLIENT_ID in environment variables.',
        setupUrl: 'https://developers.facebook.com/apps/',
      },
      { status: 503 }
    )
  }

  const scopes = 'email,public_profile'
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${Buffer.from(Math.random().toString()).toString('base64url')}`

  return NextResponse.redirect(authUrl)
}
