import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import { issueWorkspaceInvite } from "./lib/invite"
import {
  canInvite,
  createInviteBodySchema,
  parseWorkspaceRole,
} from "./lib/schema"

export const createInvite = new Hono<AppEnv>().post(
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
