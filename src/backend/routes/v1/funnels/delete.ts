import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { funnel } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

export const remove = new Hono<AppEnv>().delete(
  "/:funnelId",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId") ?? ""
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const [removed] = await db
      .delete(funnel)
      .where(
        and(
          eq(funnel.siteId, matched.id),
          eq(funnel.id, c.req.param("funnelId"))
        )
      )
      .returning({ id: funnel.id })
    if (!removed) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ removed: removed.id }, 200)
  }
)
