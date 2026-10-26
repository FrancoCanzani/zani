import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { estimate } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeEstimate } from "./lib/serialize"

export const getEstimate = new Hono<AppEnv>().get(
  "/:estimateId",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const [row] = await db
      .select()
      .from(estimate)
      .where(
        and(
          eq(estimate.id, c.req.param("estimateId")),
          eq(estimate.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ estimate: serializeEstimate(row) }, 200)
  }
)
