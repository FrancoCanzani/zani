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
