import { and, eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { workspace, workspaceMember } from "@workspace/db/schema"

import { createDb } from "../lib/db"
import type { AppEnv } from "../types"

export const requireWorkspaceMember: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
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
      and(eq(workspace.slug, slug), eq(workspaceMember.userId, c.var.user.id))
    )
    .limit(1)

  if (!membership) {
    return c.json({ error: "not_found" as const }, 404)
  }

  c.set("workspace", membership.workspace)
  c.set("membership", membership.membership)
  await next()
}
