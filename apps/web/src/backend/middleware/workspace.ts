import { and, eq } from "drizzle-orm"
import { workspace, workspaceMember } from "@workspace/db/schema"

import { factory } from "../factory"
import { createDb } from "../lib/db"

export const requireWorkspaceMember = factory.createMiddleware(
  async (c, next) => {
    const slug = c.req.param("slug")
    if (!slug) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const db = createDb(c.env)
    const [membership] = await db
      .select({
        membership: workspaceMember,
        workspace,
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(
        and(
          eq(workspace.slug, slug),
          eq(workspaceMember.userId, c.var.user.id)
        )
      )
      .limit(1)

    if (!membership) {
      return c.json({ error: "not_found" as const }, 404)
    }

    c.set("workspace", membership.workspace)
    c.set("membership", membership.membership)
    await next()
  }
)
