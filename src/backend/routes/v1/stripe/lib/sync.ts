import { and, asc, eq, gt } from "drizzle-orm"

import { stripeConnection, stripeCustomer } from "../../../../db/schema"
import { runBatch, type Database } from "../../../../lib/db"
import { recomputeCustomer } from "../../../../lib/revenue"
import {
  checkoutSessionLink,
  customerUpsert,
  customerValues,
  invoiceSnapshot,
  linkIdentity,
  stripeGet,
  subscriptionEndSnapshot,
  type StripeCheckoutSession,
  type StripeCustomer,
  type StripeInvoice,
  type StripeList,
  type StripeSubscription,
} from "../../../../lib/stripe"

const syncPhases = [
  "customers",
  "checkout_sessions",
  "subscriptions",
  "invoices",
  "recompute",
  "done",
] as const

export type SyncPhase = (typeof syncPhases)[number]

// Small pages keep each step under the Workers per-invocation query and CPU limits on the free plan.
const recomputePerStep = 8

export function parseSyncPhase(value: string): SyncPhase {
  return (syncPhases as readonly string[]).includes(value)
    ? (value as SyncPhase)
    : "customers"
}

function nextPhase(phase: SyncPhase): SyncPhase {
  const index = syncPhases.indexOf(phase)
  return syncPhases[Math.min(index + 1, syncPhases.length - 1)]!
}

async function pageOf<T extends { id: string }>(
  apiKey: string,
  path: string,
  cursor: string | null,
  params: Record<string, string>
) {
  const page = await stripeGet<StripeList<T>>(apiKey, path, {
    limit: "50",
    ...params,
    starting_after: cursor ?? undefined,
  })
  return {
    items: page.data,
    cursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
  }
}

export async function runSyncStep(
  db: Database,
  input: {
    siteId: string
    apiKey: string
    phase: SyncPhase
    cursor: string | null
  }
): Promise<{ phase: SyncPhase; cursor: string | null; processed: number }> {
  const { siteId, apiKey, phase, cursor } = input
  let step: { processed: number; cursor: string | null }

  switch (phase) {
    case "customers": {
      const page = await pageOf<StripeCustomer>(apiKey, "customers", cursor, {})
      const values = await Promise.all(
        page.items.map((item) => customerValues(siteId, item))
      )
      await runBatch(
        db,
        values
          .filter((item) => item !== null)
          .map((item) => customerUpsert(db, item))
      )
      step = { processed: page.items.length, cursor: page.cursor }
      break
    }
    case "checkout_sessions": {
      const page = await pageOf<StripeCheckoutSession>(
        apiKey,
        "checkout/sessions",
        cursor,
        { status: "complete" }
      )
      await runBatch(
        db,
        page.items
          .map((item) => checkoutSessionLink(db, siteId, item))
          .filter((item) => item !== null)
      )
      step = { processed: page.items.length, cursor: page.cursor }
      break
    }
    case "subscriptions": {
      const page = await pageOf<StripeSubscription>(
        apiKey,
        "subscriptions",
        cursor,
        { status: "all" }
      )
      await runBatch(
        db,
        page.items
          .map((item) => subscriptionEndSnapshot(db, siteId, item))
          .filter((item) => item !== null)
      )
      step = { processed: page.items.length, cursor: page.cursor }
      break
    }
    case "invoices": {
      const page = await pageOf<StripeInvoice>(apiKey, "invoices", cursor, {
        status: "paid",
      })
      await runBatch(
        db,
        page.items
          .map((item) => invoiceSnapshot(db, siteId, item))
          .filter((item) => item !== null)
      )
      step = { processed: page.items.length, cursor: page.cursor }
      break
    }
    case "recompute": {
      const customers = await db
        .select({ id: stripeCustomer.id })
        .from(stripeCustomer)
        .where(
          and(
            eq(stripeCustomer.siteId, siteId),
            cursor ? gt(stripeCustomer.id, cursor) : undefined
          )
        )
        .orderBy(asc(stripeCustomer.id))
        .limit(recomputePerStep)
      for (const customer of customers) {
        await linkIdentity(db, siteId, customer.id)
        await recomputeCustomer(db, siteId, customer.id)
      }
      step = {
        processed: customers.length,
        cursor:
          customers.length === recomputePerStep
            ? (customers.at(-1)?.id ?? null)
            : null,
      }
      break
    }
    case "done":
      return { phase, cursor: null, processed: 0 }
    default: {
      const exhaustive: never = phase
      return exhaustive
    }
  }

  const nextCursor = step.cursor
  const advanced = nextCursor === null ? nextPhase(phase) : phase
  await db
    .update(stripeConnection)
    .set({
      syncPhase: advanced,
      syncCursor: nextCursor,
      syncError: null,
      updatedAt: Date.now(),
      ...(advanced === "done" ? { syncedAt: Date.now() } : {}),
    })
    .where(eq(stripeConnection.siteId, siteId))

  return { phase: advanced, cursor: nextCursor, processed: step.processed }
}
