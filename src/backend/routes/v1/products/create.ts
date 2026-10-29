import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"

import { product } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { createProductBodySchema } from "./lib/schema"
import { serializeProduct } from "./lib/serialize"

export const createProduct = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", createProductBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const now = nowMs()

    const created = {
      id: newId(),
      workspaceId: current.workspace.id,
      name: body.name,
      description: body.description ?? null,
      unitAmountCents: body.unitAmountCents,
      currency: body.currency ?? current.workspace.defaultCurrency,
      archivedAt: null as number | null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(product).values(created)

    return c.json({ product: serializeProduct(created) }, 201)
  }
)
