import 'server-only'

/**
 * Infrastructure env only. Business platform credentials live encrypted in DB
 * (see lib/credentials/site.ts). Do not re-add GA4_ or META_ business env readers.
 */
function opt(name: string): string | undefined {
  return process.env[name] || undefined
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export const env = {
  DATABASE_URL: () => opt('DATABASE_URL'),
  APP_ENCRYPTION_KEY: () => opt('APP_ENCRYPTION_KEY'),
  GOOGLE_OAUTH_CLIENT_ID: () => opt('GOOGLE_OAUTH_CLIENT_ID'),
  GOOGLE_OAUTH_CLIENT_SECRET: () => opt('GOOGLE_OAUTH_CLIENT_SECRET'),
  requireDatabaseUrl: () => required('DATABASE_URL'),
}
