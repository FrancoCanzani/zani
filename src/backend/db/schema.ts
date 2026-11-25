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

export const stripeConnection = sqliteTable(
  "stripe_connection",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" })
      .unique(),
    stripeAccountId: text("stripe_account_id").notNull().default(""),
    apiKeyCipher: text("api_key_cipher").notNull(),
    webhookSecretCipher: text("webhook_secret_cipher").notNull(),
    livemode: integer("livemode", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("stripe_connection_workspaceId_idx").on(table.workspaceId)]
)

export const stripeCustomer = sqliteTable(
  "stripe_customer",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    email: text("email").notNull().default(""),
    name: text("name").notNull().default(""),
    metadataUserId: text("metadata_user_id").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("stripe_customer_workspace_stripe_idx").on(
      table.workspaceId,
      table.stripeCustomerId
    ),
    index("stripe_customer_workspace_email_idx").on(
      table.workspaceId,
      table.email
    ),
    index("stripe_customer_workspace_userId_idx").on(
      table.workspaceId,
      table.metadataUserId
    ),
  ]
)

export const stripeSubscription = sqliteTable(
  "stripe_subscription",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    status: text("status").notNull(),
    mrrCents: integer("mrr_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    interval: text("interval").notNull().default(""),
    cancelAtPeriodEnd: integer("cancel_at_period_end", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("stripe_subscription_workspace_stripe_idx").on(
      table.workspaceId,
      table.stripeSubscriptionId
    ),
    index("stripe_subscription_workspace_customer_idx").on(
      table.workspaceId,
      table.stripeCustomerId
    ),
    index("stripe_subscription_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
  ]
)
