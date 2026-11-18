import { zValidator } from "@hono/zod-validator"
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm"
import { Hono } from "hono"

import { event } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadSite } from "./lib/load"
import { statsQuerySchema, type Breakdown } from "./lib/schema"
import {
  asNumber,
  bucketSql,
  filterConditions,
  parseRange,
  seriesColumn,
} from "./lib/stats"

const pointLimit = 500

export const siteStats = new Hono<AppEnv>().get(
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
    const where = and(
      eq(event.siteId, matched.id),
      gte(event.timestamp, range.start),
      lt(event.timestamp, range.end),
      ...filterConditions(query)
    )
    const views = sql<number>`count(*)`
    const visitors = sql<number>`count(distinct ${event.visitorId})`
    const sessions = sql<number>`count(distinct ${event.sessionId})`

    const [totals] = await db
      .select({ views, visitors, sessions })
      .from(event)
      .where(where)

    const totalViews = asNumber(totals?.views)
    const totalSessions = asNumber(totals?.sessions)

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
    const bounceRate =
      totalSessions === 0
        ? 0
        : Math.round((bounceSessions / totalSessions) * 1000) / 10
    const viewsPerVisit =
      totalSessions === 0
        ? 0
        : Math.round((totalViews / totalSessions) * 100) / 100

    const rows = await loadBreakdownRows(db, {
      breakdown: query.breakdown,
      where,
      grain: range.grain,
      timeZone: query.tz,
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

async function loadBreakdownRows(
  db: ReturnType<typeof createDb>,
  input: {
    breakdown: Breakdown | undefined
    where: ReturnType<typeof and>
    grain: "hour" | "day"
    timeZone?: string
  }
) {
  const { breakdown, where, grain, timeZone } = input
  const views = sql<number>`count(*)`
  const visitors = sql<number>`count(distinct ${event.visitorId})`
  const sessions = sql<number>`count(distinct ${event.sessionId})`

  if (breakdown === "entry" || breakdown === "exit") {
    const edgeExpr =
      breakdown === "entry"
        ? sql<number>`min(${event.timestamp})`
        : sql<number>`max(${event.timestamp})`
    const edges = await db
      .select({
        sessionId: event.sessionId,
        edgeAt: edgeExpr.as("edge_at"),
      })
      .from(event)
      .where(where)
      .groupBy(event.sessionId)

    if (edges.length === 0) return []

    const bySession = new Map(
      edges.map((row) => [row.sessionId, asNumber(row.edgeAt)])
    )
    const pageviews = await db
      .select({
        sessionId: event.sessionId,
        path: event.path,
        timestamp: event.timestamp,
        visitorId: event.visitorId,
      })
      .from(event)
      .where(where)

    const counts = new Map<
      string,
      { views: number; visitors: Set<string>; sessions: Set<string> }
    >()
    for (const row of pageviews) {
      const edgeAt = bySession.get(row.sessionId)
      if (edgeAt === undefined || row.timestamp !== edgeAt) continue
      const current = counts.get(row.path) ?? {
        views: 0,
        visitors: new Set<string>(),
        sessions: new Set<string>(),
      }
      current.views += 1
      current.visitors.add(row.visitorId)
      current.sessions.add(row.sessionId)
      counts.set(row.path, current)
    }

    return [...counts.entries()]
      .map(([series, value]) => ({
        series,
        views: value.views,
        visitors: value.visitors.size,
        sessions: value.sessions.size,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, pointLimit)
  }

  const column = seriesColumn(breakdown)
  const series = column ? sql<string>`${column}` : sql<string>`''`
  const bucket = bucketSql(grain, timeZone)

  if (breakdown) {
    return db
      .select({ series, views, visitors, sessions })
      .from(event)
      .where(where)
      .groupBy(series)
      .orderBy(desc(views))
      .limit(pointLimit)
  }

  return db
    .select({ bucket, series, views, visitors, sessions })
    .from(event)
    .where(where)
    .groupBy(bucket, series)
    .orderBy(asc(bucket))
    .limit(pointLimit)
}
