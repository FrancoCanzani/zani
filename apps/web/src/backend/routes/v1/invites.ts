import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import {
  workspace,
  workspaceInvite,
  workspaceMember,
} from "@workspace/db/schema"

import { createDb } from "../../lib/db"
import { newId, nowMs } from "../../lib/id"
import { sha256Hex } from "../../lib/token"
import { requireSession } from "../../middleware/session"
import type { AppEnv } from "../../types"

export const invites = new Hono<AppEnv>().post(
  "/:token/accept",
  requireSession,
  async (c) => {
    const token = c.req.param("token")
    if (!token) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const db = createDb(c.env)
    const tokenHash = await sha256Hex(token)
    const [invite] = await db
      .select({
        invite: workspaceInvite,
        workspace,
      })
      .from(workspaceInvite)
      .innerJoin(workspace, eq(workspaceInvite.workspaceId, workspace.id))
      .where(eq(workspaceInvite.tokenHash, tokenHash))
      .limit(1)

    if (!invite) {
      return c.json({ error: "not_found" as const }, 404)
    }

    if (invite.invite.expiresAt < nowMs()) {
      await db
        .delete(workspaceInvite)
        .where(eq(workspaceInvite.id, invite.invite.id))
      return c.json({ error: "expired" as const }, 410)
    }

    if (
      invite.invite.email.toLowerCase() !== c.var.user.email.toLowerCase()
    ) {
      return c.json({ error: "email_mismatch" as const }, 403)
    }

    const [existing] = await db
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, invite.workspace.id),
          eq(workspaceMember.userId, c.var.user.id)
        )
      )
      .limit(1)

    if (!existing) {
      const now = nowMs()
      await db.insert(workspaceMember).values({
        id: newId(),
        workspaceId: invite.workspace.id,
        userId: c.var.user.id,
        role: invite.invite.role,
        createdAt: now,
        updatedAt: now,
      })
    }

    await db
      .delete(workspaceInvite)
      .where(eq(workspaceInvite.id, invite.invite.id))

    return c.json(
      {
        workspace: {
          id: invite.workspace.id,
          name: invite.workspace.name,
          slug: invite.workspace.slug,
        },
      },
      200
    )
  }
)
