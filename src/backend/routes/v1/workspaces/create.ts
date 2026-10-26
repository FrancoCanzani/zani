import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { workspace, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import type { AppEnv } from "../../../types"

import { createWorkspaceBodySchema } from "./lib/schema"

export const createWorkspace = new Hono<AppEnv>().post(
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
