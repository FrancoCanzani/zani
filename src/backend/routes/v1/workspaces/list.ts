import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { workspace, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import type { AppEnv } from "../../../types"

export const listWorkspaces = new Hono<AppEnv>().get(
  "/",
  requireSession,
  async (c) => {
    const db = createDb(c.env)
    const rows = await db
      .select({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        role: workspaceMember.role,
        createdAt: workspace.createdAt,
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, c.var.user.id))
      .orderBy(desc(workspace.createdAt))

    return c.json({ workspaces: rows }, 200)
  }
)
