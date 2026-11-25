import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
)

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const workspace = sqliteTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const workspaceMember = sqliteTable(
  "workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("workspace_member_workspace_user_idx").on(
      table.workspaceId,
      table.userId
    ),
    index("workspace_member_userId_idx").on(table.userId),
  ]
)

export const workspaceInvite = sqliteTable(
  "workspace_invite",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("workspace_invite_workspace_email_idx").on(
      table.workspaceId,
      table.email
    ),
    index("workspace_invite_email_idx").on(table.email),
  ]
)

export const site = sqliteTable(
  "site",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    writeKeyHash: text("write_key_hash").notNull().unique(),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [index("site_workspaceId_idx").on(table.workspaceId)]
)

export const event = sqliteTable(
  "event",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    timestamp: integer("timestamp").notNull(),
    name: text("name").notNull(),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id").notNull(),
    path: text("path").notNull(),
    referrerHost: text("referrer_host").notNull().default(""),
    referrerPath: text("referrer_path").notNull().default(""),
    country: text("country").notNull().default(""),
    city: text("city").notNull().default(""),
    browser: text("browser").notNull().default(""),
    device: text("device").notNull().default(""),
    os: text("os").notNull().default(""),
    screen: text("screen").notNull().default(""),
    utmSource: text("utm_source").notNull().default(""),
    utmMedium: text("utm_medium").notNull().default(""),
    utmCampaign: text("utm_campaign").notNull().default(""),
    utmContent: text("utm_content").notNull().default(""),
    utmTerm: text("utm_term").notNull().default(""),
  },
  (table) => [
    index("event_site_timestamp_idx").on(table.siteId, table.timestamp),
  ]
)

export const eventProp = sqliteTable(
  "event_prop",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    timestamp: integer("timestamp").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    index("event_prop_eventId_idx").on(table.eventId),
    index("event_prop_site_timestamp_idx").on(table.siteId, table.timestamp),
    index("event_prop_site_key_idx").on(table.siteId, table.key),
  ]
)

export const visitor = sqliteTable(
  "visitor",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    anonymousId: text("anonymous_id").notNull(),
    userId: text("user_id").notNull().default(""),
    email: text("email").notNull().default(""),
    firstPath: text("first_path").notNull().default(""),
    firstReferrerHost: text("first_referrer_host").notNull().default(""),
    firstReferrerPath: text("first_referrer_path").notNull().default(""),
    firstUtmSource: text("first_utm_source").notNull().default(""),
    firstUtmMedium: text("first_utm_medium").notNull().default(""),
    firstUtmCampaign: text("first_utm_campaign").notNull().default(""),
    firstUtmContent: text("first_utm_content").notNull().default(""),
    firstUtmTerm: text("first_utm_term").notNull().default(""),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    identifiedAt: integer("identified_at"),
  },
  (table) => [
    uniqueIndex("visitor_site_anonymous_idx").on(
      table.siteId,
      table.anonymousId
    ),
    index("visitor_site_userId_idx").on(table.siteId, table.userId),
    index("visitor_site_email_idx").on(table.siteId, table.email),
  ]
)

export const visitorIdentity = sqliteTable(
  "visitor_identity",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    userRef: text("user_ref").notNull(),
    emailHash: text("email_hash"),
    signedUpAt: integer("signed_up_at").notNull(),
    country: text("country").notNull().default(""),
    device: text("device").notNull().default(""),
    firstSource: text("first_source").notNull(),
    firstMedium: text("first_medium").notNull().default(""),
    firstCampaign: text("first_campaign").notNull().default(""),
    firstReferrer: text("first_referrer").notNull().default(""),
    firstLanding: text("first_landing").notNull().default(""),
    firstSeenAt: integer("first_seen_at").notNull(),
    lastSource: text("last_source").notNull(),
    lastMedium: text("last_medium").notNull().default(""),
    lastCampaign: text("last_campaign").notNull().default(""),
    lastReferrer: text("last_referrer").notNull().default(""),
    lastLanding: text("last_landing").notNull().default(""),
    lastSeenAt: integer("last_seen_at").notNull(),
  },
  (table) => [
    uniqueIndex("visitor_identity_site_user_idx").on(
      table.siteId,
      table.userRef
    ),
    index("visitor_identity_site_email_idx").on(table.siteId, table.emailHash),
    index("visitor_identity_site_signed_up_idx").on(
      table.siteId,
      table.signedUpAt
    ),
  ]
)

export const stripeConnection = sqliteTable("stripe_connection", {
  siteId: text("site_id")
    .primaryKey()
    .references(() => site.id, { onDelete: "cascade" }),
  apiKeyCipher: text("api_key_cipher").notNull(),
  apiKeyHint: text("api_key_hint").notNull(),
  webhookSecretCipher: text("webhook_secret_cipher"),
  livemode: integer("livemode", { mode: "boolean" }).notNull(),
  syncPhase: text("sync_phase").notNull().default("customers"),
  syncCursor: text("sync_cursor"),
  syncedAt: integer("synced_at"),
  syncError: text("sync_error"),
  lastWebhookAt: integer("last_webhook_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const stripeCustomer = sqliteTable(
  "stripe_customer",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    email: text("email").notNull().default(""),
    emailHash: text("email_hash"),
    name: text("name").notNull().default(""),
    userRef: text("user_ref"),
    identityId: text("identity_id").references(() => visitorIdentity.id, {
      onDelete: "set null",
    }),
    currency: text("currency").notNull().default(""),
    mrr: integer("mrr").notNull().default(0),
    firstPaidAt: integer("first_paid_at"),
    churnedAt: integer("churned_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("stripe_customer_site_id_idx").on(table.siteId, table.id),
    index("stripe_customer_site_identity_idx").on(
      table.siteId,
      table.identityId
    ),
    index("stripe_customer_site_email_idx").on(table.siteId, table.emailHash),
  ]
)

export const mrrSnapshot = sqliteTable(
  "mrr_snapshot",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull(),
    customerId: text("customer_id").notNull(),
    subscriptionId: text("subscription_id").notNull(),
    at: integer("at").notNull(),
    mrr: integer("mrr").notNull(),
    currency: text("currency").notNull(),
  },
  (table) => [
    uniqueIndex("mrr_snapshot_site_source_idx").on(
      table.siteId,
      table.sourceId
    ),
    index("mrr_snapshot_site_customer_idx").on(table.siteId, table.customerId),
  ]
)

export const revenueMovement = sqliteTable(
  "revenue_movement",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    kind: text("kind").notNull(),
    amount: integer("amount").notNull(),
    mrrAfter: integer("mrr_after").notNull(),
    currency: text("currency").notNull(),
    at: integer("at").notNull(),
  },
  (table) => [
    index("revenue_movement_site_at_idx").on(table.siteId, table.at),
    index("revenue_movement_site_customer_idx").on(
      table.siteId,
      table.customerId
    ),
  ]
)
