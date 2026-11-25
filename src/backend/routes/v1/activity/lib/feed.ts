import { and, desc, eq, gte, lt, ne, type SQL } from "drizzle-orm"

import {
  event,
  eventProp,
  revenueMovement,
  stripeCustomer,
  visitorIdentity,
} from "../../../../db/schema"
import type { Database } from "../../../../lib/db"
import type { MovementKind } from "../../../../lib/revenue"
import { sourceFor } from "../../../../lib/source"
import { identityFilters } from "../../revenue/lib/filters"
import {
  filterConditions,
  propFilterConditions,
  sourceCondition,
  type StatsRange,
} from "../../sites/lib/stats"

import type { ActivityQuery } from "./schema"

const activityLimit = 50

export type ActivityItem =
  | {
      kind: "pageview" | "event"
      id: string
      at: number
      name: string
      path: string
      source: string
      referrer: string
      country: string
      city: string
      browser: string
      device: string
    }
  | {
      kind: "signup"
      id: string
      at: number
      firstSource: string
      lastSource: string
      landing: string
      country: string
      firstSeenAt: number
    }
  | {
      kind: "revenue"
      id: string
      at: number
      movement: MovementKind
      amount: number
      mrrAfter: number
      currency: string
      customer: string
      firstSource: string | null
      firstSeenAt: number | null
    }

async function loadTraffic(
  db: Database,
  siteId: string,
  range: StatsRange,
  query: ActivityQuery
): Promise<ActivityItem[]> {
  const conditions: SQL[] = [
    eq(event.siteId, siteId),
    gte(event.timestamp, range.start),
    lt(event.timestamp, range.end),
    ...filterConditions(query),
  ]
  if (query.bots !== "1") conditions.push(ne(event.browser, "bot"))
  // The signup row already represents identify, so the raw event would show twice.
  if (query.event === undefined) conditions.push(ne(event.name, "identify"))
  if (query.source) {
    conditions.push(await sourceCondition(db, siteId, range, query.source))
  }
  const propFilters = propFilterConditions(query)
  const select = db
    .selectDistinct({
      id: event.id,
      at: event.timestamp,
      name: event.name,
      path: event.path,
      referrerHost: event.referrerHost,
      utmSource: event.utmSource,
      country: event.country,
      city: event.city,
      browser: event.browser,
      device: event.device,
    })
    .from(event)
  const scoped =
    propFilters.length > 0
      ? select
          .innerJoin(eventProp, eq(eventProp.eventId, event.id))
          .where(and(...conditions, ...propFilters))
      : select.where(and(...conditions))
  const rows = await scoped.orderBy(desc(event.timestamp)).limit(activityLimit)

  return rows.map((row) => ({
    kind: row.name === "pageview" ? ("pageview" as const) : ("event" as const),
    id: row.id,
    at: row.at,
    name: row.name,
    path: row.path,
    source: sourceFor(row.utmSource, row.referrerHost),
    referrer: row.referrerHost,
    country: row.country,
    city: row.city,
    browser: row.browser,
    device: row.device,
  }))
}

async function loadSignups(
  db: Database,
  siteId: string,
  range: StatsRange,
  conditions: SQL[]
): Promise<ActivityItem[]> {
  const rows = await db
    .select({
      id: visitorIdentity.id,
      at: visitorIdentity.signedUpAt,
      firstSource: visitorIdentity.firstSource,
      lastSource: visitorIdentity.lastSource,
      landing: visitorIdentity.firstLanding,
      country: visitorIdentity.country,
      firstSeenAt: visitorIdentity.firstSeenAt,
    })
    .from(visitorIdentity)
    .where(
      and(
        eq(visitorIdentity.siteId, siteId),
        gte(visitorIdentity.signedUpAt, range.start),
        lt(visitorIdentity.signedUpAt, range.end),
        ...conditions
      )
    )
    .orderBy(desc(visitorIdentity.signedUpAt))
    .limit(activityLimit)

  return rows.map((row) => ({ kind: "signup" as const, ...row }))
}

async function loadRevenue(
  db: Database,
  siteId: string,
  range: StatsRange,
  conditions: SQL[]
): Promise<ActivityItem[]> {
  const rows = await db
    .select({
      id: revenueMovement.id,
      at: revenueMovement.at,
      movement: revenueMovement.kind,
      amount: revenueMovement.amount,
      mrrAfter: revenueMovement.mrrAfter,
      currency: revenueMovement.currency,
      name: stripeCustomer.name,
      email: stripeCustomer.email,
      firstSource: visitorIdentity.firstSource,
      firstSeenAt: visitorIdentity.firstSeenAt,
    })
    .from(revenueMovement)
    .leftJoin(
      stripeCustomer,
      and(
        eq(stripeCustomer.siteId, revenueMovement.siteId),
        eq(stripeCustomer.id, revenueMovement.customerId)
      )
    )
    .leftJoin(
      visitorIdentity,
      eq(visitorIdentity.id, stripeCustomer.identityId)
    )
    .where(
      and(
        eq(revenueMovement.siteId, siteId),
        gte(revenueMovement.at, range.start),
        lt(revenueMovement.at, range.end),
        ...conditions
      )
    )
    .orderBy(desc(revenueMovement.at))
    .limit(activityLimit)

  return rows.map((row) => ({
    kind: "revenue" as const,
    id: row.id,
    at: row.at,
    movement: row.movement as MovementKind,
    amount: row.amount,
    mrrAfter: row.mrrAfter,
    currency: row.currency,
    customer: row.name || row.email || "",
    firstSource: row.firstSource,
    firstSeenAt: row.firstSeenAt,
  }))
}

export async function loadActivity(
  db: Database,
  siteId: string,
  range: StatsRange,
  query: ActivityQuery
) {
  const window: StatsRange = {
    ...range,
    end:
      query.before === undefined
        ? range.end
        : Math.min(range.end, query.before),
  }
  const identity = identityFilters(query)
  // Signups and payments only carry what was captured at signup, so a filter they can't match hides them.
  const identityMatchable = identity.ignored.length === 0
  const wants = (type: Exclude<ActivityQuery["type"], "all">) =>
    query.type === "all" || query.type === type

  const groups = await Promise.all([
    wants("pageviews") ? loadTraffic(db, siteId, window, query) : [],
    wants("signups") && identityMatchable
      ? loadSignups(db, siteId, window, identity.conditions)
      : [],
    wants("revenue") && identityMatchable
      ? loadRevenue(db, siteId, window, identity.conditions)
      : [],
  ])

  const items = groups
    .flat()
    .sort((a, b) => b.at - a.at)
    .slice(0, activityLimit)
  const hasMore = groups.some((group) => group.length === activityLimit)
  return {
    items,
    nextBefore:
      hasMore && items.length > 0 ? items[items.length - 1]!.at : null,
  }
}
