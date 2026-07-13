import 'server-only'

function opt(name: string): string | undefined {
  return process.env[name] || undefined
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const env = {
  AUTH_SECRET: () => required('AUTH_SECRET'),
  AMD_USERS: () => process.env.AMD_USERS ?? '[]',
  GA4_PROPERTY_ID: () => opt('GA4_PROPERTY_ID'),
  GA4_SERVICE_ACCOUNT_JSON: () => opt('GA4_SERVICE_ACCOUNT_JSON'),
}
