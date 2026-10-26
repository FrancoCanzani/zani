import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { estimate } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

export const removeEstimate = new Hono<AppEnv>().delete(
  "/:estimateId",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const estimateId = c.req.param("estimateId")

    const [existing] = await db
      .select({ id: estimate.id, status: estimate.status })
      .from(estimate)
      .where(
        and(
          eq(estimate.id, estimateId),
          eq(estimate.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }

    if (existing.status !== "draft") {
      return c.json({ error: "not_draft" as const }, 409)
    }

    await db.delete(estimate).where(eq(estimate.id, estimateId))

    return c.json({ ok: true as const }, 200)
  }
)
