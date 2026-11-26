import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm"

import {
  event,
  stripeCustomer,
  visitor,
  visitorIdentity,
} from "../../../../db/schema"
import type { Database } from "../../../../lib/db"

import type { StatsRange } from "./stats"

export type Goal =
  | { kind: "event"; name: string }
  | { kind: "signup" }
  | { kind: "paid" }

const eventGoalPrefix = "event:"
const eventNamePattern = /^[a-z0-9_-]{1,32}$/
export const reservedEventNames = ["pageview", "identify", "signup"]

export function parseGoal(value: string | undefined): Goal | null {
  if (value === undefined) return null
  if (value === "signup") return { kind: "signup" }
  if (value === "paid") return { kind: "paid" }
  if (!value.startsWith(eventGoalPrefix)) return null
  const name = value.slice(eventGoalPrefix.length)
  if (!eventNamePattern.test(name) || reservedEventNames.includes(name)) {
    return null
  }
  return { kind: "event", name }
}

export function goalKey(goal: Goal) {
  return goal.kind === "event" ? `${eventGoalPrefix}${goal.name}` : goal.kind
}

// Signups and payments live on identities, so they map back to the anonymous ids the browser recorded.
export function goalMatches(
  db: Database,
  siteId: string,
  range: StatsRange,
  goal: Goal
) {
  switch (goal.kind) {
    case "event":
      return db
        .select({ visitorId: event.visitorId, at: event.timestamp })
        .from(event)
        .where(
          and(
            eq(event.siteId, siteId),
            gte(event.timestamp, range.start),
            lt(event.timestamp, range.end),
            eq(event.name, goal.name)
          )
        )
    case "signup":
      return db
        .select({
          visitorId: visitor.anonymousId,
          at: visitorIdentity.signedUpAt,
        })
        .from(visitorIdentity)
        .innerJoin(
          visitor,
          and(
            eq(visitor.siteId, visitorIdentity.siteId),
            eq(visitor.userId, visitorIdentity.userRef)
          )
        )
        .where(
          and(
            eq(visitorIdentity.siteId, siteId),
            gte(visitorIdentity.signedUpAt, range.start),
            lt(visitorIdentity.signedUpAt, range.end),
            ne(visitor.userId, "")
          )
        )
    case "paid":
      return db
        .select({
          visitorId: visitor.anonymousId,
          at: sql<number>`${stripeCustomer.firstPaidAt}`,
        })
        .from(stripeCustomer)
        .innerJoin(
          visitorIdentity,
          eq(visitorIdentity.id, stripeCustomer.identityId)
        )
        .innerJoin(
          visitor,
          and(
            eq(visitor.siteId, visitorIdentity.siteId),
            eq(visitor.userId, visitorIdentity.userRef)
          )
        )
        .where(
          and(
            eq(stripeCustomer.siteId, siteId),
            gte(stripeCustomer.firstPaidAt, range.start),
            lt(stripeCustomer.firstPaidAt, range.end),
            ne(visitor.userId, "")
          )
        )
    default: {
      const exhaustive: never = goal
      return exhaustive
    }
  }
}

export function goalVisitors(
  db: Database,
  siteId: string,
  range: StatsRange,
  goal: Goal
) {
  const matches = goalMatches(db, siteId, range, goal).as("goal_matches")
  return db.select({ visitorId: matches.visitorId }).from(matches)
}

export function convertedCondition(
  db: Database,
  siteId: string,
  range: StatsRange,
  goal: Goal | null
) {
  if (!goal) return null
  return inArray(event.visitorId, goalVisitors(db, siteId, range, goal))
}

export function conversionsSql(converted: ReturnType<typeof convertedCondition>) {
  if (!converted) return sql<number>`0`
  return sql<number>`count(distinct case when ${converted} then ${event.visitorId} end)`
}
