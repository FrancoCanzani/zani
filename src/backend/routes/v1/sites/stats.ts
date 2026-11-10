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
import { statsQuerySchema } from "./lib/schema"
import { asNumber, bucketSql, parseRange, seriesColumn } from "./lib/stats"

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
      lt(event.timestamp, range.end)
    )
    const bucket = bucketSql(range.grain)
    const column = seriesColumn(query.breakdown)
    const series = column ? sql<string>`${column}` : sql<string>`''`

    const [totals] = await db
      .select({
        views: sql<number>`count(*)`,
        sessions: sql<number>`count(distinct ${event.sessionId})`,
      })
      .from(event)
      .where(where)

    const rows = await db
      .select({
        bucket,
        series,
        views: sql<number>`count(*)`,
        sessions: sql<number>`count(distinct ${event.sessionId})`,
      })
      .from(event)
      .where(where)
      .groupBy(bucket, series)
      .orderBy(asc(bucket), desc(sql`count(*)`))
      .limit(pointLimit)

    return c.json(
      {
        views: asNumber(totals?.views),
        sessions: asNumber(totals?.sessions),
        truncated: rows.length >= pointLimit,
        points: rows.map((row) => ({
          bucket: asNumber(row.bucket),
          series: typeof row.series === "string" ? row.series : "",
          views: asNumber(row.views),
          sessions: asNumber(row.sessions),
        })),
      },
      200
    )
  }
)
