'use server'

import { redirect } from 'next/navigation'

/** Legacy action — refresh lives under site dashboard now. */
export async function refreshGa4Action(): Promise<void> {
  redirect('/sites')
}
