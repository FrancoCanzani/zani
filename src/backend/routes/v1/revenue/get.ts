import { zValidator } from "@hono/zod-validator"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  lt,
  sql,
  type SQL,
} from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"
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
import {
  asNumber,
  bucketSize,
  bucketSql,
  parseRange,
  type StatsRange,
} from "../sites/lib/stats"
import { workspaceFromContext } from "../workspaces/lib/context"

import { identityColumnFor, identityFilters } from "./lib/filters"
import { bucketer, primaryCurrency, summarize } from "./lib/overview"
import {
  attributionQuerySchema,
  revenueBreakdownQuerySchema,
  revenueQuerySchema,
  type AttributionDimension,
  type Touch,
} from "./lib/schema"

type Database = ReturnType<typeof createDb>

const unidentified = "(not identified)"
const customerLimit = 50

function attributionColumn(by: AttributionDimension, touch: Touch) {
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
      .select({ currency: revenueMovement.currency })
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

function signupConditions(siteId: string, range: StatsRange, filters: SQL[]) {
  return and(
    eq(visitorIdentity.siteId, siteId),
    gte(visitorIdentity.signedUpAt, range.start),
    lt(visitorIdentity.signedUpAt, range.end),
    ...filters
  )
}

function newCustomerRows(
  db: Database,
  input: {
    siteId: string
    currency: string
    range: StatsRange
    filters: SQL[]
    key: SQLiteColumn
  }
) {
  return db
    .select({
      key: input.key,
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
        eq(revenueMovement.siteId, input.siteId),
        eq(revenueMovement.kind, "new"),
        eq(revenueMovement.currency, input.currency),
        gte(revenueMovement.at, input.range.start),
        lt(revenueMovement.at, input.range.end),
        ...input.filters
      )
    )
    .groupBy(input.key)
}

export const get = new Hono<AppEnv>()
  .get(
    "/",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", revenueQuerySchema),
    async (c) => {
      const query = c.req.valid("query")
      const parsed = parseRange(query)
      if (!parsed.ok) {
        return c.json(
          { error: "invalid_range" as const, message: parsed.message },
          400
        )
      }
      const range = parsed.range
      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId") ?? ""
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const { conditions: filters, ignored } = identityFilters(query)
      const [{ currency, otherCurrencies }, [connection], [anyMovement]] =
        await Promise.all([
          currencyFor(db, matched.id),
          db
            .select({ siteId: stripeConnection.siteId })
            .from(stripeConnection)
            .where(eq(stripeConnection.siteId, matched.id))
            .limit(1),
          db
            .select({ id: revenueMovement.id })
            .from(revenueMovement)
            .where(eq(revenueMovement.siteId, matched.id))
            .limit(1),
        ])

      const movementQuery = db
        .select({
          customerId: revenueMovement.customerId,
          kind: revenueMovement.kind,
          amount: revenueMovement.amount,
          currency: revenueMovement.currency,
          at: revenueMovement.at,
        })
        .from(revenueMovement)
      const movementWhere = and(
        eq(revenueMovement.siteId, matched.id),
        eq(revenueMovement.currency, currency),
        lt(revenueMovement.at, range.end)
      )
      const bucket = bucketSql(
        range.grain,
        query.tz,
        visitorIdentity.signedUpAt
      )

      const [movements, signups, [identified]] = await Promise.all([
        filters.length === 0
          ? movementQuery.where(movementWhere).orderBy(asc(revenueMovement.at))
          : movementQuery
              .innerJoin(
                stripeCustomer,
                and(
                  eq(stripeCustomer.siteId, revenueMovement.siteId),
                  eq(stripeCustomer.id, revenueMovement.customerId)
                )
              )
              .innerJoin(
                visitorIdentity,
                eq(visitorIdentity.id, stripeCustomer.identityId)
              )
              .where(and(movementWhere, ...filters))
              .orderBy(asc(revenueMovement.at)),
        db
          .select({ bucket, signups: count() })
          .from(visitorIdentity)
          .where(signupConditions(matched.id, range, filters))
          .groupBy(bucket),
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

      const summary = summarize({
        movements,
        signups: signups.map((row) => ({
          bucket: asNumber(row.bucket),
          signups: row.signups,
        })),
        start: range.start,
        end: range.end,
        bucketOf: bucketer(range.grain, query.tz),
        size: bucketSize(range.grain),
      })

      return c.json(
        {
          connected: connection !== undefined,
          hasData: anyMovement !== undefined,
          currency,
          otherCurrencies,
          identifiedCustomers:
            filters.length > 0
              ? summary.payingCustomers
              : (identified?.value ?? 0),
          ignoredFilters: ignored,
          ...summary,
        },
        200
      )
    }
  )
  .get(
    "/breakdown",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", revenueBreakdownQuerySchema),
    async (c) => {
      const query = c.req.valid("query")
      const parsed = parseRange(query)
      if (!parsed.ok) {
        return c.json(
          { error: "invalid_range" as const, message: parsed.message },
          400
        )
      }
      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId") ?? ""
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const key = identityColumnFor(query.by)
      const { currency } = await currencyFor(db, matched.id)
      if (!key) {
        return c.json({ currency, supported: false, rows: [] }, 200)
      }

      const { conditions: filters } = identityFilters(query)
      const [signups, converted] = await Promise.all([
        db
          .select({ key, signups: count() })
          .from(visitorIdentity)
          .where(signupConditions(matched.id, parsed.range, filters))
          .groupBy(key),
        newCustomerRows(db, {
          siteId: matched.id,
          currency,
          range: parsed.range,
          filters,
          key,
        }),
      ])

      const rows = new Map<
        string,
        { key: string; signups: number; customers: number; newMrr: number }
      >()
      const rowFor = (value: unknown) => {
        const label = typeof value === "string" ? value : String(value ?? "")
        const existing = rows.get(label)
        if (existing) return existing
        const created = { key: label, signups: 0, customers: 0, newMrr: 0 }
        rows.set(label, created)
        return created
      }
      for (const row of signups) rowFor(row.key).signups += row.signups
      for (const row of converted) {
        if (row.key === null) continue
        const target = rowFor(row.key)
        target.customers += row.customers
        target.newMrr += asNumber(row.newMrr)
      }

      return c.json(
        { currency, supported: true, rows: [...rows.values()] },
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
      const query = c.req.valid("query")
      const parsed = parseRange(query)
      if (!parsed.ok) {
        return c.json(
          { error: "invalid_range" as const, message: parsed.message },
          400
        )
      }
      const current = workspaceFromContext(c.var)
      const db = createDb(c.env)
      const matched = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId") ?? ""
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const { currency } = await currencyFor(db, matched.id)
      const key = attributionColumn(query.by, query.touch)
      const { conditions: filters } = identityFilters(query)

      const [signups, converted] = await Promise.all([
        db
          .select({ key, signups: count() })
          .from(visitorIdentity)
          .where(signupConditions(matched.id, parsed.range, filters))
          .groupBy(key),
        newCustomerRows(db, {
          siteId: matched.id,
          currency,
          range: parsed.range,
          filters,
          key,
        }),
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
        const created = {
          key: label,
          signups: 0,
          customers: 0,
          newMrr: 0,
          mrr: 0,
        }
        rows.set(label, created)
        return created
      }
      for (const row of signups) rowFor(row.key).signups += row.signups
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
              b.newMrr - a.newMrr ||
              b.customers - a.customers ||
              b.signups - a.signups
          ),
        },
        200
      )
    }
  )
  .get("/customers", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId") ?? ""
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
