'use server'

import { revalidatePath } from 'next/cache'

import { refreshGa4 } from '@/lib/ga4-service'

export async function refreshGa4Action(): Promise<void> {
  await refreshGa4()
  revalidatePath('/dashboard')
}
