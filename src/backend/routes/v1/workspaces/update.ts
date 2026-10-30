import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { workspace } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "./lib/context"
import {
  canManageBusiness,
  parseWorkspaceRole,
  updateWorkspaceBodySchema,
} from "./lib/schema"
import { serializeWorkspace } from "./lib/serialize"

export const updateWorkspace = new Hono<AppEnv>().patch(
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

    const patch: {
      name?: string
      email?: string | null
      phone?: string | null
      address?: string | null
      taxId?: string | null
      detailsSkippedAt?: number | null
      updatedAt: number
    } = { updatedAt }

    if (body.name !== undefined) {
      patch.name = body.name
    }
    if (body.email !== undefined) {
      patch.email = body.email
    }
    if (body.phone !== undefined) {
      patch.phone = body.phone
    }
    if (body.address !== undefined) {
      patch.address = body.address
    }
    if (body.taxId !== undefined) {
      patch.taxId = body.taxId
    }
    if (body.skipDetails === true) {
      patch.detailsSkippedAt = updatedAt
    }
    if (
      body.email !== undefined ||
      body.phone !== undefined ||
      body.address !== undefined ||
      body.taxId !== undefined
    ) {
      const nextEmail =
        body.email !== undefined ? body.email : current.workspace.email
      const nextPhone =
        body.phone !== undefined ? body.phone : current.workspace.phone
      const nextAddress =
        body.address !== undefined ? body.address : current.workspace.address
      if (nextEmail?.trim() || nextPhone?.trim() || nextAddress?.trim()) {
        patch.detailsSkippedAt = null
      }
    }

    await db
      .update(workspace)
      .set(patch)
      .where(eq(workspace.id, current.workspace.id))

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
