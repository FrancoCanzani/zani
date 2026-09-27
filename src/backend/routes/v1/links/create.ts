import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { link } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/id"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "../workspaces/lib/context"
import { writeCachedLink } from "./lib/cache"
import { newLinkCode } from "./lib/code"
import { createLinkBodySchema } from "./schemas"

export const createLink = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", createLinkBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const now = nowMs()
    const code = await newLinkCode(db)
    const created = {
      id: newId(),
      workspaceId: current.workspace.id,
      code,
      destinationUrl: body.destinationUrl,
      name: body.name?.length ? body.name : null,
      createdByUserId: c.var.user.id,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(link).values(created)
    await writeCachedLink(c.env.KV, code, {
      id: created.id,
      workspaceId: created.workspaceId,
      destinationUrl: created.destinationUrl,
      disabled: false,
    })

    return c.json(
      {
        link: {
          id: created.id,
          code: created.code,
          name: created.name,
          destinationUrl: created.destinationUrl,
          createdAt: created.createdAt,
        },
      },
      201
    )
  }
)
