import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { product } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { updateProductBodySchema } from "./lib/schema"
import { serializeProduct } from "./lib/serialize"

export const updateProduct = new Hono<AppEnv>().patch(
  "/:productId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateProductBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const productId = c.req.param("productId")

    const [existing] = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.id, productId),
          eq(product.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const now = nowMs()
    await db
      .update(product)
      .set({
        name: body.name,
        description: body.description ?? null,
        unitAmountCents: body.unitAmountCents,
        currency: body.currency ?? current.workspace.defaultCurrency,
        updatedAt: now,
      })
      .where(eq(product.id, productId))

    const [row] = await db
      .select()
      .from(product)
      .where(eq(product.id, productId))
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ product: serializeProduct(row) }, 200)
  }
)
