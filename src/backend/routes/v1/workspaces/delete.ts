import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { workspaceInvite, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import { canInvite, canRemoveMember, parseWorkspaceRole } from "./lib/schema"

export const remove = new Hono<AppEnv>()
  .delete(
    "/:slug/invites/:inviteId",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canInvite(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const [invite] = await db
        .select({ id: workspaceInvite.id })
        .from(workspaceInvite)
        .where(
          and(
            eq(workspaceInvite.id, c.req.param("inviteId")),
            eq(workspaceInvite.workspaceId, current.workspace.id)
          )
        )
        .limit(1)

      if (!invite) {
        return c.json({ error: "not_found" as const }, 404)
      }

      await db.delete(workspaceInvite).where(eq(workspaceInvite.id, invite.id))
      return c.json({ ok: true as const }, 200)
    }
  )
  .delete(
    "/:slug/members/:memberId",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      const current = workspaceFromContext(c.var)
      const actor = parseWorkspaceRole(current.membership.role)
      if (!actor) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const [existing] = await db
        .select({
          id: workspaceMember.id,
          role: workspaceMember.role,
          userId: workspaceMember.userId,
        })
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.id, c.req.param("memberId")),
            eq(workspaceMember.workspaceId, current.workspace.id)
          )
        )
        .limit(1)

      if (!existing) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const target = parseWorkspaceRole(existing.role)
      if (!target) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const owners = await db
        .select({ id: workspaceMember.id })
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, current.workspace.id),
            eq(workspaceMember.role, "owner")
          )
        )

      const isSelf = existing.userId === c.var.user.id
      if (!canRemoveMember(actor, target, isSelf, owners.length)) {
        if (isSelf && target === "owner") {
          return c.json({ error: "last_owner" as const }, 409)
        }
        return c.json({ error: "forbidden" as const }, 403)
      }

      await db
        .delete(workspaceMember)
        .where(eq(workspaceMember.id, existing.id))
      return c.json({ ok: true as const }, 200)
    }
  )
