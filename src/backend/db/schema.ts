import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

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
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  defaultCurrency: text("default_currency").notNull().default("usd"),
  invoiceNumberPrefix: text("invoice_number_prefix").notNull().default("INV-"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  defaultPaymentTerms: text("default_payment_terms"),
  defaultTaxName: text("default_tax_name"),
  defaultTaxRateBps: integer("default_tax_rate_bps").notNull().default(0),
  taxInclusive: integer("tax_inclusive", { mode: "boolean" })
    .notNull()
    .default(false),
  detailsSkippedAt: integer("details_skipped_at"),
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

export const customer = sqliteTable(
  "customer",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    taxId: text("tax_id"),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("customer_workspaceId_idx").on(table.workspaceId),
    index("customer_workspace_name_idx").on(table.workspaceId, table.name),
  ]
)

export const product = sqliteTable(
  "product",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unitAmountCents: integer("unit_amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("product_workspaceId_idx").on(table.workspaceId),
    index("product_workspace_name_idx").on(table.workspaceId, table.name),
  ]
)

export const invoiceStatuses = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "void",
] as const

export type InvoiceStatus = (typeof invoiceStatuses)[number]

export type InvoiceLineItem = {
  id: string
  productId: string | null
  name: string
  description: string
  quantity: number
  unitAmountCents: number
}

export const invoice = sqliteTable(
  "invoice",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    publicSlug: text("public_slug").notNull().unique(),
    status: text("status").$type<InvoiceStatus>().notNull().default("draft"),
    number: text("number").notNull(),
    customerId: text("customer_id").references(() => customer.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    customerAddress: text("customer_address"),
    customerTaxId: text("customer_tax_id"),
    currency: text("currency").notNull().default("usd"),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date"),
    paymentTerms: text("payment_terms"),
    notes: text("notes"),
    terms: text("terms"),
    bankDetails: text("bank_details"),
    taxName: text("tax_name"),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    taxInclusive: integer("tax_inclusive", { mode: "boolean" })
      .notNull()
      .default(false),
    lineItems: text("line_items", { mode: "json" })
      .$type<InvoiceLineItem[]>()
      .notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    sentAt: integer("sent_at"),
    paidAt: integer("paid_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("invoice_workspaceId_idx").on(table.workspaceId),
    index("invoice_workspace_updated_idx").on(
      table.workspaceId,
      table.updatedAt
    ),
    index("invoice_customerId_idx").on(table.customerId),
    uniqueIndex("invoice_workspace_number_idx").on(
      table.workspaceId,
      table.number
    ),
  ]
)
