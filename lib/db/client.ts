import 'server-only'

import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

export type Db = NeonHttpDatabase<typeof schema>

let cached: Db | null = null

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error('DATABASE_URL is not configured')
  }
  if (!cached) {
    cached = drizzle(neon(url), { schema })
  }
  return cached
}
