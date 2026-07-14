'use client'

import { usePathname } from 'next/navigation'

import { Sidebar } from './Sidebar'

export function SidebarWithPath({ sites }: { sites: { slug: string; name: string }[] }) {
  const pathname = usePathname()
  const match = pathname.match(/^\/sites\/([^/]+)/)
  const currentSlug = match?.[1]
  return <Sidebar sites={sites} currentSlug={currentSlug} />
}
