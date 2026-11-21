import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { workspace, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import { issueWorkspaceInvite } from "./lib/invite"
import {
  canInvite,
  createInviteBodySchema,
  createWorkspaceBodySchema,
  parseWorkspaceRole,
} from "./lib/schema"

export const post = new Hono<AppEnv>()
  .post(
    "/",
    requireSession,
    zValidator("json", createWorkspaceBodySchema),
    async (c) => {
      const body = c.req.valid("json")
      const db = createDb(c.env)
      const now = nowMs()
      const workspaceId = newId()

      const created = {
        id: workspaceId,
        name: body.name,
        slug: workspaceId,
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
