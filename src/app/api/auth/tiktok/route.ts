import { NextResponse } from 'next/server'

// GET /api/auth/tiktok
export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'https://playbeat.digital'}/api/auth/tiktok/callback`

  if (!clientKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'TikTok OAuth is not configured. Set TIKTOK_CLIENT_KEY in environment variables.',
        setupUrl: 'https://developers.tiktok.com/app/',
      },
      { status: 503 }
    )
  }

  const scopes = 'user.info.basic'
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
    `client_key=${clientKey}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${Buffer.from(Math.random().toString()).toString('base64url')}`

  return NextResponse.redirect(authUrl)
}
