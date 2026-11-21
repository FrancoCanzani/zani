import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { user, workspace, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import {
  canManageBusiness,
  canSetMemberRole,
  parseWorkspaceRole,
  updateMemberBodySchema,
  updateWorkspaceBodySchema,
} from "./lib/schema"
import { serializeWorkspace } from "./lib/serialize"

export const patch = new Hono<AppEnv>()
  .patch(
    "/:slug",
    requireSession,
    requireWorkspaceMember,
    zValidator("json", updateWorkspaceBodySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const body = c.req.valid("json")
      const db = createDb(c.env)
      const updatedAt = nowMs()

      if (body.name !== undefined) {
        await db
          .update(workspace)
          .set({ name: body.name, updatedAt })
          .where(eq(workspace.id, current.workspace.id))
      }

      const [row] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.id, current.workspace.id))
        .limit(1)

      if (!row) {
        return c.json({ error: "not_found" as const }, 404)
      }

      return c.json(
        {
          workspace: serializeWorkspace(row, current.membership.role),
        },
        200
      )
    }
  )
  .patch(
    "/:slug/members/:memberId",
    requireSession,
    requireWorkspaceMember,
    zValidator("json", updateMemberBodySchema),
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
          email: user.email,
          name: user.name,
        })
        .from(workspaceMember)
        .innerJoin(user, eq(workspaceMember.userId, user.id))
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
      if (!target || !canSetMemberRole(actor, target)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const body = c.req.valid("json")
      const updatedAt = nowMs()
      await db
        .update(workspaceMember)
        .set({ role: body.role, updatedAt })
        .where(eq(workspaceMember.id, existing.id))

      return c.json(
        {
          member: {
            id: existing.id,
            role: body.role,
            email: existing.email,
            name: existing.name,
          },
        },
        200
      )
    }
  )
