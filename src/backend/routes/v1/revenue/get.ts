import { zValidator } from "@hono/zod-validator"
import { and, asc, count, desc, eq, gt, gte, lt, min, sql } from "drizzle-orm"
import { Hono } from "hono"

import {
  revenueMovement,
  stripeConnection,
  stripeCustomer,
  visitorIdentity,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { asNumber } from "../sites/lib/stats"
import { workspaceFromContext } from "../workspaces/lib/context"

import { primaryCurrency, rangeStart, summarize } from "./lib/overview"
import {
  attributionQuerySchema,
  overviewQuerySchema,
  type AttributionDimension,
  type RevenueRange,
  type Touch,
} from "./lib/schema"

type Database = ReturnType<typeof createDb>

const unidentified = "(not identified)"
const customerLimit = 50

function identityColumn(by: AttributionDimension, touch: Touch) {
  switch (by) {
    case "source":
      return touch === "first"
        ? visitorIdentity.firstSource
        : visitorIdentity.lastSource
    case "medium":
      return touch === "first"
        ? visitorIdentity.firstMedium
        : visitorIdentity.lastMedium
    case "campaign":
      return touch === "first"
        ? visitorIdentity.firstCampaign
        : visitorIdentity.lastCampaign
    case "landing":
      return touch === "first"
        ? visitorIdentity.firstLanding
        : visitorIdentity.lastLanding
    default: {
      const exhaustive: never = by
      return exhaustive
    }
  }
}

async function currencyFor(db: Database, siteId: string) {
  const [byCustomer, byMovement] = await Promise.all([
    db
      .select({
        currency: stripeCustomer.currency,
        mrr: sql<number>`sum(${stripeCustomer.mrr})`,
      })
      .from(stripeCustomer)
      .where(and(eq(stripeCustomer.siteId, siteId), gt(stripeCustomer.mrr, 0)))
      .groupBy(stripeCustomer.currency),
    db
      .select({
        customerId: revenueMovement.customerId,
        kind: revenueMovement.kind,
        amount: revenueMovement.amount,
        currency: revenueMovement.currency,
        at: revenueMovement.at,
      })
      .from(revenueMovement)
      .where(eq(revenueMovement.siteId, siteId))
      .limit(200),
  ])
  return {
    currency: primaryCurrency(
      byCustomer.map((row) => ({
        currency: row.currency,
        mrr: asNumber(row.mrr),
      })),
      byMovement
    ),
    otherCurrencies: byCustomer.length > 1 ? byCustomer.length - 1 : 0,
  }
}

async function windowFor(db: Database, siteId: string, range: RevenueRange) {
  const now = Date.now()
  if (range !== "all") return { start: rangeStart(range, now, now), end: now }
  const [[movement], [identity]] = await Promise.all([
    db
      .select({ value: min(revenueMovement.at) })
      .from(revenueMovement)
      .where(eq(revenueMovement.siteId, siteId)),
    db
      .select({ value: min(visitorIdentity.signedUpAt) })
      .from(visitorIdentity)
      .where(eq(visitorIdentity.siteId, siteId)),
  ])
  const earliest = Math.min(
    movement?.value ?? now,
    identity?.value ?? now
  )
  return { start: rangeStart(range, now, earliest), end: now }
}

async function siteFromRequest(
  db: Database,
  workspaceId: string,
  siteId: string | undefined
) {
  return siteId ? loadSite(db, workspaceId, siteId) : null
}

export const get = new Hono<AppEnv>()
  .get(
    "/",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", overviewQuerySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await siteFromRequest(
        db,
        current.workspace.id,
        c.req.param("siteId")
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const { range } = c.req.valid("query")
      const [{ currency, otherCurrencies }, window, [connection]] =
        await Promise.all([
          currencyFor(db, matched.id),
          windowFor(db, matched.id, range),
          db
            .select({ siteId: stripeConnection.siteId })
            .from(stripeConnection)
            .where(eq(stripeConnection.siteId, matched.id))
            .limit(1),
        ])

      const [movements, [customers], [identified]] = await Promise.all([
        db
          .select({
            customerId: revenueMovement.customerId,
            kind: revenueMovement.kind,
            amount: revenueMovement.amount,
            currency: revenueMovement.currency,
            at: revenueMovement.at,
          })
          .from(revenueMovement)
          .where(
            and(
              eq(revenueMovement.siteId, matched.id),
              eq(revenueMovement.currency, currency),
              lt(revenueMovement.at, window.end)
            )
          )
          .orderBy(asc(revenueMovement.at)),
        db
          .select({ value: count() })
          .from(stripeCustomer)
          .where(
            and(
              eq(stripeCustomer.siteId, matched.id),
              eq(stripeCustomer.currency, currency),
              gt(stripeCustomer.mrr, 0)
            )
          ),
        db
          .select({ value: count() })
          .from(stripeCustomer)
          .where(
            and(
              eq(stripeCustomer.siteId, matched.id),
              eq(stripeCustomer.currency, currency),
              gt(stripeCustomer.mrr, 0),
              sql`${stripeCustomer.identityId} is not null`
            )
          ),
      ])

      const summary = summarize(movements, window.start, window.end)
      const paying = customers?.value ?? 0
      return c.json(
        {
          connected: connection !== undefined,
          hasData: movements.length > 0,
          currency,
          otherCurrencies,
          start: window.start,
          end: window.end,
          payingCustomers: paying,
          identifiedCustomers: identified?.value ?? 0,
          arpa: paying > 0 ? Math.round(summary.mrr / paying) : 0,
          ...summary,
        },
        200
      )
    }
  )
  .get(
    "/attribution",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", attributionQuerySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await siteFromRequest(
        db,
        current.workspace.id,
        c.req.param("siteId")
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const query = c.req.valid("query")
      const [{ currency }, window] = await Promise.all([
        currencyFor(db, matched.id),
        windowFor(db, matched.id, query.range),
      ])
      const key = identityColumn(query.by, query.touch)

      const [signups, converted] = await Promise.all([
        db
          .select({ key, signups: count() })
          .from(visitorIdentity)
          .where(
            and(
              eq(visitorIdentity.siteId, matched.id),
              gte(visitorIdentity.signedUpAt, window.start),
              lt(visitorIdentity.signedUpAt, window.end)
            )
          )
          .groupBy(key),
        db
          .select({
            key,
            customers: count(),
            newMrr: sql<number>`sum(${revenueMovement.amount})`,
            mrr: sql<number>`sum(${stripeCustomer.mrr})`,
          })
          .from(revenueMovement)
          .innerJoin(
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
              eq(revenueMovement.siteId, matched.id),
              eq(revenueMovement.kind, "new"),
              eq(revenueMovement.currency, currency),
              gte(revenueMovement.at, window.start),
              lt(revenueMovement.at, window.end)
            )
          )
          .groupBy(key),
      ])

      const rows = new Map<
        string,
        {
          key: string
          signups: number
          customers: number
          newMrr: number
          mrr: number
        }
      >()
      const rowFor = (value: string | null) => {
        const label = value === null ? unidentified : value
        const existing = rows.get(label)
        if (existing) return existing
        const created = { key: label, signups: 0, customers: 0, newMrr: 0, mrr: 0 }
        rows.set(label, created)
        return created
      }
      for (const row of signups) {
        rowFor(row.key).signups += row.signups
      }
      for (const row of converted) {
        const target = rowFor(row.key)
        target.customers += row.customers
        target.newMrr += asNumber(row.newMrr)
        target.mrr += asNumber(row.mrr)
      }

      return c.json(
        {
          currency,
          by: query.by,
          touch: query.touch,
          rows: [...rows.values()].sort(
            (a, b) =>
              b.mrr - a.mrr || b.customers - a.customers || b.signups - a.signups
          ),
        },
        200
      )
    }
  )
  .get("/customers", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const matched = await siteFromRequest(
      db,
      current.workspace.id,
      c.req.param("siteId")
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const rows = await db
      .select({
        id: stripeCustomer.id,
        email: stripeCustomer.email,
        name: stripeCustomer.name,
        mrr: stripeCustomer.mrr,
        currency: stripeCustomer.currency,
        firstPaidAt: stripeCustomer.firstPaidAt,
        churnedAt: stripeCustomer.churnedAt,
        signedUpAt: visitorIdentity.signedUpAt,
        firstSource: visitorIdentity.firstSource,
        firstCampaign: visitorIdentity.firstCampaign,
        firstLanding: visitorIdentity.firstLanding,
        lastSource: visitorIdentity.lastSource,
        country: visitorIdentity.country,
      })
      .from(stripeCustomer)
      .leftJoin(
        visitorIdentity,
        eq(visitorIdentity.id, stripeCustomer.identityId)
      )
      .where(
        and(
          eq(stripeCustomer.siteId, matched.id),
          sql`${stripeCustomer.firstPaidAt} is not null`
        )
      )
      .orderBy(desc(stripeCustomer.mrr), desc(stripeCustomer.firstPaidAt))
      .limit(customerLimit)

    return c.json({ customers: rows }, 200)
  })
