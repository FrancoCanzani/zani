import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { loadRevenueStats } from "./lib/revenue"

export const get = new Hono<AppEnv>()
  .get("/:slug/stripe", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const [connection] = await db
      .select({
        id: stripeConnection.id,
        stripeAccountId: stripeConnection.stripeAccountId,
        livemode: stripeConnection.livemode,
        createdAt: stripeConnection.createdAt,
        updatedAt: stripeConnection.updatedAt,
      })
      .from(stripeConnection)
      .where(eq(stripeConnection.workspaceId, current.workspace.id))
      .limit(1)

    return c.json(
      {
        connected: Boolean(connection),
        connection: connection
          ? {
              id: connection.id,
              stripeAccountId: connection.stripeAccountId,
              livemode: connection.livemode,
              createdAt: connection.createdAt,
              updatedAt: connection.updatedAt,
              webhookPath: `/api/v1/stripe/webhook/${connection.id}`,
            }
          : null,
      },
      200
    )
  })
  .get("/:slug/revenue", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const [connection] = await db
      .select({ id: stripeConnection.id })
      .from(stripeConnection)
      .where(eq(stripeConnection.workspaceId, current.workspace.id))
      .limit(1)

    const stats = await loadRevenueStats(db, current.workspace.id)
    return c.json(
      {
        connected: Boolean(connection),
        ...stats,
      },
      200
    )
  })
