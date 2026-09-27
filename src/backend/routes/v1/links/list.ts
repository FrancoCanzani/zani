import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { link } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "../workspaces/lib/context"

export const listLinks = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const links = await db
      .select({
        id: link.id,
        code: link.code,
        name: link.name,
        destinationUrl: link.destinationUrl,
        createdAt: link.createdAt,
      })
      .from(link)
      .where(eq(link.workspaceId, current.workspace.id))
      .orderBy(desc(link.createdAt))

    return c.json({ links }, 200)
  }
)
