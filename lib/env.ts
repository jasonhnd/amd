import 'server-only'

function opt(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  GA4_PROPERTY_ID: () => opt('GA4_PROPERTY_ID'),
  GA4_SERVICE_ACCOUNT_JSON: () => opt('GA4_SERVICE_ACCOUNT_JSON'),
}
