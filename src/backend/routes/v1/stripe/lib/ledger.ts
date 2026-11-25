import { and, eq } from "drizzle-orm"

import {
  stripeCustomer,
  stripeSubscription,
} from "../../../../db/schema"
import { createDb } from "../../../../lib/db"
import { newId, nowMs } from "../../../../lib/utils"

import type { StripeCustomer, StripeSubscription } from "./api"
import { isMrrStatus, subscriptionMrrCents } from "./mrr"

type Db = ReturnType<typeof createDb>

function customerFields(customer: StripeCustomer) {
  const metadata = customer.metadata ?? {}
  const metadataUserId =
    metadata.userId?.trim() ||
    metadata.user_id?.trim() ||
    metadata.uid?.trim() ||
    ""
  return {
    email: (customer.email ?? "").trim().toLowerCase(),
    name: (customer.name ?? "").trim(),
    metadataUserId,
  }
}

function subscriptionFields(subscription: StripeSubscription) {
  let mrrCents = 0
  let currency = (subscription.currency || "usd").toLowerCase()
  let interval = ""
  for (const item of subscription.items.data) {
    const price =
      typeof item.price === "string"
        ? null
        : item.price.recurring
          ? item.price
          : null
    if (!price?.recurring) continue
    currency = (price.currency || currency).toLowerCase()
    interval = price.recurring.interval
    mrrCents += subscriptionMrrCents({
      unitAmount: price.unit_amount,
      quantity: item.quantity,
      interval: price.recurring.interval,
      intervalCount: price.recurring.interval_count,
    })
  }
  if (!isMrrStatus(subscription.status)) mrrCents = 0
  return {
    status: subscription.status,
    mrrCents,
    currency,
    interval,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    createdAt: (subscription.created || Math.floor(Date.now() / 1000)) * 1000,
  }
}

export async function upsertStripeCustomer(
  db: Db,
  workspaceId: string,
  customer: StripeCustomer
) {
  const now = nowMs()
  const fields = customerFields(customer)
  const [existing] = await db
    .select()
    .from(stripeCustomer)
    .where(
      and(
        eq(stripeCustomer.workspaceId, workspaceId),
        eq(stripeCustomer.stripeCustomerId, customer.id)
      )
    )
    .limit(1)

  if (!existing) {
    await db.insert(stripeCustomer).values({
      id: newId(),
      workspaceId,
      stripeCustomerId: customer.id,
      ...fields,
      createdAt: now,
      updatedAt: now,
    })
    return
  }

  await db
    .update(stripeCustomer)
    .set({ ...fields, updatedAt: now })
    .where(eq(stripeCustomer.id, existing.id))
}

export async function upsertStripeSubscription(
  db: Db,
  workspaceId: string,
  subscription: StripeSubscription
) {
  const now = nowMs()
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id

  if (typeof subscription.customer !== "string") {
    await upsertStripeCustomer(db, workspaceId, subscription.customer)
  }

  const fields = subscriptionFields(subscription)
  const [existing] = await db
    .select()
    .from(stripeSubscription)
    .where(
      and(
        eq(stripeSubscription.workspaceId, workspaceId),
        eq(stripeSubscription.stripeSubscriptionId, subscription.id)
      )
    )
    .limit(1)

  if (!existing) {
    await db.insert(stripeSubscription).values({
      id: newId(),
      workspaceId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      ...fields,
      updatedAt: now,
    })
    return
  }

  await db
    .update(stripeSubscription)
    .set({
      stripeCustomerId: customerId,
      ...fields,
      updatedAt: now,
    })
    .where(eq(stripeSubscription.id, existing.id))
}

export async function deleteStripeSubscription(
  db: Db,
  workspaceId: string,
  stripeSubscriptionId: string
) {
  await db
    .delete(stripeSubscription)
    .where(
      and(
        eq(stripeSubscription.workspaceId, workspaceId),
        eq(stripeSubscription.stripeSubscriptionId, stripeSubscriptionId)
      )
    )
}
