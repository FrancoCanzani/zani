import { eq } from "drizzle-orm"
import { Hono } from "hono"

import {
  stripeConnection,
  stripeCustomer,
  stripeSubscription,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "../workspaces/lib/schema"

export const remove = new Hono<AppEnv>().delete(
  "/:slug/stripe",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }

    const db = createDb(c.env)
    await db
      .delete(stripeSubscription)
      .where(eq(stripeSubscription.workspaceId, current.workspace.id))
    await db
      .delete(stripeCustomer)
      .where(eq(stripeCustomer.workspaceId, current.workspace.id))
    await db
      .delete(stripeConnection)
      .where(eq(stripeConnection.workspaceId, current.workspace.id))

    return c.body(null, 204)
  }
)
