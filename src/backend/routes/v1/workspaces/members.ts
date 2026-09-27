import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { user, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"

export const listMembers = new Hono<AppEnv>().get(
  "/:slug/members",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const members = await db
      .select({
        id: workspaceMember.id,
        role: workspaceMember.role,
        email: user.email,
        name: user.name,
      })
      .from(workspaceMember)
      .innerJoin(user, eq(workspaceMember.userId, user.id))
      .where(eq(workspaceMember.workspaceId, current.workspace.id))
      .orderBy(desc(workspaceMember.createdAt))

    return c.json({ members }, 200)
  }
)
