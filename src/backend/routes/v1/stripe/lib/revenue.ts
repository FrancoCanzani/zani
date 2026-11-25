import { and, eq, inArray, or, sql } from "drizzle-orm"

import {
  site,
  stripeCustomer,
  stripeSubscription,
  visitor,
} from "../../../../db/schema"
import { createDb } from "../../../../lib/db"

import { isMrrStatus } from "./mrr"

type Db = ReturnType<typeof createDb>

export type RevenueSourceRow = {
  source: string
  signups: number
  customers: number
  mrrCents: number
}

function sourceLabel(input: {
  firstUtmSource: string
  firstUtmMedium: string
  firstUtmCampaign: string
  firstReferrerHost: string
}) {
  const utm = input.firstUtmSource.trim()
  if (utm) {
    const parts = [
      utm,
      input.firstUtmMedium.trim(),
      input.firstUtmCampaign.trim(),
    ].filter(Boolean)
    return parts.join(" / ")
  }
  const host = input.firstReferrerHost.trim()
  if (host) return host
  return "Direct"
}

export async function loadRevenueStats(db: Db, workspaceId: string) {
  const siteRows = await db
    .select({ id: site.id })
    .from(site)
    .where(eq(site.workspaceId, workspaceId))
  const siteIds = siteRows.map((row) => row.id)

  const visitors =
    siteIds.length === 0
      ? []
      : await db
          .select({
            userId: visitor.userId,
            email: visitor.email,
            identifiedAt: visitor.identifiedAt,
            firstSeenAt: visitor.firstSeenAt,
            firstUtmSource: visitor.firstUtmSource,
            firstUtmMedium: visitor.firstUtmMedium,
            firstUtmCampaign: visitor.firstUtmCampaign,
            firstReferrerHost: visitor.firstReferrerHost,
          })
          .from(visitor)
          .where(inArray(visitor.siteId, siteIds))

  const customers = await db
    .select()
    .from(stripeCustomer)
    .where(eq(stripeCustomer.workspaceId, workspaceId))

  const subscriptions = await db
    .select()
    .from(stripeSubscription)
    .where(
      and(
        eq(stripeSubscription.workspaceId, workspaceId),
        or(
          eq(stripeSubscription.status, "active"),
          eq(stripeSubscription.status, "trialing"),
          eq(stripeSubscription.status, "past_due")
        )
      )
    )

  const mrrByCustomer = new Map<string, number>()
  let mrrCents = 0
  for (const subscription of subscriptions) {
    if (!isMrrStatus(subscription.status)) continue
    mrrCents += subscription.mrrCents
    mrrByCustomer.set(
      subscription.stripeCustomerId,
      (mrrByCustomer.get(subscription.stripeCustomerId) ?? 0) +
        subscription.mrrCents
    )
  }

  const visitorsByEmail = new Map<string, (typeof visitors)[number]>()
  const visitorsByUserId = new Map<string, (typeof visitors)[number]>()
  for (const row of visitors) {
    if (row.email) {
      const existing = visitorsByEmail.get(row.email)
      if (!existing || row.firstSeenAt < existing.firstSeenAt) {
        visitorsByEmail.set(row.email, row)
      }
    }
    if (row.userId) {
      const existing = visitorsByUserId.get(row.userId)
      if (!existing || row.firstSeenAt < existing.firstSeenAt) {
        visitorsByUserId.set(row.userId, row)
      }
    }
  }

  const sourceMap = new Map<
    string,
    { signups: Set<string>; customers: Set<string>; mrrCents: number }
  >()

  function bucket(label: string) {
    const existing = sourceMap.get(label)
    if (existing) return existing
    const created = {
      signups: new Set<string>(),
      customers: new Set<string>(),
      mrrCents: 0,
    }
    sourceMap.set(label, created)
    return created
  }

  for (const row of visitors) {
    const identified =
      row.identifiedAt !== null || Boolean(row.userId) || Boolean(row.email)
    if (!identified) continue
    const label = sourceLabel(row)
    const key = row.userId || row.email
    if (!key) continue
    bucket(label).signups.add(key)
  }

  let matchedCustomers = 0
  let matchedMrrCents = 0
  for (const customer of customers) {
    const matched =
      (customer.metadataUserId &&
        visitorsByUserId.get(customer.metadataUserId)) ||
      (customer.email && visitorsByEmail.get(customer.email)) ||
      null
    if (!matched) continue
    matchedCustomers += 1
    const customerMrr = mrrByCustomer.get(customer.stripeCustomerId) ?? 0
    matchedMrrCents += customerMrr
    const label = sourceLabel(matched)
    const entry = bucket(label)
    entry.customers.add(customer.stripeCustomerId)
    entry.mrrCents += customerMrr
  }

  const sources: RevenueSourceRow[] = [...sourceMap.entries()]
    .map(([source, value]) => ({
      source,
      signups: value.signups.size,
      customers: value.customers.size,
      mrrCents: value.mrrCents,
    }))
    .sort((a, b) => b.mrrCents - a.mrrCents || b.customers - a.customers)

  const payingCustomers = [...mrrByCustomer.values()].filter((value) => value > 0)
    .length
  const arpuCents =
    payingCustomers > 0 ? Math.round(mrrCents / payingCustomers) : 0

  const canceled = await db
    .select({ count: sql<number>`count(*)` })
    .from(stripeSubscription)
    .where(
      and(
        eq(stripeSubscription.workspaceId, workspaceId),
        eq(stripeSubscription.status, "canceled")
      )
    )
  const canceledCount = Number(canceled[0]?.count ?? 0)
  const activeCount = subscriptions.length
  const churnRate =
    activeCount + canceledCount > 0
      ? Math.round((canceledCount / (activeCount + canceledCount)) * 1000) / 10
      : 0

  return {
    mrrCents,
    customers: payingCustomers,
    matchedCustomers,
    matchedMrrCents,
    signups: visitors.filter(
      (row) =>
        row.identifiedAt !== null || Boolean(row.userId) || Boolean(row.email)
    ).length,
    arpuCents,
    churnRate,
    currency: subscriptions[0]?.currency || "usd",
    sources,
  }
}
