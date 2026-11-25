import { and, eq, gte, lt, sql } from "drizzle-orm"

import { event, revenueMovement, site } from "../../../../db/schema"
import type { Database } from "../../../../lib/db"

import { asNumber, trafficConditions } from "./stats"

const dayMs = 24 * 60 * 60_000

export type SiteSummary = {
  siteId: string
  visitors: number
  previousVisitors: number
  mrr: { currency: string; value: number; previous: number } | null
}

export async function loadSiteSummaries(
  db: Database,
  workspaceId: string,
  now: number
): Promise<SiteSummary[]> {
  const dayAgo = now - dayMs
  const [traffic, revenue, sites] = await Promise.all([
    db
      .select({
        siteId: event.siteId,
        visitors: sql<number>`count(distinct case when ${event.timestamp} >= ${dayAgo} then ${event.visitorId} end)`,
        previousVisitors: sql<number>`count(distinct case when ${event.timestamp} < ${dayAgo} then ${event.visitorId} end)`,
      })
      .from(event)
      .innerJoin(site, eq(site.id, event.siteId))
      .where(
        and(
          eq(site.workspaceId, workspaceId),
          gte(event.timestamp, dayAgo - dayMs),
          lt(event.timestamp, now),
          ...trafficConditions({
            breakdown: undefined,
            eventFilter: undefined,
            includeBots: false,
          })
        )
      )
      .groupBy(event.siteId),
    db
      .select({
        siteId: revenueMovement.siteId,
        currency: revenueMovement.currency,
        mrr: sql<number>`sum(${revenueMovement.amount})`,
        previousMrr: sql<number>`sum(case when ${revenueMovement.at} < ${dayAgo} then ${revenueMovement.amount} else 0 end)`,
      })
      .from(revenueMovement)
      .innerJoin(site, eq(site.id, revenueMovement.siteId))
      .where(
        and(eq(site.workspaceId, workspaceId), lt(revenueMovement.at, now))
      )
      .groupBy(revenueMovement.siteId, revenueMovement.currency),
    db
      .select({ id: site.id })
      .from(site)
      .where(eq(site.workspaceId, workspaceId)),
  ])

  const trafficBySite = new Map(traffic.map((row) => [row.siteId, row]))
  const mrrBySite = new Map<string, SiteSummary["mrr"]>()
  for (const row of revenue) {
    const value = asNumber(row.mrr)
    const known = mrrBySite.get(row.siteId)
    if (known && known.value >= value) continue
    mrrBySite.set(row.siteId, {
      currency: row.currency,
      value,
      previous: asNumber(row.previousMrr),
    })
  }

  return sites.map(({ id }) => ({
    siteId: id,
    visitors: asNumber(trafficBySite.get(id)?.visitors),
    previousVisitors: asNumber(trafficBySite.get(id)?.previousVisitors),
    mrr: mrrBySite.get(id) ?? null,
  }))
}
