import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { product } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeProduct } from "./lib/serialize"

export const archiveProduct = new Hono<AppEnv>().post(
  "/:productId/archive",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const productId = c.req.param("productId")

    const [existing] = await db
      .select({ id: product.id, archivedAt: product.archivedAt })
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

    if (existing.archivedAt) {
      return c.json({ error: "already_archived" as const }, 409)
    }

    const now = nowMs()
    await db
      .update(product)
      .set({
        archivedAt: now,
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
