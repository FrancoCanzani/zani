import { zValidator } from "@hono/zod-validator"
import { and, asc, eq, sql } from "drizzle-orm"
import { Hono } from "hono"

import { event, eventProp, site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadSite } from "./lib/load"
import { statsQuerySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"
import {
  asNumber,
  loadBreakdownRows,
  parseRange,
  pointLimit,
  propFilterConditions,
  siteWhere,
} from "./lib/stats"

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
      })
      .from(site)
      .where(eq(site.workspaceId, current.workspace.id))
      .orderBy(asc(site.name))

    return c.json({ sites: rows.map(serializeSite) }, 200)
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
      const where = siteWhere(matched.id, range, query)
      const propFilters = propFilterConditions(query)
      const joinProps =
        propFilters.length > 0 ||
        query.breakdown === "prop_key" ||
        query.breakdown === "prop_value"
      const views = sql<number>`count(distinct ${event.id})`
      const visitors = sql<number>`count(distinct ${event.visitorId})`
      const sessions = sql<number>`count(distinct ${event.sessionId})`
      const totalsWhere =
        propFilters.length > 0 ? and(where, ...propFilters) : where

      const totalsQuery = db
        .select({ views, visitors, sessions })
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
        const sessionRows = await db
          .select({
            sessionId: event.sessionId,
            views: sql<number>`count(*)`.as("views"),
          })
          .from(event)
          .where(where)
          .groupBy(event.sessionId)

        const bounceSessions = sessionRows.reduce(
          (count, row) => count + (asNumber(row.views) === 1 ? 1 : 0),
          0
        )
        bounceRate = Math.round((bounceSessions / totalSessions) * 1000) / 10
      }

      const rows = await loadBreakdownRows(db, {
        breakdown: query.breakdown,
        where,
        grain: range.grain,
        timeZone: query.tz,
        filters: query,
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
          hasEvents: seen !== undefined,
          truncated: rows.length >= pointLimit,
          points: rows.map((row) => ({
            bucket: "bucket" in row ? asNumber(row.bucket) : null,
            series: typeof row.series === "string" ? row.series : "",
            views: asNumber(row.views),
            visitors: asNumber(row.visitors),
            sessions: asNumber(row.sessions),
          })),
        },
        200
      )
    }
  )
