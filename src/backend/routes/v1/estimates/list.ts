import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { estimate } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeEstimateSummary } from "./lib/serialize"

export const listEstimates = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const rows = await db
      .select()
      .from(estimate)
      .where(eq(estimate.workspaceId, current.workspace.id))
      .orderBy(desc(estimate.updatedAt))

    return c.json(
      {
        estimates: rows.map(serializeEstimateSummary),
      },
      200
    )
  }
)
