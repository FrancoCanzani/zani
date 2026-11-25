import { Hono } from "hono"

import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadConnection, serializeConnection } from "./lib/connection"

export const get = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
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
    const row = await loadConnection(db, matched.id)
    return c.json(
      { stripe: await serializeConnection(db, matched.id, row) },
      200
    )
  }
)
