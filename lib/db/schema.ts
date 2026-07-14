import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  unique,
  jsonb,
  date,
} from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    domain: text('domain'),
    timezone: text('timezone').notNull().default('Asia/Tokyo'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('sites_slug_uidx').on(t.slug)]
)

export const siteMembers = pgTable(
  'site_members',
  {
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    clerkUserId: text('clerk_user_id').notNull(),
    role: text('role').notNull(), // owner | editor | viewer
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.clerkUserId] })]
)

export const orgSecrets = pgTable(
  'org_secrets',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    valueEnc: text('value_enc').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.key] })]
)

export const connections = pgTable(
  'connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(), // ga4 | google_ads | meta_ads | x_ads
    accountId: text('account_id'),
    credentialsEnc: text('credentials_enc'),
    status: text('status').notNull().default('disconnected'), // connected | error | disconnected
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastError: text('last_error'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('connections_site_platform_uidx').on(t.siteId, t.platform)]
)

export const uploadSnapshots = pgTable(
  'upload_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    date: date('date').notNull(),
    metrics: jsonb('metrics').notNull(),
    filename: text('filename'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('upload_snapshots_site_platform_date').on(t.siteId, t.platform, t.date),
  ]
)

export type Organization = typeof organizations.$inferSelect
export type Site = typeof sites.$inferSelect
export type SiteMember = typeof siteMembers.$inferSelect
export type Connection = typeof connections.$inferSelect
export type SiteRole = 'owner' | 'editor' | 'viewer'
export type ConnectionPlatform = 'ga4' | 'google_ads' | 'meta_ads' | 'x_ads'
export type ConnectionStatus = 'connected' | 'error' | 'disconnected'
