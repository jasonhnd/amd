import 'server-only'

function opt(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  GA4_PROPERTY_ID: () => opt('GA4_PROPERTY_ID'),
  GA4_SERVICE_ACCOUNT_JSON: () => opt('GA4_SERVICE_ACCOUNT_JSON'),
  GOOGLE_ADS_DEVELOPER_TOKEN: () => opt('GOOGLE_ADS_DEVELOPER_TOKEN'),
  GOOGLE_ADS_CUSTOMER_ID: () => opt('GOOGLE_ADS_CUSTOMER_ID'),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: () => opt('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
  GOOGLE_ADS_SERVICE_ACCOUNT_JSON: () => opt('GOOGLE_ADS_SERVICE_ACCOUNT_JSON'),
}
