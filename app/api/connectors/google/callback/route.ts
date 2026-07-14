import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  encodePendingCookie,
  exchangeCodeForTokens,
  verifyOAuthState,
} from '@/lib/google-oauth'

export const dynamic = 'force-dynamic'

const COOKIE = 'amd_google_oauth_pending'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/sites?google_error=${encodeURIComponent(oauthError)}`, req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/sites?google_error=missing_code', req.url))
  }

  try {
    const parsed = verifyOAuthState(state)
    if (parsed.clerkUserId !== userId) {
      throw new Error('OAuth user mismatch')
    }

    const tokens = await exchangeCodeForTokens(code, url.origin)
    if (!tokens.refreshToken) {
      // User may have already granted; try to continue only if we already have tokens stored — for first connect we need refresh
      throw new Error(
        '未拿到 refresh_token。请在 Google 账号权限中移除本应用后重试，或确认 OAuth 客户端类型为 Web。'
      )
    }

    const jar = await cookies()
    jar.set(
      COOKIE,
      encodePendingCookie({
        siteSlug: parsed.siteSlug,
        siteId: parsed.siteId,
        orgId: parsed.orgId,
        clerkUserId: userId,
        refreshToken: tokens.refreshToken,
        exp: Date.now() + 20 * 60_000,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 20 * 60,
      }
    )

    return NextResponse.redirect(
      new URL(`/sites/${parsed.siteSlug}/connections/google/pick`, req.url)
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'oauth_failed'
    return NextResponse.redirect(
      new URL(`/sites?google_error=${encodeURIComponent(msg)}`, req.url)
    )
  }
}
