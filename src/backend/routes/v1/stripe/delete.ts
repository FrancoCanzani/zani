import { eq } from "drizzle-orm"
import { Hono } from "hono"

import {
  mrrSnapshot,
  revenueMovement,
  stripeConnection,
  stripeCustomer,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

export const remove = new Hono<AppEnv>().delete(
  "/",
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

    // Revenue data is derived from the connected account; keeping it would mix accounts on reconnect.
    await db.batch([
      db
        .delete(stripeConnection)
        .where(eq(stripeConnection.siteId, matched.id)),
      db.delete(revenueMovement).where(eq(revenueMovement.siteId, matched.id)),
      db.delete(mrrSnapshot).where(eq(mrrSnapshot.siteId, matched.id)),
      db.delete(stripeCustomer).where(eq(stripeCustomer.siteId, matched.id)),
    ])

    return c.json({ stripe: { connected: false as const } }, 200)
  }
)
