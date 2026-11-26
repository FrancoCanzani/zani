import { and, eq, isNull, sql } from "drizzle-orm"

import { mrrSnapshot, stripeCustomer, stripePayment } from "../db/schema"

import type { Database } from "./db"
import { emailHash, findIdentityId } from "./revenue"
import { hmacSha256Hex, timingSafeEqual } from "./secrets"

// Pinned so invoice and subscription payloads keep one shape regardless of the account's default API version.
const stripeVersion = "2024-06-20"
const signatureToleranceSeconds = 300

export type StripeList<T> = { data: T[]; has_more: boolean }

export type StripeCustomer = {
  id: string
  email: string | null
  name: string | null
  created: number
  metadata: Record<string, string> | null
  deleted?: boolean
}

export type StripeCheckoutSession = {
  id: string
  customer: string | null
  client_reference_id: string | null
  customer_details: { email: string | null } | null
}

export type StripeSubscription = {
  id: string
  customer: string
  status: string
  currency: string
  ended_at: number | null
  trial_start: number | null
}

export type StripeCharge = {
  id: string
  customer: string | null
  invoice: string | null
  status: string
  amount: number
  amount_refunded: number
  currency: string
  created: number
}

type StripeInvoiceLine = {
  amount: number
  type: string
  proration: boolean
  period: { start: number; end: number }
  discount_amounts: Array<{ amount: number }> | null
  price: {
    recurring: { interval: string; interval_count: number } | null
  } | null
}

export type StripeInvoice = {
  id: string
  customer: string
  subscription: string | null
  status: string
  currency: string
  created: number
  lines: { data: StripeInvoiceLine[] }
}

export type StripeEvent = {
  id: string
  type: string
  data: { object: { id: string; object: string } }
}

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

export async function stripeGet<T>(
  apiKey: string,
  path: string,
  params: Record<string, string | undefined> = {}
): Promise<T> {
  const url = new URL(`https://api.stripe.com/v1/${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.append(key, value)
  }
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "stripe-version": stripeVersion,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new StripeError(
      body?.error?.message ?? `Stripe responded ${response.status}`,
      response.status
    )
  }
  return (await response.json()) as T
}

function monthlyAmount(
  amount: number,
  recurring: { interval: string; interval_count: number }
) {
  const count = Math.max(1, recurring.interval_count)
  switch (recurring.interval) {
    case "day":
      return (amount * 365) / 12 / count
    case "week":
      return (amount * 52) / 12 / count
    case "month":
      return amount / count
    case "year":
      return amount / 12 / count
    default:
      return 0
  }
}

function invoiceMrr(invoice: StripeInvoice) {
  if (invoice.status !== "paid" || !invoice.subscription) return null
  let mrr = 0
  let at = Number.POSITIVE_INFINITY
  for (const line of invoice.lines.data) {
    const recurring = line.price?.recurring
    if (line.type !== "subscription" || line.proration || !recurring) continue
    const discount = (line.discount_amounts ?? []).reduce(
      (sum, item) => sum + item.amount,
      0
    )
    mrr += monthlyAmount(line.amount - discount, recurring)
    at = Math.min(at, line.period.start)
  }
  return {
    subscriptionId: invoice.subscription,
    mrr: Math.max(0, Math.round(mrr)),
    at: (Number.isFinite(at) ? at : invoice.created) * 1000,
    currency: invoice.currency,
  }
}

type CustomerValues = {
  siteId: string
  id: string
  email: string
  emailHash: string | null
  name: string
  userRef: string | null
  createdAt: number
}

export async function customerValues(
  siteId: string,
  customer: StripeCustomer
): Promise<CustomerValues | null> {
  if (customer.deleted) return null
  const email = customer.email?.trim() ?? ""
  return {
    siteId,
    id: customer.id,
    email,
    emailHash: email ? await emailHash(siteId, email) : null,
    name: customer.name ?? "",
    userRef: customer.metadata?.zani_user_id?.trim() || null,
    createdAt: customer.created * 1000,
  }
}

export function customerUpsert(db: Database, values: CustomerValues) {
  return db
    .insert(stripeCustomer)
    .values(values)
    .onConflictDoUpdate({
      target: [stripeCustomer.siteId, stripeCustomer.id],
      set: {
        email: values.email,
        emailHash: values.emailHash,
        name: values.name,
        userRef: sql`coalesce(${values.userRef}, ${stripeCustomer.userRef})`,
      },
    })
}

export function checkoutSessionLink(
  db: Database,
  siteId: string,
  session: StripeCheckoutSession
) {
  const userRef = session.client_reference_id?.trim()
  if (!session.customer || !userRef) return null
  return db
    .update(stripeCustomer)
    .set({ userRef })
    .where(
      and(
        eq(stripeCustomer.siteId, siteId),
        eq(stripeCustomer.id, session.customer),
        isNull(stripeCustomer.userRef)
      )
    )
}

function snapshotUpsert(db: Database, values: typeof mrrSnapshot.$inferInsert) {
  return db
    .insert(mrrSnapshot)
    .values(values)
    .onConflictDoUpdate({
      target: [mrrSnapshot.siteId, mrrSnapshot.sourceId],
      set: { at: values.at, mrr: values.mrr, currency: values.currency },
    })
}

export function invoiceSnapshot(
  db: Database,
  siteId: string,
  invoice: StripeInvoice
) {
  const derived = invoiceMrr(invoice)
  if (!derived) return null
  return snapshotUpsert(db, {
    siteId,
    sourceId: `inv:${invoice.id}`,
    customerId: invoice.customer,
    ...derived,
  })
}

export function subscriptionEndSnapshot(
  db: Database,
  siteId: string,
  subscription: StripeSubscription
) {
  if (subscription.ended_at === null) return null
  return snapshotUpsert(db, {
    siteId,
    sourceId: `end:${subscription.id}`,
    customerId: subscription.customer,
    subscriptionId: subscription.id,
    at: subscription.ended_at * 1000,
    mrr: 0,
    currency: subscription.currency,
  })
}

export function chargePayment(
  db: Database,
  siteId: string,
  charge: StripeCharge
) {
  if (charge.status !== "succeeded" || !charge.customer) return null
  const values = {
    siteId,
    id: charge.id,
    customerId: charge.customer,
    invoiceId: charge.invoice ?? "",
    amount: charge.amount,
    refunded: charge.amount_refunded,
    currency: charge.currency,
    at: charge.created * 1000,
  }
  return db
    .insert(stripePayment)
    .values(values)
    .onConflictDoUpdate({
      target: [stripePayment.siteId, stripePayment.id],
      set: {
        customerId: values.customerId,
        invoiceId: values.invoiceId,
        amount: values.amount,
        refunded: values.refunded,
        currency: values.currency,
        at: values.at,
      },
    })
}

export function subscriptionTrial(
  db: Database,
  siteId: string,
  subscription: StripeSubscription
) {
  if (subscription.trial_start === null) return null
  const startedAt = subscription.trial_start * 1000
  return db
    .update(stripeCustomer)
    .set({
      trialStartedAt: sql`min(coalesce(${stripeCustomer.trialStartedAt}, ${startedAt}), ${startedAt})`,
    })
    .where(
      and(
        eq(stripeCustomer.siteId, siteId),
        eq(stripeCustomer.id, subscription.customer)
      )
    )
}

export async function linkIdentity(
  db: Database,
  siteId: string,
  customerId: string
) {
  const [row] = await db
    .select({
      identityId: stripeCustomer.identityId,
      userRef: stripeCustomer.userRef,
      email: stripeCustomer.email,
    })
    .from(stripeCustomer)
    .where(
      and(eq(stripeCustomer.siteId, siteId), eq(stripeCustomer.id, customerId))
    )
    .limit(1)
  if (!row || row.identityId) return
  const identityId = await findIdentityId(db, siteId, row)
  if (!identityId) return
  await db
    .update(stripeCustomer)
    .set({ identityId })
    .where(
      and(eq(stripeCustomer.siteId, siteId), eq(stripeCustomer.id, customerId))
    )
}

export async function verifyStripeSignature(
  header: string | undefined,
  payload: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  if (!header) return false
  let timestamp = ""
  const signatures: string[] = []
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2)
    if (key === "t" && value) timestamp = value
    if (key === "v1" && value) signatures.push(value)
  }
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - seconds) > signatureToleranceSeconds) return false
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`)
  return signatures.some((signature) => timingSafeEqual(signature, expected))
}
