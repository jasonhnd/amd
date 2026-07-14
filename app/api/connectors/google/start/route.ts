import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'

import {
  buildGoogleAuthUrl,
  isGoogleOAuthConfigured,
  signOAuthState,
} from '@/lib/google-oauth'
import { requireSiteAccess } from '@/lib/sites/access'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google OAuth 未配置。请在 Vercel 设置 GOOGLE_OAUTH_CLIENT_ID 与 GOOGLE_OAUTH_CLIENT_SECRET。',
      },
      { status: 503 }
    )
  }

  const url = new URL(req.url)
  const slug = url.searchParams.get('site')
  if (!slug) {
    return NextResponse.json({ error: 'missing site' }, { status: 400 })
  }

  try {
    const { site } = await requireSiteAccess(slug, userId, 'editor')
    const origin = url.origin
    const state = signOAuthState({
      siteSlug: site.slug,
      siteId: site.id,
      orgId: site.orgId,
      clerkUserId: userId,
      nonce: randomBytes(8).toString('hex'),
      exp: Date.now() + 15 * 60_000,
    })
    return NextResponse.redirect(buildGoogleAuthUrl({ origin, state }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'forbidden'
    return NextResponse.json({ error: msg }, { status: 403 })
  }
}
