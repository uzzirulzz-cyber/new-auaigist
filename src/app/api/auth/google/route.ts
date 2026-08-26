import { NextResponse } from 'next/server'

// GET /api/auth/google
// Redirects to Google OAuth consent screen
// Requires GOOGLE_CLIENT_ID env var
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'https://playbeat.digital'}/api/auth/google/callback`

  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in environment variables.',
        setupUrl: 'https://console.cloud.google.com/apis/credentials',
      },
      { status: 503 }
    )
  }

  const scopes = 'openid email profile'
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `state=${Buffer.from(Math.random().toString()).toString('base64url')}`

  return NextResponse.redirect(authUrl)
}
