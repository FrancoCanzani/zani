import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import {
  user,
  workspace,
  workspaceInvite,
  workspaceMember,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import { canInvite, parseWorkspaceRole } from "./lib/schema"
import { serializeWorkspace } from "./lib/serialize"

export const get = new Hono<AppEnv>()
  .get("/", requireSession, async (c) => {
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
  })
  .get("/:slug/members", requireSession, requireWorkspaceMember, async (c) => {
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
  })
  .get("/:slug/invites", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canInvite(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }

    const db = createDb(c.env)
    const invites = await db
      .select({
        id: workspaceInvite.id,
        email: workspaceInvite.email,
        role: workspaceInvite.role,
        expiresAt: workspaceInvite.expiresAt,
      })
      .from(workspaceInvite)
      .where(eq(workspaceInvite.workspaceId, current.workspace.id))
      .orderBy(desc(workspaceInvite.createdAt))

    return c.json({ invites }, 200)
  })
  .get("/:slug", requireSession, requireWorkspaceMember, (c) => {
    const current = workspaceFromContext(c.var)
    return c.json(
      {
        workspace: serializeWorkspace(
          current.workspace,
          current.membership.role
        ),
      },
      200
    )
  })
