import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { parseRange } from "../sites/lib/stats"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadActivity } from "./lib/feed"
import { activityQuerySchema } from "./lib/schema"

export const get = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("query", activityQuerySchema),
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

    return c.json(
      { activity: await loadActivity(db, matched.id, parsed.range, query) },
      200
    )
  }
)
