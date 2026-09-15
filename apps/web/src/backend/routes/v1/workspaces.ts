import { zValidator } from "@hono/zod-validator"
import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import {
  user,
  workspace,
  workspaceMember,
} from "@workspace/db/schema"

import {
  canInvite,
  createInviteBodySchema,
  createWorkspaceBodySchema,
  parseWorkspaceRole,
} from "@shared/workspace"

import { createDb } from "../../lib/db"
import { newId, nowMs } from "../../lib/id"
import { issueWorkspaceInvite } from "../../lib/invite"
import { requireSession } from "../../middleware/session"
import { requireWorkspaceMember } from "../../middleware/workspace"
import type { AppEnv } from "../../types"

export const workspaces = new Hono<AppEnv>()
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
  .post(
    "/",
    requireSession,
    zValidator("json", createWorkspaceBodySchema),
    async (c) => {
      const body = c.req.valid("json")
      const db = createDb(c.env)
      const now = nowMs()

      const [taken] = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.slug, body.slug))
        .limit(1)

      if (taken) {
        return c.json({ error: "slug_taken" as const }, 409)
      }

      const workspaceId = newId()
      const created = {
        id: workspaceId,
        name: body.name,
        slug: body.slug,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      }

      await db.insert(workspace).values(created)
      await db.insert(workspaceMember).values({
        id: newId(),
        workspaceId,
        userId: c.var.user.id,
        role: "owner",
        createdAt: now,
        updatedAt: now,
      })

      const ownerEmail = c.var.user.email.toLowerCase()
      for (const email of body.invites) {
        if (email.toLowerCase() === ownerEmail) {
          continue
        }
        await issueWorkspaceInvite(c.env, c.executionCtx, {
          workspace: created,
          email,
          role: "member",
          createdByUserId: c.var.user.id,
        })
      }

      return c.json(
        {
          workspace: {
            id: created.id,
            name: created.name,
            slug: created.slug,
            plan: created.plan,
            role: "owner" as const,
            createdAt: created.createdAt,
          },
        },
        201
      )
    }
  )
  .get("/:slug", requireSession, requireWorkspaceMember, (c) => {
    const current = workspaceFromContext(c.var)
    return c.json(
      {
        workspace: {
          id: current.workspace.id,
          name: current.workspace.name,
          slug: current.workspace.slug,
          plan: current.workspace.plan,
          role: current.membership.role,
          createdAt: current.workspace.createdAt,
        },
      },
      200
    )
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
  .post(
    "/:slug/invites",
    requireSession,
    requireWorkspaceMember,
    zValidator("json", createInviteBodySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canInvite(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const body = c.req.valid("json")
      const result = await issueWorkspaceInvite(c.env, c.executionCtx, {
        workspace: current.workspace,
        email: body.email,
        role: body.role,
        createdByUserId: c.var.user.id,
      })

      if (result.skipped === "already_member") {
        return c.json({ error: "already_member" as const }, 409)
      }

      return c.json({ ok: true as const }, 201)
    }
  )

function workspaceFromContext(vars: {
  workspace?: AppEnv["Variables"]["workspace"]
  membership?: AppEnv["Variables"]["membership"]
}) {
  if (!vars.workspace || !vars.membership) {
    throw new Error("workspace middleware did not set membership")
  }
  return { workspace: vars.workspace, membership: vars.membership }
}
