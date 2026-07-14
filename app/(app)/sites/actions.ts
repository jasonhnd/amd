'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createSite } from '@/lib/sites/bootstrap'

export async function createSiteAction(formData: FormData): Promise<void> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = String(formData.get('name') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim()
  const domain = String(formData.get('domain') ?? '').trim() || undefined

  if (!name || !slug) {
    throw new Error('名称与 slug 必填')
  }

  const site = await createSite({ clerkUserId: userId, name, slug, domain })
  revalidatePath('/sites')
  redirect(`/sites/${site.slug}/dashboard`)
}
