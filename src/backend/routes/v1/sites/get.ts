import { zValidator } from "@hono/zod-validator"
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  notInArray,
  notLike,
  sql,
} from "drizzle-orm"
import { Hono } from "hono"

import {
  event,
  eventProp,
  site,
  stripeCustomer,
  visitorIdentity,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import {
  convertedCondition,
  conversionsSql,
  goalKey,
  goalVisitors,
  parseGoal,
  reservedEventNames,
  type Goal,
} from "./lib/goals"
import { loadSite } from "./lib/load"
import {
  simCustomerPrefix,
  simUserPrefix,
  simVisitorPrefix,
} from "./lib/simulate"
import { statsQuerySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"
import { loadSiteSummaries } from "./lib/summary"
import {
  asNumber,
  loadBreakdownRows,
  parseRange,
  pointLimit,
  propFilterConditions,
  siteWhere,
  sourceCondition,
} from "./lib/stats"

const onlineWindowMs = 5 * 60_000
const eventGoalLimit = 50

export const get = new Hono<AppEnv>()
  .get("/", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const rows = await db
      .select({
        id: site.id,
        name: site.name,
        domain: site.domain,
        createdAt: site.createdAt,
        revokedAt: site.revokedAt,
        secretKeyHash: site.secretKeyHash,
      })
      .from(site)
      .where(eq(site.workspaceId, current.workspace.id))
      .orderBy(asc(site.name))

    return c.json({ sites: rows.map(serializeSite) }, 200)
  })
  .get("/summary", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const summaries = await loadSiteSummaries(
      createDb(c.env),
      current.workspace.id,
      Date.now()
    )
    return c.json({ sites: summaries }, 200)
  })
  .get("/:siteId/setup", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId")
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const [[firstView], [lastView], [signups], [linked]] = await Promise.all([
      db
        .select({ at: event.timestamp, path: event.path })
        .from(event)
        .where(
          and(
            eq(event.siteId, matched.id),
            notLike(event.visitorId, `${simVisitorPrefix}%`)
          )
        )
        .orderBy(asc(event.timestamp))
        .limit(1),
      db
        .select({ at: sql<number | null>`max(${event.timestamp})` })
        .from(event)
        .where(
          and(
            eq(event.siteId, matched.id),
            notLike(event.visitorId, `${simVisitorPrefix}%`)
          )
        ),
      db
        .select({
          count: sql<number>`count(*)`,
          first: sql<number | null>`min(${visitorIdentity.signedUpAt})`,
          last: sql<number | null>`max(${visitorIdentity.signedUpAt})`,
        })
        .from(visitorIdentity)
        .where(
          and(
            eq(visitorIdentity.siteId, matched.id),
            notLike(visitorIdentity.userRef, `${simUserPrefix}%`)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(stripeCustomer)
        .where(
          and(
            eq(stripeCustomer.siteId, matched.id),
            isNotNull(stripeCustomer.identityId),
            notLike(stripeCustomer.id, `${simCustomerPrefix}%`)
          )
        ),
    ])

    return c.json(
      {
        setup: {
          firstPageviewAt: firstView?.at ?? null,
          firstPageviewPath: firstView?.path ?? null,
          lastPageviewAt: lastView?.at ?? null,
          signups: asNumber(signups?.count ?? 0),
          firstIdentifyAt: signups?.first ?? null,
          lastIdentifyAt: signups?.last ?? null,
          linkedCustomers: asNumber(linked?.count ?? 0),
        },
      },
      200
    )
  })
  .get("/:siteId/online", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId")
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const [row] = await db
      .select({ online: sql<number>`count(distinct ${event.visitorId})` })
      .from(event)
      .where(
        and(
          eq(event.siteId, matched.id),
          gte(event.timestamp, Date.now() - onlineWindowMs),
          ne(event.browser, "bot")
        )
      )

    return c.json({ online: asNumber(row?.online ?? 0) }, 200)
  })
  .get(
    "/:siteId/stats",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", statsQuerySchema),
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
        c.req.param("siteId")
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const range = parsed.range
      const where = siteWhere(
        matched.id,
        range,
        query,
        query.source
          ? [await sourceCondition(db, matched.id, range, query.source)]
          : []
      )
      const propFilters = propFilterConditions(query)
      const joinProps =
        propFilters.length > 0 ||
        query.breakdown === "prop_key" ||
        query.breakdown === "prop_value"
      const views = sql<number>`count(distinct ${event.id})`
      const visitors = sql<number>`count(distinct ${event.visitorId})`
      const sessions = sql<number>`count(distinct ${event.sessionId})`
      const converted = convertedCondition(
        db,
        matched.id,
        range,
        parseGoal(query.goal)
      )
      const conversions = conversionsSql(converted)
      const totalsWhere =
        propFilters.length > 0 ? and(where, ...propFilters) : where

      const totalsQuery = db
        .select({ views, visitors, sessions, conversions })
        .from(event)
      const totalsPromise = joinProps
        ? totalsQuery
            .innerJoin(eventProp, eq(eventProp.eventId, event.id))
            .where(totalsWhere)
        : totalsQuery.where(where)

      const [[totals], [seen]] = await Promise.all([
        totalsPromise,
        db
          .select({ id: event.id })
          .from(event)
          .where(eq(event.siteId, matched.id))
          .limit(1),
      ])

      const totalViews = asNumber(totals?.views)
      const totalSessions = asNumber(totals?.sessions)
      const viewsPerVisit =
        totalSessions === 0
          ? 0
          : Math.round((totalViews / totalSessions) * 100) / 100

      let bounceRate = 0
      if (query.event === undefined && !joinProps && totalSessions > 0) {
        const bounced = db
          .select({ sessionId: event.sessionId })
          .from(event)
          .where(where)
          .groupBy(event.sessionId)
          .having(sql`count(*) = 1`)
          .as("bounced")
        const [row] = await db
          .select({ count: sql<number>`count(*)` })
          .from(bounced)
        bounceRate =
          Math.round((asNumber(row?.count) / totalSessions) * 1000) / 10
      }

      const rows = await loadBreakdownRows(db, {
        breakdown: query.breakdown,
        where,
        grain: range.grain,
        timeZone: query.tz,
        filters: query,
        converted,
      })

      return c.json(
        {
          site: {
            id: matched.id,
            name: matched.name,
            domain: matched.domain,
            revokedAt: matched.revokedAt,
          },
          views: totalViews,
          visitors: asNumber(totals?.visitors),
          sessions: totalSessions,
          bounceRate,
          viewsPerVisit,
          conversions: asNumber(totals?.conversions),
          hasEvents: seen !== undefined,
          truncated: rows.length >= pointLimit,
          points: rows.map((row) => ({
            bucket: "bucket" in row ? asNumber(row.bucket) : null,
            series: typeof row.series === "string" ? row.series : "",
            views: asNumber(row.views),
            visitors: asNumber(row.visitors),
            sessions: asNumber(row.sessions),
            conversions: asNumber(row.conversions),
          })),
        },
        200
      )
    }
  )
  .get(
    "/:siteId/goals",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", statsQuerySchema),
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
        c.req.param("siteId")
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const range = parsed.range
      const where = siteWhere(
        matched.id,
        range,
        { ...query, breakdown: undefined },
        query.source
          ? [await sourceCondition(db, matched.id, range, query.source)]
          : []
      )
      const propFilters = propFilterConditions(query)
      const audienceQuery = db
        .select({ visitorId: event.visitorId })
        .from(event)
      const audience =
        propFilters.length > 0
          ? audienceQuery
              .innerJoin(eventProp, eq(eventProp.eventId, event.id))
              .where(and(where, ...propFilters))
          : audienceQuery.where(where)
      const audienceRows = audience.as("audience")
      const audienceSize = db
        .select({ visitors: countDistinct(audienceRows.visitorId) })
        .from(audienceRows)

      const reached = (goal: Goal) => {
        const matches = goalVisitors(db, matched.id, range, goal).as("reached")
        return db
          .select({ conversions: countDistinct(matches.visitorId) })
          .from(matches)
          .where(inArray(matches.visitorId, audience))
      }

      const [[totals], eventGoals, [signups], [paid]] = await Promise.all([
        audienceSize,
        db
          .select({
            name: event.name,
            conversions: countDistinct(event.visitorId),
            completions: count(),
          })
          .from(event)
          .where(
            and(
              eq(event.siteId, matched.id),
              gte(event.timestamp, range.start),
              lt(event.timestamp, range.end),
              notInArray(event.name, reservedEventNames),
              inArray(event.visitorId, audience)
            )
          )
          .groupBy(event.name)
          .orderBy(desc(countDistinct(event.visitorId)))
          .limit(eventGoalLimit),
        reached({ kind: "signup" }),
        reached({ kind: "paid" }),
      ])

      const automatic: Array<{ goal: Goal; conversions: number }> = [
        { goal: { kind: "signup" }, conversions: asNumber(signups?.conversions) },
        { goal: { kind: "paid" }, conversions: asNumber(paid?.conversions) },
      ]

      return c.json(
        {
          visitors: asNumber(totals?.visitors),
          goals: [
            ...automatic.map((row) => ({
              key: goalKey(row.goal),
              kind: row.goal.kind,
              name: row.goal.kind,
              conversions: row.conversions,
              completions: row.conversions,
            })),
            ...eventGoals.map((row) => ({
              key: goalKey({ kind: "event", name: row.name }),
              kind: "event" as const,
              name: row.name,
              conversions: asNumber(row.conversions),
              completions: asNumber(row.completions),
            })),
          ],
        },
        200
      )
    }
  )
