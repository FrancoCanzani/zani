import { zValidator } from "@hono/zod-validator"
import { and, asc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { funnel } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { parseRange } from "../sites/lib/stats"
import { workspaceFromContext } from "../workspaces/lib/context"

import { funnelResults } from "./lib/results"
import { funnelResultsQuerySchema, parseSteps } from "./lib/schema"
import { serializeFunnel } from "./lib/serialize"

export const get = new Hono<AppEnv>()
  .get("/", requireSession, requireWorkspaceMember, async (c) => {
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
      .select()
      .from(funnel)
      .where(eq(funnel.siteId, matched.id))
      .orderBy(asc(funnel.createdAt))

    return c.json({ funnels: rows.map(serializeFunnel) }, 200)
  })
  .get(
    "/:funnelId/results",
    requireSession,
    requireWorkspaceMember,
    zValidator("query", funnelResultsQuerySchema),
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

      const [row] = await db
        .select()
        .from(funnel)
        .where(
          and(
            eq(funnel.siteId, matched.id),
            eq(funnel.id, c.req.param("funnelId"))
          )
        )
        .limit(1)
      if (!row) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const steps = await funnelResults(db, {
        siteId: matched.id,
        range: parsed.range,
        steps: parseSteps(row.steps),
        query,
      })

      return c.json({ funnel: serializeFunnel(row), steps }, 200)
    }
  )
